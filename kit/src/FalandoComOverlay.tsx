import React from "react";
import {
  AbsoluteFill, Audio, Img, interpolate, OffthreadVideo, spring, staticFile,
  useCurrentFrame, useVideoConfig, Easing,
} from "remotion";
import { conjunto, CONJUNTO_PADRAO } from "./fontes";
import { LegendaEditorial } from "./LegendaEditorial";
import type { BlocoLegenda } from "./LegendaEditorial";
import { LegendaPadrao } from "./LegendaPadrao";
import type { Palavra } from "./tipos";

/**
 * Composicao `FalandoComOverlay`: Reels vertical 1080x1920 com a pessoa falando
 * para a camera e o motion explicando a fala.
 *
 * Regras do modelo (valem para todo take):
 * - a pessoa APARECE a maior parte do video. Tela cheia so onde um print
 *   precisa ser lido ou um numero precisa de palco;
 * - numero grande ou palavra gigante vai ATRAS da pessoa (com o recorte da
 *   pessoa por quadro por cima). UI pequena vai POR CIMA (acima da cabeca ou
 *   no peito);
 * - som so em coisa especifica (cerca de 10 por Reels). Entrada e saida de
 *   tela ficam em silencio;
 * - texto dentro da margem lateral de 104px, centralizado. Legenda com no
 *   maximo 19 caracteres por linha.
 *
 * Nada aqui e roteiro de um take: tudo que muda de video para video vem do
 * props (`elementos`, tempos, legenda). O `esteira/montar_props.py` gera esse
 * props a partir da transcricao.
 */

// ---------------------------------------------------------------- paleta

export type Cores = {
  /** fundo das telas cheias (gradiente de `fundo2` para `fundo`) */
  fundo: string;
  fundo2: string;
  /** mancha de luz que anda no fundo */
  brilho: string;
  /** cor de destaque: palavra-chave da legenda, pilula, tela de cor */
  destaque: string;
  /** card escuro de UI */
  card: string;
  /** texto secundario (eyebrow) */
  apagado: string;
};

/** Paleta neutra do kit. Troque pelo seu: cada cliente tem a sua. */
export const CORES_PADRAO: Cores = {
  fundo: "#0D0F14",
  fundo2: "#161B26",
  brilho: "#2A3550",
  destaque: "#FFC83D",
  card: "#1C2230",
  apagado: "#9AA3B5",
};

const SOMBRA_TXT = "0 3px 14px rgba(0,0,0,.5), 0 0 2px rgba(0,0,0,.45)";
const CoresCtx = React.createContext<Cores>(CORES_PADRAO);
const useCores = () => React.useContext(CoresCtx);

// ---------------------------------------------------------------- tipos do props

export type Janela = { entra: number; sai: number };
export type Transicao = { t: number; tipo: "flash" | "desfoque" };
/** sequencia de quadros da pessoa recortada (fundo transparente), 1 arquivo
 *  por quadro (`0001.png`, `0002.png`...), a partir de `inicio` segundos */
export type Recorte = { pasta: string; inicio: number; total: number; extensao?: "png" | "webp" };
export type Retangulo = { x: number; y: number; w: number; h: number };

export type Elemento =
  /** palavra ou numero gigante ATRAS da pessoa */
  | { tipo: "palavraAtras"; texto: string; entra: number; sai: number; top?: number; corpo?: number;
      destaque?: boolean; italico?: boolean; recorte?: Recorte }
  /** titulo em duas pecas: sans pesada branca + serifa italica em destaque */
  | { tipo: "titulo"; a: string; b: string; entra: number; sai: number; top?: number; corpo?: number;
      eyebrow?: string }
  /** pilulas de UI entrando com mola, uma por vez */
  | { tipo: "pilulas"; sai: number; top?: number; corpo?: number; direcao?: "linha" | "coluna";
      itens: { texto: string; entra: number; destaque?: boolean; de?: "esq" | "dir" | "baixo" }[] }
  /** numero que conta ate o alvo, na frente (no peito), com apoio em italico */
  | { tipo: "numero"; alvo: number; entra: number; sai: number; casas?: number; prefixo?: string;
      sufixo?: string; apoio?: string; top?: number; corpo?: number }
  /** tela cheia chapada na cor de destaque, que sobe como card e sai de lado */
  | { tipo: "telaCor"; entra: number; sai: number; eyebrow?: string; antes?: { a: string; b: string };
      numero: { alvo: number; entra: number; casas?: number; prefixo?: string; sufixo?: string };
      apoio?: { texto: string; entra: number }; selo?: { texto: string; entra: number } }
  /** tela cheia com print REAL num card 3D, marca-texto e circulos a mao.
   *  Coordenadas de `marca` e `circulos` em pixels do arquivo original. */
  | { tipo: "print"; arquivo: string; larguraOriginal: number; entra: number; sai: number;
      largura?: number; top?: number; eyebrow?: string; titulo?: { a: string; b: string; entra: number };
      marca?: Retangulo & { entra: number }; circulos?: (Retangulo & { entra: number; alerta?: boolean })[];
      camera?: { entra: number; escala: number; focoX: number; focoY: number } }
  /** seletor segmentado acima da cabeca, que pula de um nivel para outro */
  | { tipo: "seletor"; niveis: string[]; de: number; para: number; entra: number; muda: number;
      sai: number; eyebrow?: string }
  /** CTA final: "Comenta X" no peito */
  | { tipo: "cta"; entra: number; chamada: string; palavra: string };

