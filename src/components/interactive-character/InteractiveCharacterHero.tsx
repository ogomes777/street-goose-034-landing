import { useRef } from "react";
import { usePointerParallax } from "../../hooks/usePointerParallax";
import { AtmosphericFX } from "./AtmosphericFX";
import { CharacterScene } from "./CharacterScene";
import "./interactive-character-hero.css";

export function InteractiveCharacterHero() {
  const heroRef = useRef<HTMLElement>(null);
  usePointerParallax(heroRef);

  return (
    <section
      ref={heroRef}
      className="sg-character-hero"
      aria-labelledby="sg-character-title"
      data-character-hero
    >
      <div className="sg-character-hero__sticky">
        <div className="sg-character-hero__backdrop" aria-hidden="true" />
        <div className="sg-character-hero__cursor-light" aria-hidden="true" />
        <div className="sg-character-hero__watermark" aria-hidden="true">
          <span>VISION</span>
          <b>034</b>
        </div>

        <AtmosphericFX depth="rear" />
        <CharacterScene />
        <AtmosphericFX depth="front" />

        <div className="sg-character-hero__copy">
          <p className="sg-character-hero__kicker">
            <span>SG / 034</span>
            <i />
            PRESENCE SYSTEM
          </p>
          <h1 id="sg-character-title">
            Visão em
            <br />
            movimento.
          </h1>
          <p className="sg-character-hero__lead">
            A lente percebe. A presença responde.
          </p>
        </div>

        <div className="sg-character-hero__interaction" aria-hidden="true">
          <span className="sg-character-hero__interaction-dot" />
          <span className="sg-character-hero__interaction-line" />
          <p>
            MOVA O CURSOR
            <small>PARA MUDAR O ENQUADRAMENTO</small>
          </p>
        </div>

        <div className="sg-character-hero__meta" aria-hidden="true">
          <span>CHROME / OPTICAL</span>
          <span>ARAXÁ — MG</span>
        </div>

        <a className="sg-character-hero__scroll" href="#manifesto" aria-label="Ir para o manifesto">
          <span />
          CONTINUAR
        </a>
      </div>
    </section>
  );
}
