/* Plane sets for the seven tier cuts, rendered by the Originkit optics.
   Every cut is a convex solid (intersection of half-spaces), which is what
   the shader traces. Profiles follow the previous Three.js gems
   (js/gem-geometry.js) so each stone keeps its silhouette, with real
   faceting added: bands alternate their facet directions like a brilliant,
   step cuts keep facets parallel to their edges. */
import { ADVANCED_DEFAULTS, MAX_PLANES, buildPlanes, type Advanced } from "./crystal-shader";

export type Vec3 = [number, number, number];

/** Footprint seen from above (XZ plane), described by its support function. */
export type Footprint =
  | { type: "circle"; r?: number }
  | { type: "ellipse"; a: number; b: number }
  | { type: "poly"; pts: [number, number][]; round?: number };

/** One facet band between two rings of the profile. `n` facet directions,
    rotated by `phase` (fraction of one step); `edges` uses the polygon's own
    edge normals instead (step cuts). */
export interface Band { n?: number; phase?: number; edges?: boolean }

export interface FacetedGeometry {
  kind: "faceted";
  footprint: Footprint;
  /** [y, scale] from bottom to top; scale 0 is a point (culet/apex). */
  rings: [number, number][];
  bands: Band[];
}

export interface ClusterPart {
  crystal: Partial<Advanced>;
  facets: number;
  scale: number;
  offset: Vec3;
  /** Lean of the part, degrees, around Z then X. */
  lean: [number, number];
}

export interface ClusterGeometry { kind: "cluster"; parts: ClusterPart[] }

export type GemGeometry = FacetedGeometry | ClusterGeometry;

export interface BuiltPart {
  planes: Float32Array;
  count: number;
  offset: Vec3;
  /** Part->stone rotation (column-major mat3). */
  tilt: Float32Array;
}

export interface BuiltGem {
  parts: BuiltPart[];
  top: number;
  bottom: number;
  radius: number;
}

const IDENTITY = () => new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);

function support(fp: Footprint): (phi: number) => number {
  if (fp.type === "circle") return () => fp.r ?? 1;
  if (fp.type === "ellipse") return (phi) => Math.hypot(fp.a * Math.cos(phi), fp.b * Math.sin(phi));
  const round = fp.round ?? 0;
  return (phi) => {
    const c = Math.cos(phi), s = Math.sin(phi);
    let m = -Infinity;
    for (const [x, z] of fp.pts) m = Math.max(m, x * c + z * s);
    return m + round;
  };
}

function edgeDirections(fp: Footprint): number[] {
  if (fp.type !== "poly") return [];
  const out: number[] = [];
  const pts = fp.pts;
  for (let i = 0; i < pts.length; i++) {
    const [x0, z0] = pts[i];
    const [x1, z1] = pts[(i + 1) % pts.length];
    // Outward normal of a counter-clockwise edge in the XZ plane, either winding.
    let nx = z1 - z0, nz = -(x1 - x0);
    const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cz = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    if (nx * (x0 - cx) + nz * (z0 - cz) < 0) { nx = -nx; nz = -nz; }
    out.push(Math.atan2(nz, nx));
  }
  return out;
}

export function buildFaceted(g: FacetedGeometry, out: Float32Array): { count: number; top: number; bottom: number; radius: number } {
  const h = support(g.footprint);
  let k = 0;
  const push = (x: number, y: number, z: number, d: number) => {
    if (k >= MAX_PLANES) throw new Error("Gem exceeds MAX_PLANES");
    out[k * 4] = x; out[k * 4 + 1] = y; out[k * 4 + 2] = z; out[k * 4 + 3] = d;
    k++;
  };
  const edges = edgeDirections(g.footprint);
  let radius = 0;
  for (let j = 0; j < g.rings.length - 1; j++) {
    const [y0, s0] = g.rings[j];
    const [y1, s1] = g.rings[j + 1];
    const band = g.bands[j] ?? {};
    const dirs = band.edges && edges.length
      ? edges
      : Array.from({ length: band.n ?? 8 }, (_, i) => ((i + (band.phase ?? 0)) * Math.PI * 2) / (band.n ?? 8));
    for (const phi of dirs) {
      const r = h(phi);
      radius = Math.max(radius, r * Math.max(s0, s1));
      // Facet through both ring points in this direction; outward normal in the (radial, y) plane.
      const dr = (s1 - s0) * r, dy = y1 - y0;
      const len = Math.hypot(dr, dy) || 1;
      const cr = dy / len, sy = -dr / len;
      const anchor = s0 > 0 ? [s0 * r, y0] : [s1 * r, y1];
      push(cr * Math.cos(phi), sy, cr * Math.sin(phi), cr * anchor[0] + sy * anchor[1]);
    }
  }
  const [yb, sb] = g.rings[0];
  const [yt, st] = g.rings[g.rings.length - 1];
  if (st > 0) push(0, 1, 0, yt);
  if (sb > 0) push(0, -1, 0, -yb);
  return { count: k, top: yt, bottom: yb, radius };
}

function lean(zDeg: number, xDeg: number): Float32Array {
  const z = (zDeg * Math.PI) / 180, x = (xDeg * Math.PI) / 180;
  const cz = Math.cos(z), sz = Math.sin(z), cx = Math.cos(x), sx = Math.sin(x);
  // R = Rz * Rx, column-major.
  return new Float32Array([cz, sz, 0, -sz * cx, cz * cx, sx, sz * sx, -cz * sx, cx]);
}

export function buildGem(geometry: GemGeometry | undefined, adv: Advanced, facets: number): BuiltGem & { crownH: number } {
  if (!geometry) {
    const planes = new Float32Array(MAX_PLANES * 4);
    const { count, crownH } = buildPlanes(adv, facets, planes);
    return { parts: [{ planes, count, offset: [0, 0, 0], tilt: IDENTITY() }], top: crownH, bottom: -2.4, radius: 1, crownH };
  }
  if (geometry.kind === "faceted") {
    const planes = new Float32Array(MAX_PLANES * 4);
    const b = buildFaceted(geometry, planes);
    return { parts: [{ planes, count: b.count, offset: [0, 0, 0], tilt: IDENTITY() }], top: b.top, bottom: b.bottom, radius: b.radius, crownH: b.top };
  }
  let top = -Infinity, bottom = Infinity, radius = 0;
  const parts = geometry.parts.map((p) => {
    const planes = new Float32Array(MAX_PLANES * 4);
    const { count, crownH } = buildPlanes({ ...ADVANCED_DEFAULTS, ...p.crystal }, p.facets, planes);
    for (let i = 0; i < count; i++) planes[i * 4 + 3] *= p.scale;
    const length = (p.crystal.bodyLength ?? ADVANCED_DEFAULTS.bodyLength) / 100;
    top = Math.max(top, p.offset[1] + crownH * p.scale);
    bottom = Math.min(bottom, p.offset[1] - (length + 1) * p.scale);
    radius = Math.max(radius, Math.hypot(p.offset[0], p.offset[2]) + p.scale);
    return { planes, count, offset: p.offset, tilt: lean(p.lean[0], p.lean[1]) };
  });
  return { parts, top, bottom, radius, crownH: top };
}
