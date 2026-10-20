#!/usr/bin/env python3
"""Monta o take limpo a partir dos trechos BONS de uma gravacao cheia de erro.

Para a gravacao cheia de erro (tomada repetida, gaguejo, frase abandonada).

O `cortar_respiros.py` NAO resolve isso: ele corta silencio, e erro de fala nao e
silencio. Aqui e o passo anterior: escolher, dentro da gravacao, as tomadas que
prestam, e jogar fora repeticao, gaguejo e frase abandonada.

Fluxo da esteira (a ordem importa):
 1. transcrever o BRUTO em nivel de segmento, so pra eu ler e escolher
 2. `escolher_takes.py` monta o take limpo com os trechos escolhidos   <- aqui
 3. `cortar_respiros.py` tira os respiros do que sobrou
 4. transcrever DE NOVO, agora com `-ml 1`, pra legenda ter palavra exata
    (nunca remapear a transcricao do bruto: as palavras-chave somem)

Uso:
    python3 escolher_takes.py <bruto.mp4> <trechos.json> <saida.mp4> <mapa.json>

`trechos.json` e' uma lista de pares em segundos, na ordem de montagem:
    [[12.4, 19.8], [45.1, 52.0], ...]

O corte de video e no frame; o de audio e na amostra. Sem `FADE` nas emendas
sai um clique audivel em cada junta, e aqui tem dezenas de juntas.
"""
import json
import subprocess
import sys

FADE = 0.012   # 12ms de rampa em cada ponta, mata o clique sem comer fonema


def duracao(caminho):
    return float(subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", caminho], capture_output=True, text=True).stdout.strip())


def remontar(entrada, seg, saida):
    """Concatena os trechos escolhidos, com rampa curta de audio nas juntas."""
    partes = []
    for i, (a, b) in enumerate(seg):
        dur = b - a
        partes.append(f"[0:v]trim={a}:{b},setpts=PTS-STARTPTS[v{i}];")
        partes.append(
            f"[0:a]atrim={a}:{b},asetpts=PTS-STARTPTS,"
            f"afade=t=in:st=0:d={FADE},"
            f"afade=t=out:st={max(dur - FADE, 0):.3f}:d={FADE}[a{i}];"
        )
    rot = "".join(f"[v{i}][a{i}]" for i in range(len(seg)))
    fc = "".join(partes) + rot + f"concat=n={len(seg)}:v=1:a=1[v][a]"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", entrada,
                    "-filter_complex", fc, "-map", "[v]", "-map", "[a]",
                    "-c:v", "libx264", "-preset", "medium", "-crf", "18",
                    "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
                    "-ar", "48000", saida], check=True)


def main():
    bruto, trechos_json, saida, mapa = sys.argv[1:5]
    seg = [(round(float(a), 3), round(float(b), 3))
           for a, b in json.load(open(trechos_json))]

    dur = duracao(bruto)
    for a, b in seg:
        if not (0 <= a < b <= dur + 0.05):
            raise SystemExit(f"trecho invalido: {a}..{b} (video tem {dur:.2f}s)")

    remontar(bruto, seg, saida)
    nova = sum(b - a for a, b in seg)

    # o mapa guarda onde cada junta caiu NO TEMPO NOVO. E o que a camada de
    # transicao usa pra esconder o pulo de imagem em cada emenda.
    juntas, t = [], 0.0
    for a, b in seg[:-1]:
        t += b - a
        juntas.append(round(t, 3))

    json.dump({"segmentos": seg, "juntas": juntas,
               "duracao_original": round(dur, 3),
               "duracao_nova": round(nova, 3),
               "cortado": round(dur - nova, 3)},
              open(mapa, "w"), indent=1)
    print(f"{len(seg)} trechos mantidos, {len(juntas)} juntas. "
          f"{dur:.2f}s -> {nova:.2f}s ({dur - nova:.2f}s fora, "
          f"{100 * (dur - nova) / dur:.0f}%)")


if __name__ == "__main__":
    main()
