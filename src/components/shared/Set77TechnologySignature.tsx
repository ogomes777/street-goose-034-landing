import { useEffect, useRef } from "react";

/* Assinatura "TECHNOLOGY BY" + logo 777/SET77 volumétrica — contraparte React
   do mesmo sistema .set77-sig compartilhado em styles.css e acionado por
   js/set77-signature.js (mesmo padrão de InteractionHint.tsx: classes
   globais, sem CSS Module próprio, reaproveitadas tanto pelas seções vanilla
   da landing quanto por este hero React). O driver de pointer/scroll/idle é
   único para o site inteiro (um só requestAnimationFrame, um só
   IntersectionObserver) — este componente só registra sua própria raiz nele
   via window.SG.mountSet77Signature.

   js/set77-signature.js é importado tarde na cadeia de bootstrap (import()
   sequencial em main.tsx), então pode ainda não existir quando este efeito
   roda pela primeira vez — window.__set77PendingSignatures enfileira a raiz
   pra ele processar assim que carregar (mesmo padrão de fila usado em
   js/intro-loader.js/js/music-player.js pra corridas equivalentes). */

type LegacyWindow = Window & {
  SG?: { mountSet77Signature?: (root: HTMLElement) => void };
  __set77PendingSignatures?: HTMLElement[];
};

export type Set77TechnologySignatureProps = {
  corner?: "tl" | "tr" | "bl" | "br";
  className?: string;
};

export function Set77TechnologySignature({ corner = "bl", className }: Set77TechnologySignatureProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const legacy = window as LegacyWindow;
    if (legacy.SG?.mountSet77Signature) {
      legacy.SG.mountSet77Signature(el);
    } else {
      legacy.__set77PendingSignatures = legacy.__set77PendingSignatures || [];
      legacy.__set77PendingSignatures.push(el);
    }
  }, []);

  return (
    <div
      ref={rootRef}
      className={"set77-sig" + (className ? " " + className : "")}
      data-set77-sig
      data-corner={corner}
      aria-hidden="true"
    >
      <span className="set77-sig-label">Technology by</span>
      <div className="set77-sig-stage">
        <div className="set77-sig-float">
          <div className="set77-sig-glow" />
          <div className="set77-sig-particles">
            <span className="set77-sig-particle" style={{ "--d": "-20px" } as never} />
            <span className="set77-sig-particle" style={{ "--d": "12px" } as never} />
            <span className="set77-sig-particle" style={{ "--d": "-8px" } as never} />
          </div>
          <div className="set77-sig-tilt">
            <div className="set77-sig-spinner">
              <div className="set77-sig-face set77-sig-face--back" />
              <div className="set77-sig-face set77-sig-face--mid1" />
              <div className="set77-sig-face set77-sig-face--mid2" />
              <div className="set77-sig-face set77-sig-face--mid3" />
              <div className="set77-sig-face set77-sig-face--front" />
              <div className="set77-sig-face set77-sig-face--rear" />
              <div className="set77-sig-specular" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
