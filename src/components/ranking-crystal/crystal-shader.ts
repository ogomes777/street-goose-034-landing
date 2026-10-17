/* Single Clear Faceted — Originkit (shader + plane construction).
   Source of truth: the Originkit component supplied by the user. The optics
   (plane-cut solid, Fresnel, 3-channel dispersion, internal bounces, studio
   environment) are unchanged. Adaptations, all documented:
   - uOrigin: lets one shared context draw several slots via viewport/scissor;
   - output is premultiplied alpha (rgb * cover, cover) instead of mixing with
     an opaque background, so the canvas is truly transparent around the stone;
   - uAmbient: optional uniform base luminance added to the studio environment
     (0 = the original look; used only by the light theme so the refracted
     "room" is bright like the page around it);
   - pixels that miss the solid exit early (alpha 0). */

export const MAX_PLANES = 64;
export const DEG = Math.PI / 180;

export const ADVANCED_DEFAULTS = {
  grain: 4,
  vignette: 0,
  ior: 151,
  bounces: 3,
  turnRate: 50,
  startAngle: 0,
  tilt: 6,
  wobble: 1,
  seed: 7,
  jitter: 6,
  crownTilt: 55,
  bodyWidth: 85,
  bodyLength: 140,
  bodyFlare: 2,
  bevelTilt: 45,
  apexY: 14,
  offsetX: 0,
  fov: 20,
  keyX: -26,
  keyY: 49,
  keyWidth: 40,
  keyHeight: 100,
  fillX: 40,
  fillStrength: 70,
  stripY: -30,
  stripStrength: 80,
  frontStrength: 50,
  softness: 14,
  falloff: 60,
  warmColor: "#D9A24E",
  warmStrength: 35,
  coolColor: "#3A5BFF",
  coolStrength: 30,
  contrast: 60,
  rimWidth: 2,
  rimStrength: 10,
  residual: 15,
  reflectStrength: 100,
};

export type Advanced = typeof ADVANCED_DEFAULTS;

export const VERT = `#version 300 es
void main() {
    vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

export const FRAG = `#version 300 es
precision highp float;
precision highp int;
out vec4 outColor;

uniform vec2 uRes;
uniform vec2 uOrigin;
uniform float uTime;
uniform float uAngle;
uniform float uWobble;
uniform int uCount;
uniform vec4 uPlanes[${MAX_PLANES}];
uniform float uPpu;
uniform vec2 uTarget;
uniform float uCamDist;
uniform float uPitch;
uniform float uIor;
uniform float uSpread;
uniform int uBounces;
uniform vec3 uLight;
uniform vec3 uAmbient;
uniform vec4 uKey;
uniform vec4 uFill;
uniform vec4 uStrip;
uniform vec4 uFront;
uniform vec4 uGains;
uniform vec3 uWarm;
uniform vec3 uCool;
uniform float uSoft;
uniform float uFalloff;
uniform float uExposure;
uniform float uContrast;
uniform vec2 uRim;
uniform float uResidual;
uniform float uReflect;
uniform float uGrain;
uniform float uVignette;

vec3 rotY(vec3 v, float a) { float c = cos(a), s = sin(a); return vec3(v.x * c + v.z * s, v.y, -v.x * s + v.z * c); }
vec3 rotZ(vec3 v, float a) { float c = cos(a), s = sin(a); return vec3(v.x * c - v.y * s, v.x * s + v.y * c, v.z); }
vec3 toObj(vec3 v) { return rotY(rotZ(v, -uWobble), -uAngle); }
vec3 toWorld(vec3 v) { return rotZ(rotY(v, uAngle), uWobble); }

float panel(vec2 a, vec4 b) {
    vec2 q = abs(a - b.xy) - b.zw;
    float edge = 1.0 - smoothstep(-uSoft, uSoft, max(q.x, q.y));
    float r = clamp((a.x - b.x) / max(b.z, 1e-3), -1.0, 1.0);
    return edge * (1.0 - uFalloff * r * r);
}

vec3 env(vec3 d) {
    float el = asin(clamp(d.y, -1.0, 1.0));
    vec2 back = vec2(atan(d.x, -d.z), el);
    vec2 front = vec2(atan(d.x, d.z), el);
    float l = panel(back, uKey) * uGains.x
            + panel(back, uFill) * uGains.y
            + panel(back, uStrip) * uGains.z
            + panel(front, uFront) * uGains.w;
    vec3 c = uLight * l + uAmbient;
    c += uWarm * panel(back, vec4(-1.05, -0.35, 0.32, 0.28));
    c += uCool * panel(back, vec4(0.55, 0.6, 0.28, 0.22));
    return c;
}

