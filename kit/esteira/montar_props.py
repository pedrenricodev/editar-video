#!/usr/bin/env python3
"""Gera o props da composicao FalandoComOverlay a partir da transcricao do take FINAL.

Este arquivo e um MOLDE: para cada Reels, copie, preencha K, ELEMENTOS, BLOCOS
e SFX com os tempos lidos na transcricao, e rode.

    python3 esteira/montar_props.py <palavras.json> <take_final.mp4> public/props.json

- `palavras.json` sai do `tok2words.py` (whisper.cpp com `-ml 1 -oj`) rodado no
  take FINAL, ja emendado e sem respiro. Nunca remapear a transcricao do bruto.
- o take tem que estar dentro de `public/`; o props guarda o caminho relativo.

O que ja custou retrabalho:
- confira na FONTE todo numero que a pessoa fala. Numero errado sai do take;
- o Whisper escreve palavra que nao existe na junta de duas emendas. Ouca os
  dois lados isolados e, se nao houver a palavra, ponha o indice em FANTASMAS;
- linha editorial com mais de 19 caracteres estoura a safe zone: o script para.
"""
import json
import subprocess
import sys
from pathlib import Path

# correcoes fixas do Whisper (o que ele escreve -> o que foi dito)
TROCA = {"Cloud": "Claude", "prompte": "prompt"}
# indices (campo _i) de palavras que o Whisper inventou numa junta
FANTASMAS: set[int] = set()

# tempos-chave, no tempo FINAL do take, lidos na transcricao -ml 1
K = {
    "gancho": 0.6, "ganchoFim": 2.4,
    "tela": 2.6, "numero": 3.6, "telaFim": 5.4,
    "cta": 9.8,
}

# o que entra na tela. Tipos: palavraAtras, titulo, pilulas, numero, telaCor,
# print, seletor, cta (ver `Elemento` em src/FalandoComOverlay.tsx)
ELEMENTOS = [
    {"tipo": "palavraAtras", "texto": "KIT", "entra": K["gancho"], "sai": K["ganchoFim"]},
    # com recorte da pessoa por cima (gerado pelo segmenta.swift):
    # "recorte": {"pasta": "recortes/gancho", "inicio": 0.0, "total": 72}
    {"tipo": "telaCor", "entra": K["tela"], "sai": K["telaFim"], "eyebrow": "Tempo de edição",
     "numero": {"alvo": 40, "entra": K["numero"], "prefixo": "-", "sufixo": "%"}},
    {"tipo": "palavraAtras", "texto": "KIT", "entra": K["cta"], "sai": 999, "destaque": True},
    {"tipo": "cta", "entra": K["cta"], "chamada": "Quer o modelo?", "palavra": "KIT"},
]

# pilha editorial so na frase de impacto. Indices da transcricao (campo _i):
# [(primeira, ultima, peso), ...] com peso pequena | grande | remate
BLOCOS: list[list[tuple[int, int, str]]] = []

# janelas em que a legenda some porque a tela ja escreve o que se fala
SEM_LEGENDA = [
    {"entra": 0.0, "sai": K["ganchoFim"]},
    {"entra": K["tela"], "sai": K["telaFim"]},
    {"entra": K["cta"] - 0.3, "sai": 999},
]

# junta exposta (fora de tela cheia) leva desfoque; "flash" e clarao branco
TRANSICOES: list[dict] = []
ZOOMS: list[dict] = []
SOCOS = [K["gancho"], K["cta"]]
DESTAQUES = ["kit"]
CHIP = {"entra": K["ganchoFim"] + 0.1, "sai": K["cta"] - 0.3, "palavra": "KIT",
        "complemento": "e receba o modelo"}

# som SO em coisa especifica: cerca de 10 por Reels
SFX = [
    (K["gancho"] - 0.45, "riser"), (K["gancho"], "impacto"),
    (K["numero"], "impacto"),
    (K["cta"] - 0.55, "riser"), (K["cta"], "impacto"), (K["cta"] + 0.04, "brilho"),
]


def duracao(caminho):
    return float(subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", caminho], capture_output=True, text=True).stdout.strip())


def palavras(caminho):
    ws = json.loads(Path(caminho).read_text())["segments"][0]["words"]
    out = []
    for i, w in enumerate(ws):
        if i in FANTASMAS:
            continue
        t = TROCA.get(w["word"], w["word"])
        # "2." + "5" -> "2.5", "v-" + "3" -> "v-3": o tok2words quebra numero
        ant = out[-1]["texto"] if out else ""
        numero_quebrado = ant.endswith(".") and ant[:-1].isdigit()
        if t[:1].isdigit() and (numero_quebrado or ant.endswith("-")):
            out[-1]["texto"] += t
            out[-1]["fim"] = round(w["end"], 2)
            continue
        out.append({"texto": t, "inicio": round(w["start"], 2), "fim": round(w["end"], 2), "_i": i})
    return out


def montar_blocos(ws, spec):
    por_i = {w["_i"]: w for w in ws}
    blocos, usados = [], set()
    for linhas_spec in spec:
        linhas, fim = [], 0.0
        for a, b, peso in linhas_spec:
            grupo = [por_i[i] for i in range(a, b + 1) if i in por_i]
            usados.update(range(a, b + 1))
            linhas.append({"texto": " ".join(w["texto"] for w in grupo),
                           "inicio": grupo[0]["inicio"], "peso": peso})
            fim = max(fim, grupo[-1]["fim"])
        blocos.append({"linhas": linhas, "fim": round(fim, 2)})
    resto = [{k: v for k, v in w.items() if k != "_i"} for w in ws if w["_i"] not in usados]
    return blocos, resto


def confere(blocos):
    for b in blocos:
        for l in b["linhas"]:
            if len(l["texto"]) > 19:
                raise SystemExit(f"linha editorial com {len(l['texto'])} chars: {l['texto']!r}")


def main():
    if len(sys.argv) != 4:
        raise SystemExit("uso: montar_props.py <palavras.json> <take_final.mp4> <saida_props.json>")
    pal, take, saida = sys.argv[1:4]
    take_p = Path(take).resolve()
    partes = take_p.parts
    if "public" not in partes:
        raise SystemExit("o take precisa estar dentro de public/ (o Remotion le de la)")
    base = "/".join(partes[len(partes) - partes[::-1].index("public"):])
    dur = round(duracao(str(take_p)), 2)

    ws = palavras(pal)
    blocos, resto = montar_blocos(ws, BLOCOS)
    confere(blocos)
    props = {"base": base, "duracao": dur, "palavras": resto, "destaques": DESTAQUES,
             "blocos": blocos, "semLegenda": SEM_LEGENDA, "transicoes": TRANSICOES,
             "zooms": ZOOMS, "socos": SOCOS, "chip": CHIP, "elementos": ELEMENTOS,
             "sfx": sorted(SFX), "legenda": "curta"}
    Path(saida).write_text(json.dumps(props, ensure_ascii=False, indent=1))
    print(saida, f"({dur}s, base {base})")
    for b in blocos:
        print("   ", " / ".join(f'{l["peso"][:3]}:{l["texto"]}' for l in b["linhas"]), "->", b["fim"])
    print("   ", len(resto), "palavras no regime padrão")


if __name__ == "__main__":
    main()
