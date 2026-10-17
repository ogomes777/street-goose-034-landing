/* Mounts the shared crystal renderer over the home ranking cards. The SVG
   tier gem inside each slot stays as the accessible label and as the visible
   fallback until the first WebGL frame (and again if WebGL fails or is lost). */
import { CrystalField } from "./CrystalField";
import { tierCrystalPreset } from "./crystal-presets";
import { toRgb, type Rgb } from "./crystal-shader";

/* Light theme: the refracted studio "room" gets a soft base light so the
   stone reads as clear glass on a light card instead of a dark hole. */
const LIGHT_AMBIENT: Rgb = toRgb("#262630", [0.15, 0.15, 0.19]);
const DARK_AMBIENT: Rgb = [0, 0, 0];

function isLightTheme(): boolean {
  const t = document.documentElement.getAttribute("data-theme");
  if (t === "light") return true;
  if (t === "dark") return false;
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ?? false;
}

export function mountRankingCrystals(list: HTMLElement): () => void {
  const slots = Array.from(list.querySelectorAll<HTMLElement>("[data-crystal-slot]"));
  if (!slots.length) return () => {};

  const canvas = document.createElement("canvas");
  canvas.className = "sg-ranking-crystal-canvas";
  list.appendChild(canvas);

  const field = new CrystalField(canvas, {
    visibilityTarget: list,
    onStatus: (status, error) => {
      list.classList.toggle("has-crystal", status === "live");
      list.dataset.crystalRenderer = status;
      if (status === "fallback" && error) console.warn("[SG034] Ranking crystal unavailable, keeping SVG gems.", error);
    },
  });
  for (const slot of slots) {
    field.addSlot(slot, tierCrystalPreset(Number(slot.dataset.level) || 1), slot.closest<HTMLElement>(".sg-ranking-preview-card"));
  }

  const applyTheme = () => field.setAmbient(isLightTheme() ? LIGHT_AMBIENT : DARK_AMBIENT);
  applyTheme();
  const themeObserver = new MutationObserver(applyTheme);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const schemeMq = window.matchMedia?.("(prefers-color-scheme: light)");
  schemeMq?.addEventListener?.("change", applyTheme);

  return () => {
    themeObserver.disconnect();
    schemeMq?.removeEventListener?.("change", applyTheme);
    field.destroy();
    canvas.remove();
    list.classList.remove("has-crystal");
    delete list.dataset.crystalRenderer;
  };
}
