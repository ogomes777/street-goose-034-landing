// Single Clear Faceted — Originkit, adapted for Street Goose 034 (see crystal-shader.ts).
import { useEffect, useRef, type CSSProperties } from "react";
import { CrystalField, type CrystalStatus } from "./CrystalField";
import { ORIGINKIT_REFERENCE_PRESET, type CrystalPreset } from "./crystal-presets";
import { toRgb, type Advanced } from "./crystal-shader";

export interface SingleClearFacetedProps {
  speed?: number;
  scale?: number;
  facets?: number;
  dispersion?: number;
  light?: number;
  baseColor?: string;
  /** Painted by the wrapper; the canvas itself is transparent. */
  background?: string;
  advanced?: Partial<Advanced>;
  /** Base light of the studio environment (hex). Omit for the original look. */
  ambient?: string;
  hoverStrength?: number;
  hoverSpeedBoost?: number;
  className?: string;
  style?: CSSProperties;
  onStatus?: (status: CrystalStatus) => void;
  /** Debug/capture only. */
  preserveDrawingBuffer?: boolean;
}

export function OriginkitBaseSingleClearFaceted({
  speed = ORIGINKIT_REFERENCE_PRESET.speed,
  scale = ORIGINKIT_REFERENCE_PRESET.scale,
  facets = ORIGINKIT_REFERENCE_PRESET.facets,
  dispersion = ORIGINKIT_REFERENCE_PRESET.dispersion,
  light = ORIGINKIT_REFERENCE_PRESET.light,
  baseColor = ORIGINKIT_REFERENCE_PRESET.baseColor,
  background = "transparent",
  advanced,
  ambient,
  hoverStrength = ORIGINKIT_REFERENCE_PRESET.hoverStrength,
  hoverSpeedBoost = ORIGINKIT_REFERENCE_PRESET.hoverSpeedBoost,
  className,
  style,
  onStatus,
  preserveDrawingBuffer = false,
}: SingleClearFacetedProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fieldRef = useRef<CrystalField | null>(null);
  const statusRef = useRef(onStatus);
  statusRef.current = onStatus;
  const preset: CrystalPreset = { speed, scale, facets, dispersion, light, baseColor, hoverStrength, hoverSpeedBoost, advanced };
  const presetKey = JSON.stringify(preset);
  const presetRef = useRef(preset);
  presetRef.current = preset;

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const field = new CrystalField(canvas, {
      visibilityTarget: host,
      preserveDrawingBuffer,
      onStatus: (s) => statusRef.current?.(s),
    });
    field.addSlot(host, presetRef.current, host);
    fieldRef.current = field;
    return () => {
      field.destroy();
      fieldRef.current = null;
    };
  }, [preserveDrawingBuffer]);

  useEffect(() => {
    if (hostRef.current) fieldRef.current?.setPreset(hostRef.current, presetRef.current);
  }, [presetKey]);

  useEffect(() => {
    fieldRef.current?.setAmbient(toRgb(ambient, [0, 0, 0]));
  }, [ambient]);

  return (
    <div ref={hostRef} className={className} style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", background, ...style }}>
      <canvas ref={canvasRef} aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", pointerEvents: "none" }} />
    </div>
  );
}

export default function SingleClearFaceted(props: SingleClearFacetedProps) {
  return <OriginkitBaseSingleClearFaceted {...props} />;
}