export type PropsFalando = {
  /** take final (ja emendado e sem respiro), relativo a `public/` */
  base: string;
  duracao: number;
  /** transcricao palavra por palavra do take FINAL */
  palavras: Palavra[];
  /** palavras que saem na cor de destaque (minusculo, sem pontuacao) */
  destaques: string[];
  /** pilha editorial: so em gancho ou frase de impacto */
  blocos: BlocoLegenda[];
  /** janelas em que a legenda some, porque a tela ja escreve o que se fala */
  semLegenda: Janela[];
  transicoes: Transicao[];
  /** push-in lento (teto de 6%) nas frases de impacto */
  zooms: Janela[];
  /** instantes de soco de camera (palavra gigante batendo) */
  socos: number[];
  /** selo fixo de CTA de comentario, que entra cedo */
  chip?: Janela & { palavra: string; complemento: string };
  elementos: Elemento[];
  /** lista de efeitos [segundo, nome]. Quem le e o `esteira/mixar.py`. */
  sfx: [number, string][];
  /** "curta": palavra por vez com destaque e desfoque · "padrao": LegendaPadrao */
  legenda?: "curta" | "padrao";
  cores?: Partial<Cores>;
};

// ---------------------------------------------------------------- utilitarios
const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const lin = (t: number, a: number, b: number, de = 0, ate = 1) =>
  interpolate(t, [a, b], [de, ate], cl);
const suave = (t: number, a: number, b: number) =>
  interpolate(t, [a, b], [0, 1], { ...cl, easing: Easing.bezier(0.22, 1, 0.36, 1) });

/** mola a partir de um instante em segundos. Criticamente amortecida por
 *  padrao: chega e para. */
const useMola = (inicio: number, cfg = { damping: 18, mass: 0.6, stiffness: 150 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - Math.round(inicio * fps), fps, config: cfg });
};

const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};

/** mola sem hook (pra usar depois de retorno condicional) */
const molaSemHook = (t: number, entra: number) => {
  const d = Math.max(0, t - entra);
  // resposta de 2a ordem amortecida, ~0,45s pra assentar, leve estalo
  return 1 - Math.exp(-9 * d) * Math.cos(7 * d);
};

const EYEBROW_FONTE = '"SF Pro Text", "Helvetica Neue", Arial, sans-serif';

// ---------------------------------------------------------------- pecas visuais

/** Fundo escuro com duas manchas de luz andando devagar. Nunca chapado: cor
 *  chapada em tela cheia le como slide. */
