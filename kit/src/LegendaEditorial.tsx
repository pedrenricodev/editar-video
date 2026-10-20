import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { conjunto, CONJUNTO_PADRAO, COR_REMATE } from "./fontes";

/**
 * Regime PONTUAL: a pilha editorial.
 * Entra so em gancho ou frase de impacto. O resto do video usa a
 * `LegendaPadrao` (uma palavra, linha unica, branca).
 *
 * Duas coisas definem o estilo:
 * 1. o bloco se CONSTROI: cada linha entra quando e' falada, as anteriores
 *    ficam na tela, e o bloco zera junto.
 * 2. a linha e' um SINTAGMA, nao uma palavra ("usar" / "filtros" / "de
 *    capcut"). Quebrar por contagem produz pilha de preposicao
 *    e a peca vira legenda automatica de app.
 *
 * v5: as linhas passaram a compartilhar a MESMA margem de inicio. O
 * escalonamento diagonal deixava a pilha sem eixo.
 */

export type Peso = "pequena" | "grande" | "remate";
export type LinhaLegenda = { texto: string; inicio: number; peso: Peso };
export type BlocoLegenda = { linhas: LinhaLegenda[]; fim: number };

/** fracao da altura, por peso */
const CORPO: Record<Peso, number> = { pequena: 0.042, grande: 0.086, remate: 0.062 };
/** caracteres que cabem na largura util antes de encolher */
const CABE: Record<Peso, number> = { pequena: 26, grande: 11, remate: 16 };

/** sombra suave: da leitura sobre fundo sujo sem o peso da sombra
 *  solida, que fica dura demais */
const SOMBRA = "0 3px 14px rgba(0,0,0,.5), 0 0 2px rgba(0,0,0,.45)";

export const LegendaEditorial: React.FC<{
  blocos: BlocoLegenda[];
  fonte?: number;
  /** centro vertical da pilha, fracao da altura. A pilha tem ~365px de alto,
   *  entao 0.62 mantem o remate acima de y 1470, o fim da safe zone medida. */
  ancora?: number;
  /** eixo horizontal. "esquerda" usa `margem`; "centro" centraliza a pilha. */
  alinhamento?: "esquerda" | "centro";
  /** margem lateral, fracao da largura. So vale no alinhamento a esquerda. */
  margem?: number;
  cor?: string;
}> = ({
  blocos,
  fonte = CONJUNTO_PADRAO,
  ancora = 0.62,
  alinhamento = "esquerda",
  margem = 0.08,
  cor = COR_REMATE,
}) => {
  const frame = useCurrentFrame();
  const { fps, height, width } = useVideoConfig();
  const t = frame / fps;
  const c = conjunto(fonte);

  const bloco = blocos.find(
    (b) => t >= b.linhas[0].inicio && t <= b.fim + 0.12,
  );
  if (!bloco) return null;

  const sai = interpolate(t, [bloco.fim, bloco.fim + 0.14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const aoCentro = alinhamento === "centro";

  return (
    <div
      style={{
        position: "absolute",
        left: aoCentro ? 0 : Math.round(width * margem),
        right: aoCentro ? 0 : Math.round(width * margem),
        top: Math.round(height * ancora),
        transform: "translateY(-50%)",
        display: "flex",
        flexDirection: "column",
        // todas as linhas partem do mesmo eixo: e' isso que faz a pilha ler
        // como bloco, e nao como tres legendas soltas
        alignItems: aoCentro ? "center" : "flex-start",
        textAlign: aoCentro ? "center" : "left",
        opacity: 1 - sai,
        pointerEvents: "none",
      }}
    >
      {bloco.linhas.map((l, i) => {
        if (t < l.inicio) return null;
        const remate = l.peso === "remate";

        const encolhe = Math.min(1, CABE[l.peso] / Math.max(1, l.texto.length));
        const corpo = Math.round(
          height * CORPO[l.peso] * Math.max(0.62, encolhe),
        );

        const ent = interpolate(t, [l.inicio, l.inicio + 0.1], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        return (
          <span
            key={i}
            style={{
              fontFamily: remate ? c.serif : c.sans,
              fontStyle: remate ? "italic" : "normal",
              fontWeight: remate ? 400 : c.pesoSans,
              fontSize: corpo,
              letterSpacing: remate ? "0em" : `${c.tracking}em`,
              lineHeight: remate ? 1.06 : 0.96,
              color: remate ? cor : "#FFFFFF",
              textShadow: SOMBRA,
              whiteSpace: "nowrap",
              opacity: ent,
              transform: `translateY(${(1 - ent) * 12}px) scale(${0.95 + ent * 0.05})`,
              transformOrigin: aoCentro ? "center bottom" : "left bottom",
              display: "inline-block",
            }}
          >
            {l.texto}
          </span>
        );
      })}
    </div>
  );
};
