import { loadFont as inter } from "@remotion/google-fonts/Inter";
import { loadFont as archivo } from "@remotion/google-fonts/Archivo";
import { loadFont as manrope } from "@remotion/google-fonts/Manrope";
import { loadFont as bricolage } from "@remotion/google-fonts/BricolageGrotesque";
import { loadFont as instrument } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as dmserif } from "@remotion/google-fonts/DMSerifDisplay";
import { loadFont as fraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as lora } from "@remotion/google-fonts/Lora";

/**
 * Conjuntos de fonte pra escolha. Cada um traz a sans que carrega a legenda
 * normal e a pilha, mais a serifada italica que faz o remate do bloco
 * editorial. Todas sao Google Fonts (licenca OFL), carregadas pelo pacote
 * `@remotion/google-fonts`: nenhum arquivo de fonte vai no repositorio.
 *
 * Os pesos e subsets vao explicitos: no default o Remotion dispara mais de
 * 120 requests por familia e o bundle arrasta.
 */

export type Conjunto = {
  nome: string;
  sans: string;
  serif: string;
  /** tracking da legenda normal. Negativo aperta e da o ar minimalista. */
  tracking: number;
  pesoSans: number;
};

const CONJUNTOS: Conjunto[] = [
  {
    nome: "A · Inter + Instrument Serif",
    sans: inter("normal", { weights: ["700", "900"], subsets: ["latin", "latin-ext"], ignoreTooManyRequestsWarning: true }).fontFamily,
    serif: instrument("italic", { weights: ["400"], subsets: ["latin", "latin-ext"], ignoreTooManyRequestsWarning: true }).fontFamily,
    tracking: -0.035,
    pesoSans: 900,
  },
  {
    nome: "B · Archivo + DM Serif",
    sans: archivo("normal", { weights: ["700", "800"], subsets: ["latin", "latin-ext"], ignoreTooManyRequestsWarning: true }).fontFamily,
    serif: dmserif("italic", { weights: ["400"], subsets: ["latin", "latin-ext"], ignoreTooManyRequestsWarning: true }).fontFamily,
    tracking: -0.03,
    pesoSans: 800,
  },
  {
    nome: "C · Manrope + Fraunces",
    sans: manrope("normal", { weights: ["700", "800"], subsets: ["latin", "latin-ext"], ignoreTooManyRequestsWarning: true }).fontFamily,
    serif: fraunces("italic", { weights: ["400"], subsets: ["latin", "latin-ext"], ignoreTooManyRequestsWarning: true }).fontFamily,
    tracking: -0.04,
    pesoSans: 800,
  },
  {
    nome: "D · Bricolage + Lora",
    sans: bricolage("normal", { weights: ["700", "800"], subsets: ["latin", "latin-ext"], ignoreTooManyRequestsWarning: true }).fontFamily,
    serif: lora("italic", { weights: ["400"], subsets: ["latin", "latin-ext"], ignoreTooManyRequestsWarning: true }).fontFamily,
    tracking: -0.03,
    pesoSans: 800,
  },
];

/** Conjunto usado quando ninguem escolhe outro: B, Archivo + DM Serif. */
export const CONJUNTO_PADRAO = 1;
/** Cor do remate da pilha editorial, quando a composicao nao passa outra. */
export const COR_REMATE = "#E8CC1A";

export const conjunto = (i: number): Conjunto =>
  CONJUNTOS[Math.max(0, Math.min(CONJUNTOS.length - 1, i))];
export const quantosConjuntos = CONJUNTOS.length;