const FundoTela: React.FC = () => {
  const t = useT();
  const c = useCores();
  const x1 = 70 + 12 * Math.sin(t * 0.35);
  const y1 = 8 + 6 * Math.cos(t * 0.28);
  const x2 = 20 + 10 * Math.cos(t * 0.22);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(70% 45% at ${x1}% ${y1}%, ${c.brilho} 0%, transparent 70%),
                     radial-gradient(60% 40% at ${x2}% 96%, ${c.brilho}8C 0%, transparent 70%),
                     linear-gradient(180deg, ${c.fundo2} 0%, ${c.fundo} 100%)`,
      }}
    />
  );
};

/** Eyebrow: caixa alta espacada, cor apagada, tracinho na cor de destaque. */
const Eyebrow: React.FC<{ texto: string; top: number; entra: number; cor?: string; traco?: string }> = ({
  texto, top, entra, cor, traco,
}) => {
  const t = useT();
  const c = useCores();
  const v = suave(t, entra, entra + 0.35);
  return (
    <div
      style={{
        position: "absolute", left: 0, right: 0, top,
        display: "flex", justifyContent: "center", alignItems: "center", gap: 18,
        opacity: v, transform: `translateY(${(1 - v) * 14}px)`,
      }}
    >
      <div style={{ width: 46 * v, height: 3, background: traco ?? c.destaque, borderRadius: 2 }} />
      <span
        style={{
          fontFamily: EYEBROW_FONTE, fontWeight: 600, fontSize: 28, letterSpacing: "0.26em",
          color: cor ?? c.apagado, textTransform: "uppercase", whiteSpace: "nowrap",
        }}
      >
        {texto}
      </span>
    </div>
  );
};

/** Titulo em duas pecas: sans pesada branca + italico na cor de destaque. */
const Titulo: React.FC<{
  a: string; b: string; top: number; entra: number; sai?: number; corpo?: number;
}> = ({ a, b, top, entra, sai = 9999, corpo = 104 }) => {
  const t = useT();
  const cores = useCores();
  const c = conjunto(CONJUNTO_PADRAO);
  const va = suave(t, entra, entra + 0.32);
  const vb = suave(t, entra + 0.14, entra + 0.46);
  const fora = suave(t, sai - 0.25, sai);
  const peca = (v: number): React.CSSProperties => ({
    display: "inline-block",
    opacity: v * (1 - fora),
    transform: `translateY(${(1 - v) * 40 - fora * 30}px)`,
    filter: `blur(${(1 - v) * 10 + fora * 8}px)`,
  });
  return (
    <div
      style={{
        position: "absolute", left: 104, right: 104, top,
        display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
        pointerEvents: "none", textShadow: SOMBRA_TXT,
      }}
    >
      <span
        style={{
          ...peca(va), fontFamily: c.sans, fontWeight: 800, fontSize: corpo,
          letterSpacing: "-0.04em", lineHeight: 0.95, color: "#FFFFFF", whiteSpace: "nowrap",
        }}
      >
        {a}
      </span>
      <span
        style={{
          ...peca(vb), fontFamily: c.serif, fontStyle: "italic", fontSize: corpo * 1.02,
          lineHeight: 1.05, color: cores.destaque, whiteSpace: "nowrap",
        }}
      >
        {b}
      </span>
    </div>
  );
};

/** Circulo desenhado a mao, traco que se completa. */
const CirculoMao: React.FC<{ x: number; y: number; w: number; h: number; entra: number; cor?: string; espessura?: number }> = ({
  x, y, w, h, entra, cor, espessura = 7,
}) => {
  const t = useT();
  const c = useCores();
  const p = suave(t, entra, entra + 0.42);
  if (t < entra) return null;
  // elipse levemente torta e que passa do ponto inicial, como mao de verdade
  const rx = w / 2, ry = h / 2, cx = w / 2 + 10, cy = h / 2 + 10;
  const d = `M ${cx - rx * 0.2} ${cy - ry * 1.02}
             C ${cx + rx * 0.75} ${cy - ry * 1.08}, ${cx + rx * 1.06} ${cy - ry * 0.35}, ${cx + rx * 1.0} ${cy + ry * 0.12}
             C ${cx + rx * 0.95} ${cy + ry * 0.9}, ${cx + rx * 0.2} ${cy + ry * 1.08}, ${cx - rx * 0.35} ${cy + ry * 1.0}
             C ${cx - rx * 1.05} ${cy + ry * 0.85}, ${cx - rx * 1.08} ${cy - ry * 0.25}, ${cx - rx * 0.78} ${cy - ry * 0.72}
             C ${cx - rx * 0.5} ${cy - ry * 1.05}, ${cx + rx * 0.1} ${cy - ry * 1.12}, ${cx + rx * 0.42} ${cy - ry * 0.98}`;
  const L = 2 * Math.PI * Math.max(rx, ry) * 1.25;
  return (
    <svg
      width={w + 20} height={h + 20}
      style={{ position: "absolute", left: x - 10, top: y - 10, overflow: "visible", pointerEvents: "none" }}
    >
      <path
        d={d} fill="none" stroke={cor ?? c.destaque} strokeWidth={espessura} strokeLinecap="round"
        strokeDasharray={L} strokeDashoffset={L * (1 - p)}
        style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,.35))" }}
      />
    </svg>
  );
};

/** Numero que conta ate o alvo. Virgula decimal (pt-BR). */
const Contador: React.FC<{ alvo: number; entra: number; casas?: number; sufixo?: string; prefixo?: string; style: React.CSSProperties }> = ({
  alvo, entra, casas = 0, sufixo = "", prefixo = "", style,
}) => {
  const t = useT();
  const p = suave(t, entra, entra + 0.5);
  const v = (alvo * p).toFixed(casas).replace(".", ",");
  return <span style={style}>{prefixo}{v}{sufixo}</span>;
};

/** Card de print REAL, entrando com mola e rotacao 3D. */
const CardPrint: React.FC<{
  src: string; largura: number; entra: number; sai?: number; children?: React.ReactNode;
  camera?: { escala: number; focoX: number; focoY: number };
}> = ({ src, largura, entra, sai = 9999, children, camera }) => {
  const t = useT();
  const m = useMola(entra, { damping: 15, mass: 0.7, stiffness: 120 });
  const fora = suave(t, sai - 0.3, sai);
  const rotX = (1 - m) * 38;
  const rotZ = (1 - m) * -7;
  const y = (1 - m) * 520 - fora * 220;
  const esc = camera?.escala ?? 1;
  return (
    <div style={{ perspective: 1800, width: largura, position: "relative" }}>
      <div
        style={{
          transform: `translateY(${y}px) rotateX(${rotX}deg) rotateZ(${rotZ}deg)`,
          transformOrigin: "50% 100%",
          opacity: Math.min(1, m * 1.6) * (1 - fora),
          filter: `blur(${fora * 12}px)`,
          borderRadius: 26,
          overflow: "hidden",
          boxShadow: "0 40px 90px rgba(0,0,0,.55), 0 0 0 2px rgba(255,255,255,.08)",
          background: "#FFFFFF",
        }}
      >
        <div
          style={{
            transform: `scale(${esc})`,
            transformOrigin: `${camera?.focoX ?? 50}% ${camera?.focoY ?? 50}%`,
            position: "relative",
          }}
        >
          <Img src={staticFile(src)} style={{ width: largura, display: "block" }} />
          {children}
        </div>
      </div>
    </div>
  );
};

/** Pilula tipo card de UI: cor de destaque com texto escuro, ou card escuro. */
const Pilula: React.FC<{ texto: string; entra: number; destaque?: boolean; de?: "esq" | "dir" | "baixo"; corpo?: number; giro?: number }> = ({
  texto, entra, destaque = false, de = "baixo", corpo = 50, giro = 0,
}) => {
  const t = useT();
  const cores = useCores();
  const m = useMola(entra, { damping: 12, mass: 0.55, stiffness: 170 });
  if (t < entra) return null;
  const dx = de === "esq" ? -600 : de === "dir" ? 600 : 0;
  const dy = de === "baixo" ? 160 : 0;
  const c = conjunto(CONJUNTO_PADRAO);
  return (
    <div
      style={{
        display: "inline-flex", alignItems: "center",
        padding: `${corpo * 0.36}px ${corpo * 0.6}px`, borderRadius: corpo * 0.36,
        background: destaque ? cores.destaque : cores.card,
        border: destaque ? "none" : "2px solid rgba(255,255,255,.10)",
        color: destaque ? cores.fundo : "#FFFFFF",
        fontFamily: c.sans, fontWeight: 800, fontSize: corpo, letterSpacing: "-0.03em",
        whiteSpace: "nowrap",
        boxShadow: "0 18px 40px rgba(0,0,0,.45)",
        transform: `translate(${(1 - m) * dx}px, ${(1 - m) * dy}px) rotate(${(1 - m) * (de === "esq" ? -24 : 24) + giro}deg) scale(${0.6 + 0.4 * m})`,
        opacity: Math.min(1, m * 2),
      }}
    >
      {texto}
    </div>
  );
};

// ---------------------------------------------------------------- recorte da pessoa

/** Quadro da pessoa recortada, pra texto passar ATRAS dela. */
const RecortePessoa: React.FC<{ r: Recorte }> = ({ r }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const i = frame - Math.round(r.inicio * fps);
  if (i < 0 || i >= r.total) return null;
  const nome = String(i + 1).padStart(4, "0");
  return (
    <Img
      src={staticFile(`${r.pasta}/${nome}.${r.extensao ?? "png"}`)}
      style={{ position: "absolute", left: 0, top: 0, width, height }}
    />
  );
};

/** Palavra gigante que mora ATRAS da pessoa. */
const PalavraAtras: React.FC<{ texto: string; entra: number; sai: number; top: number; corpo: number; cor: string; italico?: boolean }> = ({
  texto, entra, sai, top, corpo, cor, italico = false,
}) => {
  const t = useT();
  const c = conjunto(CONJUNTO_PADRAO);
  if (t < entra - 0.05 || t > sai + 0.3) return null;
  const m = molaSemHook(t, entra);
  const fora = suave(t, sai, sai + 0.3);
  return (
    <div
      style={{
        position: "absolute", left: -200, right: -200, top,
        display: "flex", justifyContent: "center", pointerEvents: "none",
      }}
    >
      <span
        style={{
          fontFamily: italico ? c.serif : c.sans,
          fontStyle: italico ? "italic" : "normal",
          fontWeight: italico ? 400 : 800,
          fontSize: corpo,
          letterSpacing: italico ? "-0.01em" : "-0.055em",
          lineHeight: 0.8,
          color: cor,
          whiteSpace: "nowrap",
          opacity: Math.min(1, m * 1.5) * (1 - fora),
          transform: `scale(${1.35 - 0.35 * m + fora * 0.1})`,
          filter: `blur(${(1 - m) * 26 + fora * 16}px)`,
          textShadow: "0 10px 50px rgba(0,0,0,.25)",
        }}
      >
        {texto}
      </span>
    </div>
  );
};

// ---------------------------------------------------------------- elementos

type De<T extends Elemento["tipo"]> = Extract<Elemento, { tipo: T }>;

const ElTitulo: React.FC<{ e: De<"titulo"> }> = ({ e }) => {
  const t = useT();
  if (t < e.entra - 0.05 || t > e.sai + 0.1) return null;
  const top = e.top ?? 300;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {e.eyebrow && <Eyebrow texto={e.eyebrow} top={top - 64} entra={e.entra} />}
      <Titulo a={e.a} b={e.b} top={top} entra={e.entra} sai={e.sai} corpo={e.corpo} />
    </AbsoluteFill>
  );
};

const ElPilulas: React.FC<{ e: De<"pilulas"> }> = ({ e }) => {
  const t = useT();
  const primeiro = Math.min(...e.itens.map((i) => i.entra));
  if (t < primeiro - 0.1 || t > e.sai + 0.3) return null;
  const fora = suave(t, e.sai, e.sai + 0.3);
  const coluna = e.direcao === "coluna";
  return (
    <div
      style={{
        position: "absolute", left: 0, right: 0, top: e.top ?? 1200,
        display: "flex", flexDirection: coluna ? "column" : "row", justifyContent: "center",
        alignItems: "center", gap: coluna ? 16 : 18,
        opacity: 1 - fora, transform: `translateY(${fora * 40}px)`,
      }}
    >
      {e.itens.map((it, i) => (
        <Pilula
          key={i} texto={it.texto} entra={it.entra} destaque={it.destaque} de={it.de}
          corpo={e.corpo ?? 44} giro={i % 2 === 0 ? -3 : 3}
        />
      ))}
    </div>
  );
};

const ElNumero: React.FC<{ e: De<"numero"> }> = ({ e }) => {
  const t = useT();
  const cores = useCores();
  const c = conjunto(CONJUNTO_PADRAO);
  if (t < e.entra - 0.05 || t > e.sai + 0.3) return null;
  const m = molaSemHook(t, e.entra);
  const vApoio = suave(t, e.entra + 0.3, e.entra + 0.6);
  const fora = suave(t, e.sai - 0.1, e.sai + 0.25);
  return (
    <div
      style={{
        position: "absolute", left: 0, right: 0, top: e.top ?? 1120, display: "flex", flexDirection: "column",
        alignItems: "center", opacity: 1 - fora, pointerEvents: "none",
      }}
    >
      <Contador
        alvo={e.alvo} entra={e.entra} casas={e.casas} prefixo={e.prefixo} sufixo={e.sufixo}
        style={{
          fontFamily: c.sans, fontWeight: 800, fontSize: e.corpo ?? 200, letterSpacing: "-0.06em",
          lineHeight: 0.9, color: cores.destaque, textShadow: SOMBRA_TXT, display: "inline-block",
          transform: `scale(${0.6 + 0.4 * Math.min(1.1, m)})`,
        }}
      />
      {e.apoio && (
        <span
          style={{
            marginTop: 10, fontFamily: c.serif, fontStyle: "italic", fontSize: 96, color: "#FFFFFF",
            lineHeight: 1, textShadow: SOMBRA_TXT, opacity: vApoio, transform: `translateY(${(1 - vApoio) * 30}px)`,
          }}
        >
          {e.apoio}
        </span>
      )}
    </div>
  );
};

/** Tela chapada na cor de destaque: sobe como card, numero enorme, sai de lado. */
const ElTelaCor: React.FC<{ e: De<"telaCor"> }> = ({ e }) => {
  const t = useT();
  const cores = useCores();
  const c = conjunto(CONJUNTO_PADRAO);
  const { height } = useVideoConfig();
  if (t < e.entra || t > e.sai) return null;
  const ent = suave(t, e.entra, e.entra + 0.28);
  const sai = suave(t, e.sai - 0.28, e.sai);
  const y = (1 - ent) * height;
  const x = -sai * 1200;
  const vAntes = suave(t, e.entra + 0.12, e.entra + 0.45);
  const n = e.numero;
  const troca = e.antes ? suave(t, n.entra - 0.15, n.entra + 0.05) : 1;
  const mNum = molaSemHook(t, n.entra);
  const vApoio = e.apoio ? suave(t, e.apoio.entra, e.apoio.entra + 0.3) : 0;
  const vSelo = e.selo ? molaSemHook(t, e.selo.entra) : 0;
  const escuro = cores.fundo;
  return (
    <AbsoluteFill
      style={{
        background: cores.destaque,
        transform: `translate(${x}px, ${y}px) rotate(${-sai * 8}deg)`,
        borderRadius: (1 - ent) * 80 + sai * 80,
        filter: `blur(${sai * 14}px)`,
        overflow: "hidden",
      }}
    >
      {e.eyebrow && <Eyebrow texto={e.eyebrow} top={330} entra={e.entra + 0.1} cor={`${escuro}9E`} traco={escuro} />}
      {e.antes && (
        <div
          style={{
            position: "absolute", left: 104, right: 104, top: 480,
            display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
            opacity: vAntes * (1 - troca),
            transform: `translateY(${(1 - vAntes) * 60}px)`, filter: `blur(${(1 - vAntes) * 12}px)`,
            fontFamily: c.sans, fontWeight: 800, fontSize: 168, letterSpacing: "-0.055em",
            lineHeight: 0.92, color: escuro, whiteSpace: "nowrap",
          }}
        >
          <span>{e.antes.a}</span>
          <span style={{ fontFamily: c.serif, fontStyle: "italic", fontWeight: 400, letterSpacing: "-0.01em", fontSize: 176 }}>{e.antes.b}</span>
        </div>
      )}
      {t >= n.entra - 0.15 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 520, display: "flex", justifyContent: "center" }}>
          <Contador
            alvo={n.alvo} entra={n.entra} casas={n.casas} prefixo={n.prefixo} sufixo={n.sufixo}
            style={{
              fontFamily: c.sans, fontWeight: 800, fontSize: 380, letterSpacing: "-0.07em",
              lineHeight: 0.9, color: escuro, display: "inline-block",
              transform: `scale(${0.7 + 0.3 * mNum})`, opacity: troca,
            }}
          />
        </div>
      )}
      {e.apoio && (
        <div
          style={{
            position: "absolute", left: 0, right: 0, top: 890, textAlign: "center",
            opacity: vApoio, transform: `translateY(${(1 - vApoio) * 30}px)`,
            fontFamily: c.serif, fontStyle: "italic", fontSize: 128, color: escuro, lineHeight: 1,
          }}
        >
          {e.apoio.texto}
        </div>
      )}
      {e.selo && t >= e.selo.entra && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 1080, display: "flex", justifyContent: "center" }}>
          <div
            style={{
              padding: "18px 34px", borderRadius: 18, background: escuro, color: cores.destaque,
              fontFamily: c.sans, fontWeight: 800, fontSize: 52, letterSpacing: "-0.03em",
              transform: `scale(${0.6 + 0.4 * vSelo}) rotate(${(1 - vSelo) * 10 - 2}deg)`,
            }}
          >
            {e.selo.texto}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

/** Tela cheia com print real. A camera pode andar ate um trecho do print. */
const ElPrint: React.FC<{ e: De<"print"> }> = ({ e }) => {
  const t = useT();
  const cores = useCores();
  if (t < e.entra || t > e.sai) return null;
  const W = e.largura ?? 880;
  const s = W / e.larguraOriginal;
  const ent = suave(t, e.entra, e.entra + 0.3);
  const sai = suave(t, e.sai - 0.25, e.sai);
  const vMarca = e.marca ? suave(t, e.marca.entra, e.marca.entra + 0.3) : 0;
  const fc = e.camera ? suave(t, e.camera.entra - 0.1, e.camera.entra + 0.6) : 0;
  const camera = e.camera
    ? { escala: 1 + (e.camera.escala - 1) * fc, focoX: e.camera.focoX, focoY: interpolate(fc, [0, 1], [50, e.camera.focoY]) }
    : undefined;
  return (
    <AbsoluteFill
      style={{
        opacity: ent, transform: `scale(${1.08 - 0.08 * ent + sai * 0.1})`, filter: `blur(${(1 - ent) * 16 + sai * 18}px)`,
      }}
    >
      <FundoTela />
      {e.eyebrow && <Eyebrow texto={e.eyebrow} top={318} entra={e.entra + 0.1} />}
      {e.titulo && <Titulo a={e.titulo.a} b={e.titulo.b} top={380} entra={e.titulo.entra} corpo={92} />}
      <div style={{ position: "absolute", left: (1080 - W) / 2, top: e.top ?? 660 }}>
        <CardPrint src={e.arquivo} largura={W} entra={e.entra + 0.12} camera={camera}>
          {e.marca && (
            <div
              style={{
                position: "absolute", left: e.marca.x * s, top: e.marca.y * s, height: e.marca.h * s,
                width: e.marca.w * s * vMarca, background: `${cores.destaque}8C`, mixBlendMode: "multiply",
              }}
            />
          )}
          {(e.circulos ?? []).map((r, i) => (
            <CirculoMao
              key={i} x={r.x * s} y={r.y * s} w={r.w * s} h={r.h * s} entra={r.entra}
              cor={r.alerta ? "#E5484D" : cores.fundo} espessura={5}
            />
          ))}
        </CardPrint>
      </div>
    </AbsoluteFill>
  );
};

/** Seletor segmentado acima da cabeca. A pessoa continua no quadro. */
const ElSeletor: React.FC<{ e: De<"seletor"> }> = ({ e }) => {
  const t = useT();
  const cores = useCores();
  const c = conjunto(CONJUNTO_PADRAO);
  if (t < e.entra || t > e.sai + 0.3) return null;
  const fora = suave(t, e.sai - 0.2, e.sai + 0.2);
  const vSel = molaSemHook(t, e.muda);
  const mSel = molaSemHook(t, e.entra + 0.1);
  const pos = interpolate(Math.min(1, Math.max(0, t < e.muda ? 0 : vSel)), [0, 1], [e.de, e.para]);
  const W_SEL = 860, SEG = W_SEL / e.niveis.length;
  return (
    <AbsoluteFill style={{ opacity: 1 - fora, pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${cores.fundo}B8 0%, ${cores.fundo}59 22%, transparent 32%)` }} />
      {e.eyebrow && <Eyebrow texto={e.eyebrow} top={236} entra={e.entra + 0.1} cor="#E6E9F0" />}
      <div
        style={{
          position: "absolute", left: (1080 - W_SEL) / 2, top: 296, width: W_SEL, height: 92,
          borderRadius: 46, background: `${cores.card}EB`, border: "2px solid rgba(255,255,255,.10)",
          boxShadow: "0 18px 40px rgba(0,0,0,.4)",
          transform: `translateY(${(1 - Math.min(1, mSel)) * -60}px)`, opacity: Math.min(1, mSel * 1.5),
        }}
      >
        <div style={{ position: "absolute", top: 8, left: 8 + pos * SEG, width: SEG - 16, height: 76, borderRadius: 38, background: cores.destaque }} />
        {e.niveis.map((n, i) => (
          <div
            key={n}
            style={{
              position: "absolute", top: 0, left: i * SEG, width: SEG, height: 92,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: c.sans, fontWeight: 800, fontSize: 34, letterSpacing: "-0.02em",
              color: Math.abs(pos - i) < 0.5 ? cores.fundo : cores.apagado,
            }}
          >
            {n}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/** CTA final no peito, enquanto a palavra gigante mora atras da pessoa. */
const ElCta: React.FC<{ e: De<"cta"> }> = ({ e }) => {
  const t = useT();
  const cores = useCores();
  const c = conjunto(CONJUNTO_PADRAO);
  if (t < e.entra) return null;
  const m = molaSemHook(t, e.entra);
  return (
    <div
      style={{
        position: "absolute", left: 0, right: 0, top: 1205,
        display: "flex", flexDirection: "column", alignItems: "center",
        transform: `translateY(${(1 - Math.min(1, m)) * 120}px)`, opacity: Math.min(1, m * 1.6),
      }}
    >
      <span style={{ fontFamily: EYEBROW_FONTE, fontWeight: 600, fontSize: 28, letterSpacing: "0.26em", color: "#FFFFFF", opacity: 0.8, textShadow: SOMBRA_TXT, textTransform: "uppercase" }}>
        {e.chamada}
      </span>
      <span style={{ fontFamily: c.sans, fontWeight: 800, fontSize: 96, letterSpacing: "-0.045em", color: "#FFFFFF", lineHeight: 1, marginTop: 14, textShadow: SOMBRA_TXT }}>
        Comenta
      </span>
      <span style={{ fontFamily: c.serif, fontStyle: "italic", fontSize: 118, color: cores.destaque, lineHeight: 1, textShadow: SOMBRA_TXT }}>
        {e.palavra}
      </span>
    </div>
  );
};

/** Selo fixo com a palavra a comentar. Entra CEDO no video (CTA de comentario
 *  no fim sozinho converte muito menos). Mora em 0.855 da altura, acima da UI. */
const ChipComentario: React.FC<{ chip: NonNullable<PropsFalando["chip"]> }> = ({ chip }) => {
  const t = useT();
  const cores = useCores();
  const { height } = useVideoConfig();
  const c = conjunto(CONJUNTO_PADRAO);
  if (t < chip.entra || t > chip.sai) return null;
  const v = suave(t, chip.entra, chip.entra + 0.3) * (1 - suave(t, chip.sai - 0.25, chip.sai));
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: Math.round(height * 0.855), display: "flex", justifyContent: "center", opacity: v }}>
      <div
        style={{
          display: "flex", alignItems: "center", gap: 16, borderRadius: 999, padding: "16px 30px",
          background: `${cores.fundo}E0`, border: `2px solid ${cores.destaque}`, boxShadow: "0 10px 40px rgba(0,0,0,.5)",
          transform: `scale(${0.9 + 0.1 * v})`,
        }}
      >
        <span style={{ fontFamily: EYEBROW_FONTE, fontWeight: 600, fontSize: 26, letterSpacing: "0.22em", color: cores.apagado }}>
          COMENTE
        </span>
        <span style={{ fontFamily: c.sans, fontWeight: 800, fontSize: 46, letterSpacing: "-0.03em", color: cores.destaque }}>
          {chip.palavra}
        </span>
        <span style={{ fontFamily: c.serif, fontStyle: "italic", fontSize: 34, color: "#FFFFFF" }}>
          {chip.complemento}
        </span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- legenda curta

const limpa = (s: string) => s.toLowerCase().replace(/[.,!?;:…]/g, "");

/** Uma palavra por vez, sans branca; as palavras-chave saem na cor de
 *  destaque. Entrada com desfoque. */
const LegendaCurta: React.FC<{ palavras: Palavra[]; destaques: string[] }> = ({ palavras, destaques }) => {
  const t = useT();
  const cores = useCores();
  const { height } = useVideoConfig();
  const c = conjunto(CONJUNTO_PADRAO);
  const itens = React.useMemo(() => {
    const out: Palavra[] = [];
    for (let i = 0; i < palavras.length; i++) {
      const p = palavras[i], q = palavras[i + 1];
      // palavra de ate 2 letras gruda na seguinte, senao fica orfa
      if (limpa(p.texto).length <= 2 && q && q.inicio - p.fim < 0.3) {
        out.push({ texto: `${p.texto} ${q.texto}`, inicio: p.inicio, fim: q.fim });
        i++;
      } else out.push(p);
    }
    return out;
  }, [palavras]);
  const p = itens.find((w) => t >= w.inicio && t <= w.fim + 0.06);
  if (!p) return null;
  const ent = suave(t, p.inicio, p.inicio + 0.12);
  const destaque = p.texto.split(" ").some((w) => destaques.includes(limpa(w)));
  const corpo = Math.round(height * 0.047 * Math.max(0.66, Math.min(1, 16 / p.texto.length)));
  return (
    <div
      style={{
        position: "absolute", left: 0, right: 0, top: Math.round(height * 0.715),
        transform: "translateY(-50%)", display: "flex", justifyContent: "center", pointerEvents: "none",
      }}
    >
      <span
        style={{
          fontFamily: c.sans, fontWeight: 800, fontSize: corpo, letterSpacing: "-0.035em",
          color: destaque ? cores.destaque : "#FFFFFF", textShadow: SOMBRA_TXT, whiteSpace: "nowrap",
          opacity: ent, display: "inline-block",
          transform: `translateY(${(1 - ent) * 12}px) scale(${0.86 + 0.14 * ent})`,
          filter: `blur(${(1 - ent) * 6}px)`,
        }}
      >
        {p.texto}
      </span>
    </div>
  );
};

// ---------------------------------------------------------------- transicoes

/** Clarao BRANCO curto. Pico no instante da junta. */
const Clarao: React.FC<{ transicoes: Transicao[] }> = ({ transicoes }) => {
  const t = useT();
  let a = 0;
  for (const tr of transicoes) {
    if (tr.tipo !== "flash") continue;
    const d = t - tr.t;
    // sobe rapido (0,06s) e cai devagar (0,3s): e o que le como clarao de camera
    if (d > -0.06 && d < 0.3) a = Math.max(a, d < 0 ? 1 + d / 0.06 : Math.pow(1 - d / 0.3, 1.6));
  }
  if (a <= 0.01) return null;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(120% 80% at 50% 45%, rgba(255,255,255,${a}) 0%, rgba(255,250,235,${a * 0.9}) 45%, rgba(255,240,210,${a * 0.6}) 100%)`,
        pointerEvents: "none",
      }}
    />
  );
};

/** desfoque + empurrao no proprio quadro, pico exatamente no frame da junta.
 *  E o que esconde o pulo de imagem nas emendas que ficam expostas. */
const useDesfoqueJunta = (transicoes: Transicao[]) => {
  const t = useT();
  let blur = 0, esc = 1;
  for (const tr of transicoes) {
    const meia = tr.tipo === "flash" ? 0.18 : 0.25;
    const d = Math.abs(t - tr.t);
    if (d >= meia) continue;
    const p = Math.sin((Math.PI / 2) * (1 - d / meia));
    blur = Math.max(blur, (tr.tipo === "flash" ? 12 : 20) * p);
    esc = Math.max(esc, 1 + 0.06 * p);
  }
  return { blur, esc };
};

// ---------------------------------------------------------------- composicao

const TELA_CHEIA = new Set(["telaCor", "print"]);

export const FalandoComOverlay: React.FC<PropsFalando> = (props) => {
  const { base, palavras, destaques, blocos, semLegenda, transicoes, zooms, socos, chip, elementos } = props;
  const cores: Cores = { ...CORES_PADRAO, ...props.cores };
  const { width, height } = useVideoConfig();
  const t = useT();
  const { blur, esc } = useDesfoqueJunta(transicoes);

  // push-in lento nas frases de impacto (teto 6%)
  let zoomLento = 1;
  for (const z of zooms) if (t >= z.entra && t <= z.sai) zoomLento = lin(t, z.entra, z.sai, 1, 1.06);
  // soco de camera quando a palavra gigante bate
  let soco = 1;
  for (const at of socos) {
    const d = t - at;
    if (d >= 0 && d < 0.5) soco *= 1 + 0.07 * Math.exp(-7 * d);
  }
  const camera = esc * zoomLento * soco;

  const atras = elementos.filter((e): e is De<"palavraAtras"> => e.tipo === "palavraAtras");
  const cheias = elementos.filter((e) => TELA_CHEIA.has(e.tipo));
  const frente = elementos.filter((e) => e.tipo !== "palavraAtras" && !TELA_CHEIA.has(e.tipo));
  const mudo = semLegenda.some((j) => t >= j.entra && t <= j.sai);

  const desenha = (e: Elemento, i: number) => {
    switch (e.tipo) {
      case "titulo": return <ElTitulo key={i} e={e} />;
      case "pilulas": return <ElPilulas key={i} e={e} />;
      case "numero": return <ElNumero key={i} e={e} />;
      case "telaCor": return <ElTelaCor key={i} e={e} />;
      case "print": return <ElPrint key={i} e={e} />;
      case "seletor": return <ElSeletor key={i} e={e} />;
      case "cta": return <ElCta key={i} e={e} />;
      default: return null;
    }
  };

  return (
    <CoresCtx.Provider value={cores}>
      <AbsoluteFill style={{ backgroundColor: cores.fundo }}>
        {/* CAMADA DE IMAGEM: take + palavra atras + recorte da pessoa. Tudo sob o
            mesmo transform, senao o recorte desgruda do take no zoom. */}
        <AbsoluteFill
          style={{
            transform: `scale(${camera})`, transformOrigin: "50% 40%",
            filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : undefined,
          }}
        >
          <OffthreadVideo src={staticFile(base)} muted style={{ width, height }} />
          {atras.map((e, i) => (
            <React.Fragment key={i}>
              <PalavraAtras
                texto={e.texto} entra={e.entra} sai={e.sai} top={e.top ?? 330} corpo={e.corpo ?? 330}
                cor={e.destaque ? cores.destaque : "#FFFFFF"} italico={e.italico}
              />
              {e.recorte && <RecortePessoa r={e.recorte} />}
            </React.Fragment>
          ))}
        </AbsoluteFill>

        {/* telas cheias: cada uma cobre as juntas que caem dentro dela */}
        {cheias.map(desenha)}
        {frente.map(desenha)}

        <Audio src={staticFile(base)} />

        {!mudo && (props.legenda === "padrao"
          ? <LegendaPadrao palavras={palavras} />
          : <LegendaCurta palavras={palavras} destaques={destaques} />)}
        <LegendaEditorial blocos={blocos} fonte={CONJUNTO_PADRAO} ancora={0.6} alinhamento="centro" cor={cores.destaque} />
        {chip && <ChipComentario chip={chip} />}
        <Clarao transicoes={transicoes} />
      </AbsoluteFill>
    </CoresCtx.Provider>
  );
};
