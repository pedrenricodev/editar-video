import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { conjunto, CONJUNTO_PADRAO } from "./fontes";
import type { Palavra } from "./tipos";

/**
 * Regime PADRAO da edicao: uma palavra por vez, linha unica, branca.
 * Minimalista de proposito. A pilha editorial (`LegendaEditorial`) e' cara e
 * so entra em gancho ou frase de impacto; se ela aparecer o video inteiro,
 * para de ser destaque.
 *
 * Palavra de ate 2 letras nao aguenta a tela sozinha ("e", "é", "a"), entao
 * gruda na seguinte com espaco apertado.
 */
const SOMBRA = "0 2px 10px rgba(0,0,0,.45), 0 0 1px rgba(0,0,0,.5)";

const juntarCurtas = (palavras: Palavra[]): Palavra[] => {
  const saida: Palavra[] = [];
  for (let i = 0; i < palavras.length; i++) {
    const p = palavras[i];
    const proxima = palavras[i + 1];
    if (p.texto.replace(/[.,!?;:]/g, "").length <= 2 && proxima) {
      saida.push({
        texto: `${p.texto} ${proxima.texto}`,
        inicio: p.inicio,
        fim: proxima.fim,
      });
      i++;
    } else {
      saida.push(p);
    }
  }
  return saida;
};

export const LegendaPadrao: React.FC<{
  palavras: Palavra[];
  fonte?: number;
  /** centro vertical, fracao da altura. Teto: a safe zone do Reels
   *  vai de y 300 a 1470, e 0.78 jogava a linha pra 1498, debaixo da
   *  UI do Instagram. */
  ancora?: number;
  /** corpo da fonte como fracao da ALTURA do quadro. */
  corpo?: number;
}> = ({ palavras, fonte = CONJUNTO_PADRAO, ancora = 0.73, corpo: fracao = 0.052 }) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const t = frame / fps;
  const c = conjunto(fonte);

  const itens = React.useMemo(() => juntarCurtas(palavras), [palavras]);
  const p = itens.find((w) => t >= w.inicio && t <= w.fim + 0.05);
  if (!p) return null;

  // 20 caracteres e o que cabe na largura util nesse corpo; passou, encolhe
  const corpo = Math.round(
    height * fracao * Math.max(0.66, Math.min(1, 20 / p.texto.length)),
  );

  // efeito contido: sobe, ganha nitidez e assenta. Sem giro nem estouro, que
  // e' o que faz legenda de app parecer amadora.
  const ent = interpolate(t, [p.inicio, p.inicio + 0.11], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const sai = interpolate(t, [p.fim - 0.05, p.fim + 0.05], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: Math.round(height * ancora),
        transform: "translateY(-50%)",
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <span
        style={{
          fontFamily: c.sans,
          fontWeight: c.pesoSans,
          fontSize: corpo,
          letterSpacing: `${c.tracking}em`,
          color: "#FFFFFF",
          textShadow: SOMBRA,
          whiteSpace: "nowrap",
          opacity: ent * (1 - sai),
          transform: `translateY(${(1 - ent) * 10}px) scale(${0.9 + ent * 0.1})`,
          filter: `blur(${(1 - ent) * 3}px)`,
          display: "inline-block",
          willChange: "transform, opacity, filter",
        }}
      >
        {p.texto}
      </span>
    </div>
  );
};