float exitPlane(vec3 ro, vec3 rd, out vec3 n) {
    float tm = 1e9;
    n = vec3(0.0, 1.0, 0.0);
    for (int i = 0; i < ${MAX_PLANES}; i++) {
        if (i >= uCount) break;
        vec4 P = uPlanes[i];
        float dn = dot(P.xyz, rd);
        if (dn > 1e-5) {
            float t = (P.w - dot(P.xyz, ro)) / dn;
            if (t < tm) { tm = t; n = P.xyz; }
        }
    }
    return clamp(tm, 0.0, 10.0);
}

float channel(vec3 p, vec3 rd, vec3 n0, float ior, int ch) {
    vec3 d = refract(rd, n0, 1.0 / ior);
    if (dot(d, d) < 1e-6) return 0.0;
    float r0 = (ior - 1.0) / (ior + 1.0);
    r0 *= r0;
    float w = 1.0;
    float acc = 0.0;
    for (int b = 0; b < 6; b++) {
        if (b >= uBounces) break;
        vec3 n;
        float t = exitPlane(p, d, n);
        p += d * t;
        vec3 o = refract(d, -n, ior);
        if (dot(o, o) > 1e-6) {
            float c = clamp(dot(o, n), 0.0, 1.0);
            float F = r0 + (1.0 - r0) * pow(1.0 - c, 5.0);
            acc += w * (1.0 - F) * env(toWorld(o))[ch];
            w *= F;
        }
        d = reflect(d, n);
        p -= n * 1e-4;
    }
    acc += w * uResidual * env(toWorld(d))[ch];
    return acc;
}

