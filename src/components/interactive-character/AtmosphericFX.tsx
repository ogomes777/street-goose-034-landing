import type { CSSProperties } from "react";

type ParticleStyle = CSSProperties & {
  "--particle-x": string;
  "--particle-y": string;
  "--particle-delay": string;
  "--particle-duration": string;
  "--particle-size": string;
};

const rearParticles = [
  [8, 18, -2.1, 9.4, 0.7],
  [17, 72, -6.8, 12.2, 1],
  [26, 39, -4.5, 10.8, 0.6],
  [35, 84, -8.2, 13.4, 0.8],
  [43, 15, -1.4, 11.6, 0.65],
  [51, 64, -5.7, 9.8, 1.1],
  [59, 31, -7.4, 12.7, 0.75],
  [68, 78, -3.2, 10.3, 0.6],
  [76, 22, -9.1, 14.1, 0.9],
  [84, 56, -4.8, 11.2, 0.7],
  [91, 35, -6.1, 13.1, 1],
  [95, 81, -2.8, 10.6, 0.55],
];

const frontParticles = [
  [12, 49, -3.4, 8.8, 0.85],
  [24, 90, -7.2, 10.4, 1.2],
  [39, 26, -5.8, 9.6, 0.7],
  [63, 88, -1.8, 11.1, 0.9],
  [74, 42, -6.5, 8.9, 1.1],
  [87, 69, -4.1, 10.7, 0.75],
  [93, 16, -8.8, 12.4, 0.6],
];

const toStyle = ([x, y, delay, duration, scale]: number[]): ParticleStyle => ({
  "--particle-x": `${x}%`,
  "--particle-y": `${y}%`,
  "--particle-delay": `${delay}s`,
  "--particle-duration": `${duration}s`,
  "--particle-size": `${2 * scale}px`,
});

function ParticleLayer({ depth, particles }: { depth: "rear" | "front"; particles: number[][] }) {
  return (
    <div className={`sg-atmosphere__particles sg-atmosphere__particles--${depth}`} aria-hidden="true">
      {particles.map((particle, index) => (
        <span className="sg-atmosphere__particle" style={toStyle(particle)} key={`${depth}-${index}`} />
      ))}
    </div>
  );
}

export function AtmosphericFX({ depth }: { depth: "rear" | "front" }) {
  if (depth === "rear") {
    return (
      <div className="sg-atmosphere sg-atmosphere--rear" aria-hidden="true">
        <div className="sg-atmosphere__haze" />
        <div className="sg-atmosphere__ring sg-atmosphere__ring--wide" />
        <div className="sg-atmosphere__ring sg-atmosphere__ring--tight" />
        <div className="sg-atmosphere__axis" />
        <ParticleLayer depth="rear" particles={rearParticles} />
      </div>
    );
  }

  return (
    <div className="sg-atmosphere sg-atmosphere--front" aria-hidden="true">
      <ParticleLayer depth="front" particles={frontParticles} />
      <span className="sg-atmosphere__fragment sg-atmosphere__fragment--one" />
      <span className="sg-atmosphere__fragment sg-atmosphere__fragment--two" />
      <span className="sg-atmosphere__cross">+</span>
    </div>
  );
}
