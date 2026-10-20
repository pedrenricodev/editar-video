# editar-video

Skill do [Claude Code](https://claude.com/claude-code) para editar **Reels e criativos em vídeo a
partir de um take gravado**: alguém falando para a câmera, que vira Reels orgânico ou anúncio.

Ela não é um editor. É um roteador: quando você pede "edita esse take", o Claude escolhe o modelo de
edição certo, lê o manual daquele modelo antes de mexer e segue uma esteira fixa (corte, legenda, som,
render, entrega) com uma lista de erros que já custaram retrabalho e não precisam se repetir.

## Instalar em 1 minuto

Copie o texto abaixo, cole no seu Claude Code e mande. Ele baixa a skill, instala o kit e roda o
exemplo para provar que funcionou.

```text
Instale a skill editar-video para mim. Rode:
git clone https://github.com/pedrenricodev/editar-video ~/.claude/skills/editar-video
Depois leia ~/.claude/skills/editar-video/kit/README.md e siga a seção 1 (instalar o combo inteiro:
ffmpeg, Node, Python, whisper.cpp e o modelo do Whisper), me pedindo permissão antes de cada
instalação. Em seguida rode a seção 2 (exemplo sintético) dentro de ~/.claude/skills/editar-video/kit
e me mostre o still gerado. No fim, me diga o que ficou instalado e o que faltou.
```

Prefere fazer à mão? É um comando só:

```bash
git clone https://github.com/pedrenricodev/editar-video ~/.claude/skills/editar-video
```

Depois abra uma sessão nova do Claude Code: a skill aparece sozinha e dispara quando o pedido é de
edição de vídeo. Para o código do editor, siga o [`kit/README.md`](kit/README.md).

## Para quem serve

Para quem já edita vídeo com o Claude Code numa esteira local parecida com esta:

- **Remotion** para montagem, motion e legenda animada
- **ffmpeg** (build com libass) para corte, emenda, legenda queimada e mix
- **Whisper** para transcrição com timestamp por palavra
- **Scripts Python** de montagem e mix

O modelo padrão (`falando-com-overlay`) vem pronto na pasta `kit/`. Para os outros, a skill continua útil: a esteira, os erros conhecidos e as regras de
safe zone valem sozinhos, e ela ajuda a montar cada modelo a partir do kit e congelar como padrão.

## O que tem aqui

| Arquivo | Para que serve |
|---|---|
| `SKILL.md` | A skill: como escolher o modelo, a esteira em 10 passos, os erros conhecidos e as regras fixas |
| `MODELOS.md` | O mapa local que **você preenche**: onde estão o código e o manual de cada modelo na sua máquina |
| `kit/` | Código pronto do modelo padrão `falando-com-overlay`: projeto Remotion + scripts da esteira, com exemplo sintético. Instalação em `kit/README.md` |

## Configurar

Abra `~/.claude/skills/editar-video/MODELOS.md` e troque cada `<preencher>` pelo caminho real:

1. **Pastas:** raiz das ferramentas de vídeo, projeto Remotion e pasta de entrega.
2. **Modelos:** para cada tipo que você usa, o código (composição, script de montagem, script de mix) e o
   `LEIA-MODELO.md` do modelo. Tipo que você não tem pode ficar com `<preencher>`; a skill avisa e
   propõe partir do mais próximo.
3. **Identidade visual** (opcional): cores, fontes e estilo de legenda por cliente.
4. **Correções do Whisper** (opcional): palavras que ele sempre erra no seu vocabulário.

### Os 6 tipos de modelo

| Tipo | Quando usar |
|---|---|
| `falando-com-overlay` | Padrão. Pessoa falando, motion explicando a fala, palavra gigante atrás dela |
| `print-marcado` | Mostrar documento ou página real com trecho marcado |
| `tela-cheia-narrada` | Tela opaca cobre o rosto e a pessoa só narra |
| `horizontal-comedia` | Take 16:9, tom de piada, legenda nas laterais |
| `cliente-idv-propria` | Mesmo kit do padrão, com cores, fontes e legenda de outro cliente |
| `anuncio-legenda-cta` | Criativo de anúncio: legenda grande em 2 linhas, palavra em destaque, botão de CTA, vinheta |

### O que vai num `LEIA-MODELO.md`

Quando um vídeo for aprovado, congele o modelo: copie a composição e os scripts para
`modelos/<nome>/` e escreva um manual curto com:

- a esteira do modelo, passo a passo, com os comandos;
- as regras travadas (cores, fontes, onde a legenda fica, quantos efeitos sonoros);
- a geometria medida do take (topo da cabeça, linha dos olhos, boca);
- o que foi reprovado antes de aprovar, para não repetir.

O manual é o que a skill manda ler primeiro. O código vivo muda; o manual guarda o que foi aprovado.

## Como usar no dia a dia

Peça normalmente, sem citar a skill:

- "edita esse take pro meu perfil, tira os respiros" + caminho do vídeo
- "monta esse reels no modelo de tela cheia, eu só narro"
- "faz o criativo de anúncio com esse vídeo, legenda grande e vinheta no fim"
- "legenda esse vídeo, uma palavra por vez"

O que o Claude faz com a skill:

1. Lê o `MODELOS.md` e escolhe o tipo de modelo.
2. Lê o `LEIA-MODELO.md` daquele modelo.
3. Transcreve, corta respiro, apara início e fim, transcreve de novo o take final.
4. Monta, renderiza stills dos quadros-chave e confere a safe zone antes do render completo.
5. Legenda, mixa o som, renderiza e entrega na pasta configurada, com uma cópia leve abaixo de 30 MB.

## Erros que a skill evita

- ffmpeg do Homebrew sem libass (`Unknown filter` em `subtitles` e `drawtext`)
- ffmpeg dentro de `while read` sem `-nostdin` comendo o loop
- `<Video>` do Remotion repetindo frame no render (usar `<OffthreadVideo>`)
- Whisper juntando a frase abandonada com a refeita, errando nome próprio e mentindo o início da fala
- libass pegando a face errada de uma fonte `.ttc`
- `WrapStyle: 2` no ASS deixando o texto vazar da tela
- Legenda piscando no silêncio entre palavras
- Texto fora da safe zone do Reels (y 250 a 1500, laterais 84 px) ou abaixo de 32 px

## Requisitos

- Claude Code
- macOS ou Linux com `ffmpeg` compilado com libass (no macOS: `brew install ffmpeg-full`)
- Node e Remotion para os modelos com motion
- `openai-whisper` ou equivalente com `--word_timestamps`
- Python 3

## Licença

MIT. Use, adapte e redistribua à vontade.
