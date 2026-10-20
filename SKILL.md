---
name: editar-video
description: Roteador de uma esteira local de edição de Reels e criativos em vídeo a partir de um take gravado (pessoa falando para a câmera), com Remotion, ffmpeg, Whisper e scripts Python. Escolhe o modelo de edição certo no MODELOS.md, manda ler o manual do modelo antes de mexer e carrega os erros que já custaram retrabalho (ffmpeg sem libass, Remotion repetindo frame, Whisper escondendo repetição, legenda vazando da safe zone). Use SEMPRE que o pedido for editar um take, montar Reels, criativo em vídeo para anúncio, legendar, cortar respiro, mixar som ou renderizar no Remotion, ou frases como "editar vídeo", "edita esse take", "monta esse reels", "legenda", "corte", "motion", "tira os respiros", mesmo sem citar a skill.
---

# editar-video: roteador da esteira de Reels e criativos

Escopo: vídeo que nasce de um TAKE GRAVADO (alguém falando para a câmera) e vira Reels orgânico
ou criativo de anúncio. Vídeo gerado por IA, animação 3D e meme garimpado ficam fora.

Esta skill não é o manual de cada modelo. Ela escolhe o modelo, aponta o manual e lembra o que já quebrou.

## 0. Antes de tudo: ler o MODELOS.md

`MODELOS.md`, na mesma pasta desta skill, é o mapa local: para cada tipo de pedido, onde está o código
do modelo e o manual (`LEIA-MODELO.md`) a ler primeiro. Leia esse arquivo antes de escolher.

- Se uma linha do MODELOS.md ainda estiver com `<preencher>`, o modelo não existe nesta máquina.
  Diga isso ao usuário e proponha montar a partir do modelo mais próximo que existir.
- Leia o `LEIA-MODELO.md` antes de tocar em código. O código vivo muda com outros trabalhos; o manual
  é a cópia congelada do que foi aprovado.

## 1. Como escolher o modelo

| Pedido | Tipo de modelo |
|---|---|
| Reels do perfil com a pessoa falando, motion explicando a fala, texto atrás dela | `falando-com-overlay` (padrão) |
| Reels que mostra um documento ou página real marcada | `print-marcado` |
| Tela cheia opaca, o rosto sai e a pessoa só narra | `tela-cheia-narrada` |
| Take horizontal 16:9, tom de comédia, legenda nas laterais | `horizontal-comedia` |
| Reels de outra pessoa ou cliente com identidade visual própria | `cliente-idv-propria` |
| Criativo de anúncio: legenda grande em 2 linhas, palavra em destaque, botão de CTA, vinheta no fim | `anuncio-legenda-cta` |

Na dúvida entre `falando-com-overlay` e `tela-cheia-narrada`: o padrão é a pessoa aparecer a maior parte
do tempo. Tela cheia só onde o print precisa ser lido, ou quando pedirem "sem eu aparecer".

## 2. Esteira comum

A ordem importa. Cada passo tem detalhe no manual do modelo.

1. **Entender o pedido antes do render.** Qual modelo, qual identidade visual, onde entregar.
   Pedido ambíguo trava aqui, não depois de 15 minutos de render.
2. **Transcrever o bruto** com Whisper (`--word_timestamps True`, `--initial_prompt` com o vocabulário do take).
3. **Escolher trechos e cortar respiro.** Corte por silêncio (`silencedetect`), deixando ~0,075 s de cada lado.
4. **Aparar o início e o fim.** Medir onde a fala real começa e termina. Os segundos da pessoa se ajeitando
   antes de falar são o retorno mais comum numa peça que de resto foi aprovada.
   Se o bruto já vem com vinheta colada, cortar no `black_start`.
5. **Transcrever de novo o take final.** Só essa transcrição vale para legenda e tempos-chave.
6. **Conferir na fonte todo número que a pessoa fala.** Número errado sai do take ou vai com aviso.
7. **Montagem.** Remotion: emendar no ffmpeg e decorar no Remotion (não emendar dentro do Remotion).
   Ajustar os tempos-chave pela transcrição, `npx tsc --noEmit`, stills nos quadros-chave
   (`npx remotion still ... --scale=0.5`) e só então o render completo.
