// Dev-only comparison scene: the untouched Originkit component next to the
// adapted transparent renderer, same preset. Not part of the production build.
import { createRoot } from "react-dom/client";
import Original from "./OriginalSingleClearFaceted";
import SingleClearFaceted from "../../src/components/ranking-crystal/SingleClearFaceted";
import { TIER_CRYSTAL_PRESETS } from "../../src/components/ranking-crystal/crystal-presets";

const q = new URLSearchParams(location.search);
const view = q.get("view") ?? "all";
const ambient = q.get("ambient") ?? "#1e1e22";
const noGrain = q.has("nograin") ? { grain: 0 } : undefined;

function App() {
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
      {(view === "all" || view === "tiers") && (
        <div className="row" data-shot="tiers">
          {["dark", "light"].map((theme) => TIER_CRYSTAL_PRESETS.map((p, i) => (
            <div className="box" key={theme + i}><h3>N{i + 1}</h3>
              <div className={"slot " + theme}><SingleClearFaceted {...p} speed={50} scale={70} ambient={theme === "light" ? ambient : undefined} preserveDrawingBuffer /></div></div>
          )))}
        </div>
      )}
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
