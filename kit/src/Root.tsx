import React from "react";
import { Composition } from "remotion";
import { FalandoComOverlay } from "./FalandoComOverlay";
import type { PropsFalando } from "./FalandoComOverlay";
import exemplo from "../exemplo/props.json";

const FPS = 30;

/**
 * Uma composicao so. O props de exemplo usa um take sintetico (cor solida +
 * tom), gerado por `exemplo/gerar_exemplo.sh`. Para o seu take, gere o props
 * com `esteira/montar_props.py` e passe com `--props=public/props.json`.
 */
export const Root: React.FC = () => (
  <Composition
    id="FalandoComOverlay"
    component={FalandoComOverlay}
    width={1080}
    height={1920}
    fps={FPS}
    durationInFrames={FPS * 10}
    defaultProps={exemplo as unknown as PropsFalando}
    calculateMetadata={async ({ props }) => ({
      durationInFrames: Math.ceil(props.duracao * FPS),
    })}
  />
);