8. **Legenda em dois regimes.** Padrão = uma palavra por vez, branca, bold, linha única.
   Pilha editorial (linha pequena / grande / remate em itálico) só no gancho ou frase de impacto,
   montada à mão por sintagma, não por contagem de palavras. Criativo de anúncio tem regime próprio
   (2 linhas, bold, contorno escuro, palavra-chave em cor de destaque); legenda fina lê como apagada.
9. **Mix de som.** Som só em momento-chave (~10 a 13 por Reels: impacto em número, riser em palavra
   gigante, clique em UI que muda). Entrada e saída de tela em silêncio. Medir o pico de cada efeito e
   reganhar para um alvo fixo. Sempre `amix=normalize=0`. Loudnorm -14 LUFS na entrega.
10. **Render e entrega** (ver regras abaixo).

## 3. Erros que já custaram retrabalho

- **ffmpeg sem libass.** No macOS, o `ffmpeg` do Homebrew é build slim: `subtitles` e `drawtext`
  respondem `Unknown filter`. Instalar `ffmpeg-full` e chamar pelo caminho absoluto
  (`/opt/homebrew/opt/ffmpeg-full/bin/ffmpeg`), porque ele é keg-only e o slim continua no PATH.
- **`-nostdin` em ffmpeg dentro de `while read`.** Sem ele o ffmpeg come as linhas do heredoc e o loop
  mistura arquivos.
- **`<Video>` do Remotion repete frame no render.** Usar `<OffthreadVideo muted>` no take principal,
  com a voz num `<Audio>` separado. Conferir com `mpdecimate` num recorte do rosto.
- **Whisper esconde repetição.** Junta a tentativa abandonada com a refeita numa frase só. Trecho com
  silêncio interno > 0,5 s: picotar e transcrever cada pedaço. Várias palavras no mesmo timestamp
  são sinal. A versão certa é a segunda tentativa inteira. Também alucina "Obrigado." no silêncio.
- **Whisper erra nome próprio e jargão:** "Claude" vira "Cloud", "prompt" vira "prompte", preço sai
  quebrado em vários tokens. Corrigir por tabela que casa (segundo, palavra errada) e para o script se
  não achar. Palavra indecifrável volta como pergunta ao usuário, nunca como legenda chutada.
- **Whisper mente o início da fala.** Medir com `silencedetect`, não confiar no timestamp 0,0.
- **libass e fonte `.ttc`:** nomear a face cheia (ex. `Avenir Next Demi Bold`), senão ele pega a face
  errada. Testar fonte renderizando um frame, não por `fc-match`.
- **ASS com `WrapStyle: 0`.** `WrapStyle: 2` desliga a quebra e o texto vaza da tela sem erro.
- **Legenda pisca no silêncio:** estender cada palavra até o início da próxima, com teto de 0,8 s.
- **Medir efeito sonoro do jeito certo:** ruído (whoosh, riser) por RMS da janela; efeito tonal na
  própria banda. Bandpass estreito em ruído dá leitura falsa de "inaudível".

## 4. Regras fixas

- **Safe zone 1080x1920:** conteúdo entre y 250 e 1500, laterais >= 84 px. Legenda com no máximo
  19 caracteres por linha. Conferir num frame com linhas-guia desenhadas.
- **Piso de 32 px** em qualquer texto. Se não cabe, corta conteúdo ou dá zoom de câmera.
- **Medir a geometria do rosto em cada take** (topo do cabelo, linha dos olhos, boca). Muda a cada
  gravação. O limite real para overlay é a linha dos olhos, não o cabelo. Selfie fechada: legenda
  acima da cabeça. Rodar detecção de cena (`select='gt(scene,0.25)'`) antes de cravar overlay.
- **Nunca trabalhar no repositório vivo** se outra sessão pode estar nele: clonar com `cp -c -R`
  (APFS, instantâneo) para um nome novo.
- **Entrega:** pasta definida no MODELOS.md + cópia leve abaixo de 30 MB (ex. CRF 25 com
  `-maxrate 3300k`, ou 720p a 1300k) para ver no celular.

## 5. Quando o modelo não existe

Escolher o modelo mais próximo, dizer qual e por quê, e renderizar stills antes do vídeo inteiro.
Se o resultado for aprovado, congelar uma cópia em `modelos/<nome>/` com um `LEIA-MODELO.md` e
acrescentar a linha no MODELOS.md.
