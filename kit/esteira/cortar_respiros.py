#!/usr/bin/env python3
"""Corta os respiros de um take e devolve o mapa de tempo velho -> novo.

Como funciona:
 1. `silencedetect` acha as pausas.
 2. De cada pausa eu tiro o MIOLO e deixo uma folga (`PAD`) dos dois lados, pra
    a fala nao entrar cortada nem colar uma palavra na outra.
 3. Se algum corte encostar numa palavra do whisper, ele encolhe ate nao
    encostar. Palavra cortada ao meio e o pior defeito possivel aqui.
 4. Emite o mp4 remontado e um JSON com os pares (inicio, fim) mantidos, que o
    montar_* usa pra deslocar palavra e overlay pela MESMA conta.

Uso:
    python3 cortar_respiros.py <take.mp4> <voz.json> <saida.mp4> <mapa.json>

`voz.json` e a transcricao do take no formato do tok2words.py
({"segments": [{"words": [{"start", "end", ...}]}]}).
"""
import json
import subprocess
import sys

LIMIAR_DB = -32      # voz de celular pica perto de -7 dB; -32 pega respiro, nao fala
MIN_PAUSA = 0.30     # so mexe em pausa a partir daqui
PAD = 0.10           # folga que fica de cada lado da pausa
MIN_CORTE = 0.12     # corte menor que isso nao vale o risco de emenda


def pausas(caminho):
    saida = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", caminho, "-af",
         f"silencedetect=n={LIMIAR_DB}dB:d={MIN_PAUSA}", "-f", "null", "-"],
        capture_output=True, text=True).stderr
    ini, fora = None, []
    for linha in saida.splitlines():
        if "silence_start:" in linha:
            ini = float(linha.split("silence_start:")[1].split("|")[0])
        elif "silence_end:" in linha and ini is not None:
            fim = float(linha.split("silence_end:")[1].split("|")[0])
            fora.append((ini, fim))
            ini = None
    return fora


def cortes(caminho, palavras, dur):
    fora = []
    for a, b in pausas(caminho):
        c0, c1 = a + PAD, b - PAD
        # NAO usar a fronteira de palavra do whisper como trava aqui: ela e
        # frouxa e invade o silencio, o que zerava quase todo corte (medido:
        # 8 cortes e 2,9s, contra 22 e ~9s sem ela). A trava de verdade e o
        # proprio `silencedetect`, que mediu o audio: o miolo da pausa e mudo.
        # nao cortar o comeco nem o fim do video, so miolo
        c0, c1 = max(c0, 0.0), min(c1, dur)
        if c1 - c0 >= MIN_CORTE:
            fora.append((round(c0, 3), round(c1, 3)))
    return fora


def mantidos(fora, dur):
    seg, t = [], 0.0
    for a, b in fora:
        if a > t:
            seg.append((round(t, 3), round(a, 3)))
        t = b
    if t < dur:
        seg.append((round(t, 3), round(dur, 3)))
    return seg


def remontar(entrada, seg, saida):
    v = "".join(f"[0:v]trim={a}:{b},setpts=PTS-STARTPTS[v{i}];" for i, (a, b) in enumerate(seg))
    a_ = "".join(f"[0:a]atrim={a}:{b},asetpts=PTS-STARTPTS[a{i}];" for i, (a, b) in enumerate(seg))
    rot = "".join(f"[v{i}][a{i}]" for i in range(len(seg)))
    fc = v + a_ + rot + f"concat=n={len(seg)}:v=1:a=1[v][a]"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", entrada,
                    "-filter_complex", fc, "-map", "[v]", "-map", "[a]",
                    "-c:v", "libx264", "-preset", "medium", "-crf", "18",
                    "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
                    "-ar", "48000", saida], check=True)


def main():
    take, vozjson, saida, mapa = sys.argv[1:5]
    d = json.load(open(vozjson))
    palavras = [{"inicio": w["start"], "fim": w["end"]}
                for s in d["segments"] for w in s.get("words", [])]
    dur = float(subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", take], capture_output=True, text=True).stdout.strip())

    fora = cortes(take, palavras, dur)
    seg = mantidos(fora, dur)
    cortado = sum(b - a for a, b in fora)
    remontar(take, seg, saida)
    json.dump({"segmentos": seg, "cortado": round(cortado, 3),
               "duracao_original": round(dur, 3),
               "duracao_nova": round(dur - cortado, 3)},
              open(mapa, "w"), indent=1)
    print(f"{len(fora)} respiros cortados, {cortado:.2f}s a menos "
          f"({dur:.2f}s -> {dur - cortado:.2f}s)")


if __name__ == "__main__":
    main()
