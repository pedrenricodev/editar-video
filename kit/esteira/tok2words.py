"""Converte o JSON do whisper.cpp (`whisper-cli -ml 1 -oj`) em palavras com tempo.

Com `-ml 1` cada segmento vira um token; aqui os tokens sem espaco na frente
sao colados na palavra anterior. Saida no formato que o resto da esteira le:
{"segments": [{"words": [{"word", "start", "end"}]}]}

    python3 tok2words.py take.json palavras.json
"""
import json,sys
d=json.load(open(sys.argv[1])); ws=[]
for s in d['transcription']:
    t=s['text']; a=s['offsets']['from']/1000; b=s['offsets']['to']/1000
    if not t.strip(): continue
    if t.startswith(' ') or not ws or t.strip()[0].isdigit() and not ws[-1]['word'][-1].isdigit():
        ws.append({'word':t.strip(),'start':a,'end':b})
    else:
        ws[-1]['word']+=t.strip(); ws[-1]['end']=b
json.dump({'segments':[{'words':ws}]},open(sys.argv[2],'w'),ensure_ascii=False)
