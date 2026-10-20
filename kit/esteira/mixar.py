#!/usr/bin/env python3
"""Soma a trilha de efeitos ao render da composicao FalandoComOverlay.

A lista de efeitos e o campo `sfx` do proprio props ([segundo, nome]), escrita
a mao no montar_props.py: som so em coisa especifica (riser antes da palavra
gigante, impacto no numero, clique em UI que muda), cerca de 10 por Reels.
Entrada e saida de tela ficam em silencio.

    bash esteira/gerar_sons.sh      # uma vez, cria sfx/*.wav
    python3 esteira/mixar.py public/props.json out/mudo.mp4 out/final.mp4

O render do Remotion ja traz a voz (o <Audio> do take); aqui so entra a
trilha por cima. Pasta dos efeitos: env SFX_DIR, padrao `sfx/` na raiz do kit.
"""
import json
import os
import subprocess
import sys

KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SFX = os.environ.get("SFX_DIR", os.path.join(KIT, "sfx"))

# Pico alvo de cada efeito, em dBFS, medido contra uma voz gravada no celular
# com pico perto de -7 dB e que quase nunca para. Efeito 9 dB abaixo da fala
# nao e ouvido; passar de -16 ja compete com ela. Marcacao (clique, tique)
# fica bem embaixo da fala. Se a sua voz for mais baixa, desca todos juntos.
PICO_ALVO = {
    "whoosh": -16.0, "whoosh2": -16.0,
    "drop": -18.0, "impacto": -17.0,
    "riser": -22.0,
    "pop": -24.0, "tique": -27.0, "clique": -28.0, "tecla": -28.0,
    "brilho": -22.0,
}


def pico(caminho):
    """max_volume do arquivo, em dBFS. volumedetect loga em info, nao em error."""
    saida = subprocess.run(["ffmpeg", "-hide_banner", "-i", caminho,
                            "-af", "volumedetect", "-f", "null", "/dev/null"],
                           capture_output=True, text=True).stderr
    for linha in saida.splitlines():
        if "max_volume:" in linha:
            return float(linha.split("max_volume:")[1].replace("dB", "").strip())
    raise RuntimeError("sem max_volume em " + caminho)


def ganhos(nomes):
    """reganha cada efeito pro alvo: mexer no gerar_sons.sh nao desequilibra a mix"""
    return {n: round(PICO_ALVO.get(n, -24.0) - pico(os.path.join(SFX, n + ".wav")), 1)
            for n in nomes}


def trilha(ev, dur, saida):
    g = ganhos({n for _, n in ev})
    print("ganho por efeito (dB): " + ", ".join(f"{k}{v:+.1f}" for k, v in sorted(g.items())))
    ent = ["-f", "lavfi", "-t", f"{dur:.3f}", "-i", "anullsrc=r=48000:cl=stereo"]
    fc, rot = [], ["[0:a]"]
    for i, (t, nome) in enumerate(ev, start=1):
        ent += ["-i", os.path.join(SFX, nome + ".wav")]
        ms = int(round(t * 1000))
        fc.append(f"[{i}:a]volume={g[nome]}dB,adelay={ms}|{ms}[s{i}]")
        rot.append(f"[s{i}]")
    # normalize=0 e obrigatorio: com normalize=1 o amix divide por N e some tudo
    fc.append("".join(rot) + f"amix=inputs={len(ev) + 1}:normalize=0:duration=first[out]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", *ent,
                    "-filter_complex", ";".join(fc),
                    "-map", "[out]", "-ar", "48000", "-ac", "2", saida], check=True)


def main():
    if len(sys.argv) != 4:
        raise SystemExit("uso: mixar.py <props.json> <render.mp4> <final.mp4>")
    props_path, entrada, final = sys.argv[1:4]
    props = json.load(open(props_path))
    ev = sorted((float(t), nome) for t, nome in props["sfx"])
    if not ev:
        raise SystemExit("props sem sfx: nada a mixar")
    faltam = [n for n in {n for _, n in ev} if not os.path.exists(os.path.join(SFX, n + ".wav"))]
    if faltam:
        raise SystemExit(f"faltam efeitos em {SFX}: {faltam}. Rode esteira/gerar_sons.sh")
    tr = os.path.join(SFX, "_trilha.wav")
    trilha(ev, props["duracao"], tr)
    print(f"trilha: {len(ev)} eventos")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", entrada, "-i", tr,
                    "-filter_complex",
                    "[0:a]aresample=48000[v];[v][1:a]amix=inputs=2:normalize=0:duration=first[a]",
                    "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
                    final], check=True)
    saida = subprocess.run(["ffmpeg", "-i", final, "-af", "volumedetect", "-f", "null", "/dev/null"],
                           capture_output=True, text=True).stderr
    for linha in saida.splitlines():
        if "max_volume" in linha or "mean_volume" in linha:
            print(linha.strip().split("] ")[-1])
    print("final:", final)


if __name__ == "__main__":
    main()
