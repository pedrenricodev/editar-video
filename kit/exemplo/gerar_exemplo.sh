#!/bin/bash
# Gera o take sintetico do exemplo: 12s de cor solida 1080x1920 com um tom de
# 220 Hz no lugar da voz, mais um "print" de mentira (cartao branco com linhas).
# Nada aqui e gravacao real: serve so pra provar que o kit renderiza.
set -e
K="$(cd "$(dirname "$0")/.." && pwd)"
D="$K/public/exemplo"; mkdir -p "$D"; Q="-v error -y"

ffmpeg $Q -f lavfi -i "color=c=0x3B4A5E:s=1080x1920:r=30:d=12" \
  -f lavfi -i "sine=frequency=220:sample_rate=48000:duration=12" \
  -vf "drawbox=x=340:y=520:w=400:h=900:color=0x2A3546:t=fill" \
  -c:v libx264 -pix_fmt yuv420p -crf 20 -c:a aac -b:a 128k -shortest "$D/take.mp4"

ffmpeg $Q -f lavfi -i "color=c=white:s=1200x700" -frames:v 1 \
  -vf "drawbox=x=0:y=0:w=1200:h=110:color=0xE9ECF2:t=fill,\
drawbox=x=60:y=180:w=1080:h=4:color=0xD5DAE3:t=fill,\
drawbox=x=60:y=300:w=1080:h=4:color=0xD5DAE3:t=fill,\
drawbox=x=60:y=420:w=1080:h=4:color=0xD5DAE3:t=fill,\
drawbox=x=60:y=540:w=1080:h=4:color=0xD5DAE3:t=fill,\
drawbox=x=80:y=215:w=420:h=50:color=0x9AA3B5:t=fill,\
drawbox=x=80:y=335:w=360:h=50:color=0x9AA3B5:t=fill,\
drawbox=x=80:y=455:w=460:h=50:color=0x9AA3B5:t=fill,\
drawbox=x=760:y=335:w=300:h=50:color=0x3B4A5E:t=fill" "$D/print.png"

echo "exemplo: $(ls "$D" | tr '\n' ' ')"
