"""Envelope de volume (dB a cada 20 ms) de trechos de um WAV mono 16 bits.

Serve pra achar o ponto de emenda DENTRO de uma frase: corte onde o envelope
cai, nunca no meio de um fonema. Depois da emenda, transcreva de novo pra testar.

    ffmpeg -i take.mp4 -ac 1 -ar 16000 -c:a pcm_s16le take.wav
    python3 env.py take.wav 21.40:21.80 22.90:23.10
"""
import sys,wave,struct,math
w=wave.open(sys.argv[1]);sr=w.getframerate();n=w.getnframes();raw=w.readframes(n)
x=struct.unpack(f'<{n}h',raw)
for par in sys.argv[2:]:
    a,b=map(float,par.split(':'));out=[]
    t=a
    while t<b:
        s=x[int(t*sr):int((t+0.02)*sr)];r=math.sqrt(sum(v*v for v in s)/max(1,len(s)));db=20*math.log10(r/32768+1e-9)
        out.append(f"{t:.2f}:{int(db)}");t+=0.02
    print(par,' '.join(out))
