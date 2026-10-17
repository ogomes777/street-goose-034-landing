// Dev-only comparison scene: the untouched Originkit component next to the
// adapted transparent renderer, same preset; plus the seven tier stones.
// Not part of the production build.
import { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import Original from "./OriginalSingleClearFaceted";
import SingleClearFaceted from "../../src/components/ranking-crystal/SingleClearFaceted";
import { CrystalField } from "../../src/components/ranking-crystal/CrystalField";
import { TIER_CRYSTAL_PRESETS } from "../../src/components/ranking-crystal/crystal-presets";
import { toRgb } from "../../src/components/ranking-crystal/crystal-shader";

const q = new URLSearchParams(location.search);
const view = q.get("view") ?? "all";
const noGrain = q.has("nograin") ? { grain: 0 } : undefined;
const size = (q.get("size") ?? "200x260").split("x").map(Number);
const theme = q.get("theme") ?? "dark";
const fixedDpr = q.has("dpr") ? Number(q.get("dpr")) : undefined;

function Tiers() {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!host.current || !canvas.current) return;
    const field = new CrystalField(canvas.current, { preserveDrawingBuffer: true, fixedDpr, pixelBudget: 4_000_000 });
    host.current.querySelectorAll<HTMLElement>("[data-tier]").forEach((el) => field.addSlot(el, TIER_CRYSTAL_PRESETS[Number(el.dataset.tier)]));
    if (theme === "light") field.setAmbient(toRgb(q.get("ambient") ?? "#262630", [0, 0, 0]));
    (window as unknown as { __field: CrystalField }).__field = field;
    return () => field.destroy();
  }, []);
  return (
    <div ref={host} className="row tiers" data-shot="tiers" style={{ position: "relative" }}>
      {TIER_CRYSTAL_PRESETS.map((_, i) => (
        <div className="box" key={i}><h3>N{i + 1}</h3>
          <div className={"slot " + theme} data-tier={i} style={{ width: size[0], height: size[1] }} /></div>
      ))}
      <canvas ref={canvas} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />
    </div>
  );
}

/** One field per stone so every poster gets the same pose; transparent page. */
function Posters() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    const fields: CrystalField[] = [];
    host.current?.querySelectorAll<HTMLElement>("[data-tier]").forEach((el) => {
      const canvas = el.querySelector("canvas")!;
      const field = new CrystalField(canvas, { preserveDrawingBuffer: true, fixedDpr: 2, pixelBudget: 4_000_000 });
      field.addSlot(el, TIER_CRYSTAL_PRESETS[Number(el.dataset.tier)]);
      fields.push(field);
    });
    return () => fields.forEach((f) => f.destroy());
  }, []);
  return (
    <div ref={host} className="row" data-shot="posters">
      {TIER_CRYSTAL_PRESETS.map((_, i) => (
        <div key={i} data-tier={i} data-poster={i + 1} style={{ position: "relative", width: 96, height: 112 }}>
          <canvas style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
        </div>
      ))}
    </div>
  );
}

function App() {
  if (view === "posters") return <Posters />;
  return (
    <>
      {(view === "all" || view === "original") && (
        <div className="row"><div className="box"><h3>Original Originkit (opaco, #6C64BF)</h3>
          <div className="ref" data-shot="original"><Original advanced={noGrain} /></div></div></div>
      )}
      {(view === "all" || view === "adapted") && (
        <div className="row"><div className="box"><h3>Adaptado SG034 (transparente sobre #000)</h3>
          <div className="ref" data-shot="adapted"><SingleClearFaceted background="#000000" advanced={noGrain} preserveDrawingBuffer /></div></div></div>
      )}
      {(view === "all" || view === "tiers") && <Tiers />}
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
