/* Turns every tier stone inside a root into a live crystal, with one shared
   WebGL context per root. A slot is any element with [data-gem-slot] and a
   data-level; its poster image (or SVG) stays as the accessible label and as
   the visible fallback until the first WebGL frame, and again if WebGL fails
   or the context is lost. */
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

export interface GemFieldOptions {
  /** Ancestor of a slot that reacts to hover (card, row). */
  hoverSelector?: string;
  /** For tall roots (lists, full pages): canvas only as tall as the viewport. */
  clampToViewport?: boolean;
  /** Ignore the light theme (stones on an always-dark stage). */
  alwaysDark?: boolean;
}

export interface GemField {
  /** Re-scan slots after the root's content changed. */
  refresh(): void;
  setPaused(paused: boolean): void;
  destroy(): void;
}

export function mountGemField(root: HTMLElement, opts: GemFieldOptions = {}): GemField {
  const canvas = document.createElement("canvas");
  canvas.className = "sg-gem-canvas";
  root.appendChild(canvas);

  const field = new CrystalField(canvas, {
    visibilityTarget: root,
    clampToViewport: opts.clampToViewport,
    onStatus: (status, error) => {
      root.classList.toggle("has-gem-crystal", status === "live");
      root.dataset.gemRenderer = status;
      if (status === "fallback" && error) console.warn("[SG034] Crystal renderer unavailable, keeping gem posters.", error);
    },
  });

  const scan = () => {
    field.clearSlots();
    root.querySelectorAll<HTMLElement>("[data-gem-slot]").forEach((slot) => {
      const hover = opts.hoverSelector ? slot.closest<HTMLElement>(opts.hoverSelector) : null;
      field.addSlot(slot, tierCrystalPreset(Number(slot.dataset.level) || 1), hover);
    });
  };
  scan();

  const applyTheme = () => field.setAmbient(!opts.alwaysDark && isLightTheme() ? LIGHT_AMBIENT : DARK_AMBIENT);
  applyTheme();
  const themeObserver = new MutationObserver(applyTheme);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const schemeMq = window.matchMedia?.("(prefers-color-scheme: light)");
  schemeMq?.addEventListener?.("change", applyTheme);

  return {
    refresh: scan,
    setPaused: (paused) => field.setPaused(paused),
    destroy() {
      themeObserver.disconnect();
      schemeMq?.removeEventListener?.("change", applyTheme);
      field.destroy();
      canvas.remove();
      root.classList.remove("has-gem-crystal");
      delete root.dataset.gemRenderer;
    },
  };
}
