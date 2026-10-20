#!/bin/bash
# Paleta de efeitos do modelo, 100% sintetizada pelo ffmpeg (anoisesrc + sine).
# Nenhum arquivo de som baixado: rode uma vez e os .wav saem em ../sfx/.
#
# Os volumes daqui nao importam muito: o mixar.py mede o pico de cada efeito e
# reganha pro alvo dele (PICO_ALVO). Mexer num som aqui nao desequilibra a mix.
#
# Medir efeito TONAL na banda dele (bandpass) e efeito de RUIDO pelo RMS da
# janela: medir ruido com bandpass estreito da leitura falsa.
set -e
D="${SFX_DIR:-$(cd "$(dirname "$0")/.." && pwd)/sfx}"; mkdir -p "$D"; Q="-v error -y"

# riser: ruido que sobe, anuncia a palavra gigante. Entra ~0,45s ANTES dela.
ffmpeg $Q -f lavfi -i "anoisesrc=d=0.55:c=white:a=0.9" \
  -af "highpass=f=900,lowpass=f=9000,afade=t=in:st=0:d=0.42,afade=t=out:st=0.46:d=0.09,volume=0.13" \
  -ar 48000 -ac 2 "$D/riser.wav"

# impacto: sub curto, da peso ao numero batendo sem estourar
ffmpeg $Q -f lavfi -i "sine=frequency=150:duration=0.34" \
  -af "asetrate=48000*0.55,aresample=48000,afade=t=out:st=0.04:d=0.30,volume=0.26" \
  -ar 48000 -ac 2 "$D/impacto.wav"

# drop: sub grave curto, cai junto com um corte forte
ffmpeg $Q -f lavfi -i "sine=frequency=110:duration=0.40" \
  -af "asetrate=48000*0.5,aresample=48000,afade=t=out:st=0.05:d=0.35,volume=0.30" \
  -ar 48000 -ac 2 "$D/drop.wav"

# brilho: palavra se revelando, botao acendendo
ffmpeg $Q -f lavfi -i "sine=frequency=1200:duration=0.42" \
  -af "vibrato=f=7:d=0.6,afade=t=in:st=0:d=0.05,afade=t=out:st=0.10:d=0.32,volume=0.10" \
  -ar 48000 -ac 2 "$D/brilho.wav"

# clique: tick seco de interface (seletor mudando, card pequeno entrando)
ffmpeg $Q -f lavfi -i "sine=frequency=1500:duration=0.03" \
  -af "afade=t=out:st=0.004:d=0.026,volume=0.10" -ar 48000 -ac 2 "$D/clique.wav"

# tique: mais agudo e mais baixo que o clique, pra lista longa
ffmpeg $Q -f lavfi -i "sine=frequency=2100:duration=0.022" \
  -af "afade=t=out:st=0.003:d=0.019,volume=0.055" -ar 48000 -ac 2 "$D/tique.wav"

# pop: cartao entrando
ffmpeg $Q -f lavfi -i "sine=frequency=780:duration=0.07" \
  -af "afade=t=out:st=0.008:d=0.062,volume=0.13" -ar 48000 -ac 2 "$D/pop.wav"

# tecla: tique curtissimo de teclado, pra texto se digitando
ffmpeg $Q -f lavfi -i "anoisesrc=d=0.035:c=white:a=0.6" \
  -af "highpass=f=1800,lowpass=f=6500,afade=t=out:st=0.004:d=0.03,volume=0.16" \
  -ar 48000 -ac 2 "$D/tecla.wav"

# whoosh e whoosh2: troca de painel (curto e um pouco mais longo e grave)
ffmpeg $Q -f lavfi -i "anoisesrc=d=0.42:c=pink:a=0.5" \
  -af "highpass=f=300,lowpass=f=4500,afade=t=in:st=0:d=0.06,afade=t=out:st=0.12:d=0.30,volume=0.30" \
  -ar 48000 -ac 2 "$D/whoosh.wav"
ffmpeg $Q -f lavfi -i "anoisesrc=d=0.50:c=brown:a=0.6" \
  -af "highpass=f=200,lowpass=f=3500,afade=t=in:st=0:d=0.08,afade=t=out:st=0.14:d=0.36,volume=0.34" \
  -ar 48000 -ac 2 "$D/whoosh2.wav"

echo "sfx em $D: $(ls "$D" | tr '\n' ' ')"