void main() {
    vec2 fc = gl_FragCoord.xy - uOrigin;
    vec2 sxy = (fc - 0.5 * uRes) / uPpu;
    float sp = sin(uPitch), cp = cos(uPitch);
    vec3 T = vec3(uTarget, 0.0);
    vec3 f = vec3(0.0, -sp, -cp);
    vec3 u = vec3(0.0, cp, -sp);
    vec3 cam = T - f * uCamDist;
    vec3 s = T + vec3(sxy.x, 0.0, 0.0) + u * sxy.y;
    vec3 rdW = normalize(s - cam);
    vec3 ro = toObj(cam);
    vec3 rd = toObj(rdW);

    float tN = -1e9;
    float tF = 1e9;
    int idx = 0;
    for (int i = 0; i < ${MAX_PLANES}; i++) {
        if (i >= uCount) break;
        vec4 P = uPlanes[i];
        float dn = dot(P.xyz, rd);
        float dist = P.w - dot(P.xyz, ro);
        if (abs(dn) < 1e-6) {
            if (dist < 0.0) tF = -1e9;
            continue;
        }
        float t = dist / dn;
        if (dn < 0.0) {
            if (t > tN) { tN = t; idx = i; }
        } else {
            tF = min(tF, t);
        }
    }

    float px = 1.0 / max(uPpu, 1e-3);
    float gap = tF - tN;
    if (!(gap > -2.0 * px && tN > 0.0)) {
        outColor = vec4(0.0);
        return;
    }

    vec3 n0 = uPlanes[idx].xyz;
    vec3 p = ro + rd * tN;
    vec3 pin = p - n0 * 1e-4;

    float r0 = (uIor - 1.0) / (uIor + 1.0);
    r0 *= r0;
    float ci = clamp(-dot(rd, n0), 0.0, 1.0);
    float Fe = r0 + (1.0 - r0) * pow(1.0 - ci, 5.0);
    vec3 refl = env(toWorld(reflect(rd, n0))) * uReflect;

    vec3 tr;
    tr.r = channel(pin, rd, n0, uIor - uSpread * 0.5, 0);
    tr.g = channel(pin, rd, n0, uIor, 1);
    tr.b = channel(pin, rd, n0, uIor + uSpread * 0.5, 2);
    vec3 g = Fe * refl + (1.0 - Fe) * tr;

    float md = 1e9;
    for (int j = 0; j < ${MAX_PLANES}; j++) {
        if (j >= uCount) break;
        if (j == idx) continue;
        vec4 Q = uPlanes[j];
        md = min(md, Q.w - dot(Q.xyz, p));
    }
    float rim = 1.0 - smoothstep(0.0, max(uRim.x * px, 1e-5), max(md, 0.0));
    g += uLight * rim * uRim.y;

    g *= uExposure;
    g = 1.0 - exp(-g);
    g = mix(g, g * g * (3.0 - 2.0 * g), uContrast);
    float cover = smoothstep(-px, px, gap * 0.5);

    float L = dot(g, vec3(0.299, 0.587, 0.114));
    float nz = fract(sin(dot(fc + fract(uTime * 7.13) * vec2(91.7, 47.3), vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
    g += nz * 2.0 * uGrain * 4.0 * L * (1.0 - L);
    vec2 q = fc / uRes - 0.5;
    g *= 1.0 - uVignette * smoothstep(0.2, 0.75, length(q));
    outColor = vec4(clamp(g, 0.0, 1.0) * cover, cover);
}`;

export function num(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export type Rgb = [number, number, number];

export function toRgb(input: string | undefined, fallback: Rgb): Rgb {
  let s = String(input ?? "").trim();
  const v = s.match(/^var\([^,]+,\s*(.+)\)$/);
  if (v) s = v[1].trim();
  if (s[0] === "#") {
    let h = s.slice(1);
    if (h.length === 3 || h.length === 4) h = h.split("").map((c) => c + c).join("");
    if (h.length >= 6) {
      const n = parseInt(h.slice(0, 6), 16);
      if (!Number.isNaN(n)) return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
    }
  } else {
    const m = s.match(/rgba?\(([^)]+)\)/i);
    if (m) {
      const parts = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat);
      if (parts.length >= 3 && parts.slice(0, 3).every((x) => Number.isFinite(x))) {
        return [parts[0] / 255, parts[1] / 255, parts[2] / 255];
      }
    }
  }
  return fallback;
}

export function mulberry32(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Identical to the Originkit plane construction; call only when geometry changes. */
export function buildPlanes(adv: Advanced, facets: number, out: Float32Array) {
  const N = Math.round(clamp(facets, 5, 16));
  const rand = mulberry32(Math.round(num(adv.seed, 7)));
  const jit = clamp(num(adv.jitter, 6), 0, 30) * DEG;
  const eC = (90 - clamp(num(adv.crownTilt, 55), 20, 85)) * DEG;
  const crownH = 1 / Math.tan(eC);
  const Rb = clamp(num(adv.bodyWidth, 85), 20, 200) / 100;
  const flare = clamp(num(adv.bodyFlare, 2), -30, 30) * DEG;
  const L = clamp(num(adv.bodyLength, 140), 0, 400) / 100;
  const eB = -clamp(num(adv.bevelTilt, 45), 5, 85) * DEG;
  let k = 0;
  const push = (x: number, y: number, z: number, d: number) => {
    out[k * 4] = x;
    out[k * 4 + 1] = y;
    out[k * 4 + 2] = z;
    out[k * 4 + 3] = d;
    k++;
  };
  const step = (Math.PI * 2) / N;
  for (let i = 0; i < N; i++) {
    const phi = i * step + (rand() * 2 - 1) * jit;
    const e = eC + (rand() * 2 - 1) * jit * 0.5;
    push(Math.cos(e) * Math.cos(phi), Math.sin(e), Math.cos(e) * Math.sin(phi), Math.sin(e) * crownH);
  }
  for (let i = 0; i < N; i++) {
    const phi = (i + 0.5) * step + (rand() * 2 - 1) * jit;
    const e = flare + (rand() * 2 - 1) * jit * 0.3;
    const d = Math.cos(e) * Rb * (1 + (rand() * 2 - 1) * 0.02);
    push(Math.cos(e) * Math.cos(phi), Math.sin(e), Math.cos(e) * Math.sin(phi), d);
  }
  const rBot = ((Rb + L * Math.tan(flare)) / Math.cos(Math.PI / N)) * 0.97;
  for (let i = 0; i < N; i++) {
    const phi = i * step + (rand() * 2 - 1) * jit;
    push(Math.cos(eB) * Math.cos(phi), Math.sin(eB), Math.cos(eB) * Math.sin(phi), Math.cos(eB) * rBot - Math.sin(eB) * L);
  }
  push(0, -1, 0, L + 1.2);
  return { count: k, crownH };
}
