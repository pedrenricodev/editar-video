# Kit `falando-com-overlay`

Código do modelo padrão da skill: Reels vertical (1080x1920, 30 fps) com a pessoa falando para a
câmera, palavra gigante atrás dela, telas cheias com print real ou número enorme, pílulas de UI,
legenda palavra por palavra e trilha de efeitos sintetizada.

O kit tem duas partes:

- `src/`: projeto Remotion com a composição `FalandoComOverlay`. Tudo que muda de vídeo para vídeo
  vem do props (JSON); não há roteiro embutido no código.
- `esteira/`: os scripts que preparam o take e o som (escolher trechos, cortar respiro, transcrever,
  recortar a pessoa, tirar print, montar o props, mixar).

## 1. Instalar o combo inteiro

Precisa de tudo abaixo. Comandos para macOS com [Homebrew](https://brew.sh); no Linux, use os pacotes
equivalentes da sua distro.

| Ferramenta | Para quê | Instalar |
|---|---|---|
| **ffmpeg** | corte, emenda, sons, mix, take de exemplo | `brew install ffmpeg` |
| **Node 22+** | Remotion e `cdp_print.js` | `brew install node` |
| **Python 3.10+** | scripts da esteira (só biblioteca padrão) | `brew install python` |
| **whisper.cpp** | transcrição palavra por palavra | `brew install whisper-cpp` |
| Google Chrome | só para `cdp_print.js` (print real de página) | [google.com/chrome](https://www.google.com/chrome/) |
| Xcode Command Line Tools | só para `segmenta.swift` (recorte da pessoa, só macOS) | `xcode-select --install` |

Sobre o ffmpeg: este kit roda com o `ffmpeg` comum. Os outros modelos da skill queimam legenda com
`subtitles` e `drawtext`, que o `ffmpeg` do Homebrew não traz. Para ter o combo completo, instale o
`ffmpeg-full` (é keg-only, então precisa entrar no PATH):

```bash
brew install ffmpeg-full
```

```bash
echo 'export PATH="$(brew --prefix ffmpeg-full)/bin:$PATH"' >> ~/.zshrc
```

Modelo do Whisper (cerca de 1,6 GB, uma vez só):

```bash
mkdir -p ~/whisper-models && curl -L -o ~/whisper-models/ggml-large-v3-turbo.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin
```

Dependências do projeto (versões travadas no `package.json`):

```bash
npm install
```

## 2. Provar que roda: o exemplo sintético

O exemplo usa um take falso (cor sólida + tom de 220 Hz) e um "print" desenhado pelo ffmpeg. Nenhuma
gravação real vai no repositório.

```bash
bash exemplo/gerar_exemplo.sh
```

```bash
npx tsc --noEmit
```

```bash
npx remotion still FalandoComOverlay out/still.png --frame=110 --scale=0.5
```

```bash
npx remotion render FalandoComOverlay out/mudo.mp4
```

```bash
bash esteira/gerar_sons.sh
```

```bash
python3 esteira/mixar.py exemplo/props.json out/mudo.mp4 out/final.mp4
```

Para ver e mexer ao vivo: `npm run studio`. As fontes vêm do Google Fonts pelo
`@remotion/google-fonts`, então o primeiro render precisa de internet.

## 3. Editar o seu take

A ordem importa.

1. **Transcrever o bruto** para ler e escolher os trechos bons:

   ```bash
   ffmpeg -i bruto.mov -ac 1 -ar 16000 -c:a pcm_s16le bruto.wav
   ```

   ```bash
   whisper-cli -m ~/whisper-models/ggml-large-v3-turbo.bin -l pt -f bruto.wav -oj -of bruto
   ```

2. **Escolher os trechos** (repetição, gaguejo e frase abandonada saem). `trechos.json` é uma lista
   `[[inicio, fim], ...]` em segundos, na ordem de montagem:

   ```bash
   python3 esteira/escolher_takes.py bruto.mov trechos.json limpo.mp4 mapa-trechos.json
   ```

   Emenda no meio da frase: use `esteira/env.py` para achar o vale de volume e transcreva de novo
   para testar a emenda.

3. **Cortar os respiros** (usa a transcrição do `limpo.mp4` convertida pelo `tok2words.py`):

   ```bash
   python3 esteira/cortar_respiros.py limpo.mp4 limpo-palavras.json public/take.mp4 mapa-respiros.json
   ```

4. **Transcrever DE NOVO o take final**, com `-ml 1`. Só essa transcrição vale para legenda e tempos:

   ```bash
   ffmpeg -i public/take.mp4 -ac 1 -ar 16000 -c:a pcm_s16le take.wav
   ```

   ```bash
   whisper-cli -m ~/whisper-models/ggml-large-v3-turbo.bin -l pt -f take.wav -ml 1 -oj -of take
   ```

   ```bash
   python3 esteira/tok2words.py take.json palavras.json
   ```

5. **Conferir na fonte todo número que a pessoa fala.** Número errado sai do take.
6. **Print real** (opcional), com `esteira/cdp_print.js` (instruções no topo do arquivo). Salve em
   `public/`.
7. **Recorte da pessoa** (opcional, para a palavra passar atrás dela), com `esteira/segmenta.swift`
   (instruções no topo do arquivo). Salve em `public/<pasta>/0001.png...`.
8. **Montar o props:** copie `esteira/montar_props.py`, preencha `K`, `ELEMENTOS`, `BLOCOS` e `SFX` com
   os tempos lidos em `palavras.json` e rode:

   ```bash
   python3 esteira/montar_props.py palavras.json public/take.mp4 public/props.json
   ```

9. **Conferir antes do render completo:** `npx tsc --noEmit` e stills nos quadros-chave.

   ```bash
   npx remotion still FalandoComOverlay out/f.png --props=public/props.json --frame=60 --scale=0.5
   ```

10. **Render e mix:**

    ```bash
    npx remotion render FalandoComOverlay out/mudo.mp4 --props=public/props.json
    ```

    ```bash
    python3 esteira/mixar.py public/props.json out/mudo.mp4 out/final.mp4
    ```

## Os elementos do props

Tipos aceitos em `elementos` (definição completa em `Elemento`, no topo de
`src/FalandoComOverlay.tsx`; exemplo de cada um em `exemplo/props.json`):

| Tipo | O que faz |
|---|---|
| `palavraAtras` | palavra ou número gigante atrás da pessoa; com `recorte`, a pessoa fica na frente |
| `titulo` | duas peças: sans pesada branca + serifa itálica na cor de destaque |
| `pilulas` | cards de UI entrando com mola, um por vez |
| `numero` | número que conta até o alvo, no peito, com apoio em itálico |
| `telaCor` | tela cheia na cor de destaque, número enorme, sobe como card e sai de lado |
| `print` | tela cheia com print real num card 3D, marca-texto e círculo desenhado à mão |
| `seletor` | seletor segmentado acima da cabeça que pula de um nível para outro |
| `cta` | "Comenta X" no peito, no fim |

Regras do modelo: a pessoa aparece a maior parte do vídeo; tela cheia só para print que precisa ser
lido. Som só em coisa específica (cerca de 10 por Reels). Texto dentro da margem lateral de 104 px;
linha editorial com no máximo 19 caracteres.

Cores: o kit vem com uma paleta neutra (`CORES_PADRAO`). Troque pelo seu passando `cores` no props,
sempre em hex de 6 dígitos (`#RRGGBB`), porque a composição soma transparência no fim da cor.

## Licenças

- **Código deste kit:** MIT, como o resto do repositório.
- **Remotion:** não é MIT. É grátis para indivíduo, para empresa com até 3 pessoas e para organização
  sem fins lucrativos, inclusive em uso comercial. Empresa maior que isso precisa da licença paga
  (Company License). Leia os termos em [remotion.dev/license](https://www.remotion.dev/license).
- **Fontes:** só Google Fonts (licença OFL), baixadas pelo `@remotion/google-fonts`. Nenhum arquivo de
  fonte vai no repositório.
- **Efeitos sonoros:** sintetizados pelo ffmpeg no `esteira/gerar_sons.sh`. Nada baixado, nenhuma
  licença de terceiro.
