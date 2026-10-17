/* One WebGL2 context for every visible stone of a container: the canvas
   overlays the container (clamped to the visible part of it, so long lists
   stay cheap), each slot is drawn with its own viewport/scissor, and the
   program and planes are shared. The RAF only exists while something is
   animating on screen; reduced motion (or an external pause) renders one
   static pose on demand. */
import { ADVANCED_DEFAULTS, DEG, FRAG, VERT, clamp, num, toRgb, type Advanced, type Rgb } from "./crystal-shader";
import type { CrystalPreset } from "./crystal-presets";
import { buildGem, type BuiltPart } from "./gem-geometry";
import { QualityGovernor } from "./crystal-quality";

export type CrystalStatus = "loading" | "live" | "fallback" | "lost";

export interface CrystalFieldOptions {
  /** Element whose visibility gates the loop (defaults to the canvas). */
  visibilityTarget?: Element;
  /** Device-pixel-ratio ceiling before the quality governor applies. */
  maxDpr?: number;
  /** Max drawn pixels per frame across all visible slots (device pixels). */
  pixelBudget?: number;
  /** Keep the canvas no taller than the viewport and move it with the visible part of its container. */
  clampToViewport?: boolean;
  /** Capture only: fixed device pixel ratio, no governor. */
  fixedDpr?: number;
  /** Debug/capture only: never enable in production. */
  preserveDrawingBuffer?: boolean;
  onStatus?: (status: CrystalStatus, error?: unknown) => void;
}

interface Resolved {
  parts: BuiltPart[];
  originkit: boolean;
  crownH: number;
  top: number;
  bottom: number;
  radius: number;
  fill: number;
  adv: Advanced;
  speed: number;
  scale: number;
  light: number;
  hoverStrength: number;
  hoverSpeedBoost: number;
  turn: number;
  spread: number;
  pitch: number;
  rgb: Rgb;
  warm: Rgb;
  cool: Rgb;
  absorb: Rgb;
}

interface Slot {
  el: HTMLElement;
  hoverEl: HTMLElement | null;
  preset: Resolved;
  offset: number;
  phase: number;
  hover: number;
  hoverTarget: number;
  enter: () => void;
  leave: () => void;
}

type Uniforms = Record<(typeof UNIFORM_NAMES)[number], WebGLUniformLocation>;
const UNIFORM_NAMES = [
  "uRes", "uOrigin", "uTime", "uRot", "uOffset", "uAbsorb", "uCount", "uPlanes", "uPpu", "uTarget", "uCamDist", "uPitch",
  "uIor", "uSpread", "uBounces", "uLight", "uAmbient", "uKey", "uFill", "uStrip", "uFront", "uGains", "uWarm",
  "uCool", "uSoft", "uFalloff", "uExposure", "uContrast", "uRim", "uResidual", "uReflect", "uGrain", "uVignette",
] as const;

const resolvedCache = new Map<string, Resolved>();
function resolve(p: CrystalPreset): Resolved {
  const key = JSON.stringify(p);
  const hit = resolvedCache.get(key);
  if (hit) return hit;
  const adv: Advanced = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) };
  const gem = buildGem(p.geometry, adv, num(p.facets, 6));
  const r: Resolved = {
    parts: gem.parts,
    originkit: !p.geometry,
    crownH: gem.crownH,
    top: gem.top,
    bottom: gem.bottom,
    radius: gem.radius,
    fill: clamp(num(p.fill, 0.62), 0.2, 0.95),
    adv,
    speed: clamp(num(p.speed, 50), 0, 100) / 50,
    scale: clamp(num(p.scale, 100), 10, 400) / 100,
    light: clamp(num(p.light, 60), 0, 100) / 100,
    hoverStrength: clamp(num(p.hoverStrength, 30), 0, 100) / 100,
    hoverSpeedBoost: clamp(num(p.hoverSpeedBoost, 50), 0, 200) / 100,
    turn: num(adv.turnRate, 50) * DEG,
    spread: (clamp(num(p.dispersion, 50), 0, 100) / 100) * 0.08,
    pitch: num(adv.tilt, 6) * DEG,
    rgb: toRgb(p.baseColor, [0.933, 0.945, 0.933]),
    warm: toRgb(adv.warmColor, [0.85, 0.64, 0.31]).map((c) => c * (num(adv.warmStrength, 35) / 100)) as Rgb,
    cool: toRgb(adv.coolColor, [0.23, 0.36, 1]).map((c) => c * (num(adv.coolStrength, 30) / 100)) as Rgb,
    absorb: (p.absorb ?? [0, 0, 0]).map((v) => Math.max(0, num(v, 0))) as Rgb,
  };
  if (resolvedCache.size > 48) resolvedCache.clear();
  resolvedCache.set(key, r);
  return r;
}

/* Stone pose: world->object = R_part^T * RY(-angle) * RZ(-wobble). For the
   Originkit crystal (identity part) this is exactly the original rotY/rotZ. */
const tmpStone = new Float32Array(9);
const tmpRot = new Float32Array(9);
function stoneRotation(angle: number, wobble: number, out: Float32Array) {
  const ca = Math.cos(angle), sa = Math.sin(angle), cw = Math.cos(wobble), sw = Math.sin(wobble);
  // M = RY(-a) * RZ(-w); RY(-a) rows [ca,0,-sa],[0,1,0],[sa,0,ca]; RZ(-w) rows [cw,sw,0],[-sw,cw,0],[0,0,1].
  const m00 = ca * cw, m01 = ca * sw, m02 = -sa;
  const m10 = -sw, m11 = cw, m12 = 0;
  const m20 = sa * cw, m21 = sa * sw, m22 = ca;
  out[0] = m00; out[1] = m10; out[2] = m20;
  out[3] = m01; out[4] = m11; out[5] = m21;
  out[6] = m02; out[7] = m12; out[8] = m22;
}
/** out = T^T * M (both column-major). */
function partRotation(tilt: Float32Array, m: Float32Array, out: Float32Array) {
  for (let c = 0; c < 3; c++) {
    for (let r = 0; r < 3; r++) {
      // (T^T)[r][k] = T[k][r] = tilt[r*3 + k]; M[k][c] = m[c*3 + k]
      out[c * 3 + r] = tilt[r * 3] * m[c * 3] + tilt[r * 3 + 1] * m[c * 3 + 1] + tilt[r * 3 + 2] * m[c * 3 + 2];
    }
  }
}
/** World position of a stone-local offset: M^T * o. */
function worldOffset(m: Float32Array, o: [number, number, number]): [number, number, number] {
  return [
    m[0] * o[0] + m[1] * o[1] + m[2] * o[2],
    m[3] * o[0] + m[4] * o[1] + m[5] * o[2],
    m[6] * o[0] + m[7] * o[1] + m[8] * o[2],
  ];
}

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type);
  if (!s) throw new Error("Could not create shader");
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) {
    const log = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error("Shader compile failed: " + log);
  }
  return s;
}

export class CrystalField {
  private readonly canvas: HTMLCanvasElement;
  private readonly opts: CrystalFieldOptions;
  private gl: WebGL2RenderingContext | null = null;
  private prog: WebGLProgram | null = null;
  private vs: WebGLShader | null = null;
  private fs: WebGLShader | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private U: Uniforms | null = null;
  private slots: Slot[] = [];
  private uploaded: Resolved | null = null;
  private uploadedPart: BuiltPart | null = null;
  private ambient: Rgb = [0, 0, 0];
  private ambientDirty = true;
  private raf = 0;
  private last = -1;
  private elapsed = 0;
  private visible = false;
  private paused = false;
  private destroyed = false;
  private lost = false;
  private status: CrystalStatus = "loading";
  private readonly governor: QualityGovernor;
  private readonly reducedMq: MediaQueryList | null;
  private readonly hoverMq: MediaQueryList | null;
  private io: IntersectionObserver | null = null;
  private ro: ResizeObserver | null = null;

  constructor(canvas: HTMLCanvasElement, opts: CrystalFieldOptions = {}) {
    this.canvas = canvas;
    this.opts = opts;
    const mm = typeof window.matchMedia === "function" ? window.matchMedia.bind(window) : null;
    this.reducedMq = mm ? mm("(prefers-reduced-motion: reduce)") : null;
    this.hoverMq = mm ? mm("(hover: hover) and (pointer: fine)") : null;
    const coarse = mm ? mm("(pointer: coarse)").matches : false;
    this.governor = new QualityGovernor({ startLevel: coarse ? 1 : 0 });
    this.opts.maxDpr ??= coarse ? 1.5 : 2;

    canvas.setAttribute("aria-hidden", "true");
    canvas.addEventListener("webglcontextlost", this.onLost, false);
    canvas.addEventListener("webglcontextrestored", this.onRestored, false);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.reducedMq?.addEventListener?.("change", this.onMotionPref);
    // A static pose still has to follow its slot when the page scrolls.
    window.addEventListener("scroll", this.onScroll, { capture: true, passive: true });

    if (!this.init()) return;

    const target = opts.visibilityTarget ?? canvas;
    if ("IntersectionObserver" in window) {
      this.io = new IntersectionObserver((entries) => {
        this.visible = entries.some((e) => e.isIntersecting);
        this.kick();
      }, { rootMargin: "80px 0px" });
      this.io.observe(target);
    } else {
      this.visible = true;
    }
    if ("ResizeObserver" in window) {
      this.ro = new ResizeObserver(() => this.kick());
      this.ro.observe(canvas.parentElement ?? canvas);
    }
    this.kick();
  }

  getStatus(): CrystalStatus {
    return this.status;
  }

  addSlot(el: HTMLElement, preset: CrystalPreset, hoverEl: HTMLElement | null = null): void {
    const slot: Slot = {
      el, hoverEl, preset: resolve(preset),
      offset: this.slots.length * 2.1,
      phase: 0, hover: 0, hoverTarget: 0,
      enter: () => {},
      leave: () => {},
    };
    slot.enter = () => { if (this.hoverMq?.matches) { slot.hoverTarget = 1; this.kick(); } };
    slot.leave = () => { slot.hoverTarget = 0; this.kick(); };
    hoverEl?.addEventListener("pointerenter", slot.enter);
    hoverEl?.addEventListener("pointerleave", slot.leave);
    this.slots.push(slot);
    this.ro?.observe(el);
    this.kick();
  }

  setPreset(el: HTMLElement, preset: CrystalPreset): void {
    const slot = this.slots.find((s) => s.el === el);
    if (!slot) return;
    slot.preset = resolve(preset);
    this.uploaded = null;
    this.uploadedPart = null;
    this.kick();
  }

  clearSlots(): void {
    for (const s of this.slots) this.detach(s);
    this.slots = [];
    this.kick();
  }

  /** Environment base light (linear 0–1), e.g. a light page theme. */
  setAmbient(rgb: Rgb): void {
    if (rgb.every((v, i) => v === this.ambient[i])) return;
    this.ambient = rgb;
    this.ambientDirty = true;
    this.kick();
  }

  /** External pause (e.g. a "pause animation" control): static pose, no loop. */
  setPaused(paused: boolean): void {
    if (this.paused === paused) return;
    this.paused = paused;
    this.stop();
    this.kick();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.stop();
    for (const s of this.slots) this.detach(s);
    this.slots = [];
    this.io?.disconnect();
    this.ro?.disconnect();
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.reducedMq?.removeEventListener?.("change", this.onMotionPref);
    window.removeEventListener("scroll", this.onScroll, { capture: true });
    this.canvas.removeEventListener("webglcontextlost", this.onLost, false);
    this.canvas.removeEventListener("webglcontextrestored", this.onRestored, false);
    const gl = this.gl;
    this.releaseGl();
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    this.gl = null;
  }

  private detach(s: Slot): void {
    s.hoverEl?.removeEventListener("pointerenter", s.enter);
    s.hoverEl?.removeEventListener("pointerleave", s.leave);
    this.ro?.unobserve(s.el);
  }

  private setStatus(status: CrystalStatus, error?: unknown): void {
    if (this.status === status) return;
    this.status = status;
    this.opts.onStatus?.(status, error);
  }

  private init(): boolean {
    try {
      const gl = this.gl ?? (this.canvas.getContext("webgl2", {
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: !!this.opts.preserveDrawingBuffer,
        powerPreference: "high-performance",
      }) as WebGL2RenderingContext | null);
      if (!gl) throw new Error("WebGL2 unavailable");
      this.gl = gl;
      this.vs = compile(gl, gl.VERTEX_SHADER, VERT);
      this.fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
      const prog = gl.createProgram();
      if (!prog) throw new Error("Could not create program");
      this.prog = prog;
      gl.attachShader(prog, this.vs);
      gl.attachShader(prog, this.fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("Program link failed: " + gl.getProgramInfoLog(prog));
      gl.useProgram(prog);
      this.vao = gl.createVertexArray();
      gl.bindVertexArray(this.vao);
      const U = {} as Uniforms;
      for (const name of UNIFORM_NAMES) {
        const l = gl.getUniformLocation(prog, name) ?? gl.getUniformLocation(prog, name + "[0]");
        if (l === null) throw new Error("Missing uniform " + name);
        U[name] = l;
      }
      this.U = U;
      gl.clearColor(0, 0, 0, 0);
      // Parts of a cluster are composited back to front (premultiplied "over").
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.disable(gl.DEPTH_TEST);
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      const renderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) ?? "") : "";
      if (/swiftshader|llvmpipe|software|basic render/i.test(renderer)) this.governor.level = Math.max(this.governor.level, 1);
      this.uploaded = null;
      this.uploadedPart = null;
      this.ambientDirty = true;
      return true;
    } catch (error) {
      this.releaseGl();
      if (this.gl && !this.gl.isContextLost()) this.gl.getExtension("WEBGL_lose_context")?.loseContext();
      this.gl = null;
      this.setStatus("fallback", error);
      return false;
    }
  }

  private releaseGl(): void {
    const gl = this.gl;
    if (gl && !gl.isContextLost()) {
      if (this.vao) gl.deleteVertexArray(this.vao);
      if (this.prog) gl.deleteProgram(this.prog);
      if (this.vs) gl.deleteShader(this.vs);
      if (this.fs) gl.deleteShader(this.fs);
    }
    this.vao = this.prog = this.vs = this.fs = null;
    this.U = null;
  }

  private readonly onLost = (e: Event) => {
    e.preventDefault();
    this.lost = true;
    this.stop();
    this.U = null;
    this.vao = this.prog = this.vs = this.fs = null;
    this.setStatus("lost");
  };

  private readonly onRestored = () => {
    if (this.destroyed) return;
    this.lost = false;
    if (this.init()) this.kick();
  };

  private readonly onVisibility = () => this.kick();
  private readonly onMotionPref = () => this.kick();
  private readonly onScroll = () => { if (this.isStatic() || this.opts.clampToViewport) this.kick(); };

  private isStatic(): boolean {
    return this.paused || !!this.reducedMq?.matches;
  }

  private canDraw(): boolean {
    return !this.destroyed && !this.lost && !!this.U && this.visible && !document.hidden && this.slots.length > 0;
  }

  /** Schedule work if needed: a loop while animating, a single frame when static. */
  private kick(): void {
    if (!this.canDraw()) {
      this.stop();
      return;
    }
    if (!this.raf) this.raf = requestAnimationFrame(this.frame);
  }

  private stop(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.last = -1;
    this.governor.reset();
  }

  private readonly frame = (now: number) => {
    this.raf = 0;
    if (!this.canDraw()) {
      this.stop();
      return;
    }
    const dtMs = this.last < 0 ? 0 : now - this.last;
    this.last = now;
    const dt = Math.min(dtMs / 1000, 1 / 20);
    const still = this.isStatic();
    if (!still) {
      this.elapsed += dt;
      if (this.opts.fixedDpr == null) this.governor.sample(dtMs);
    }
    this.draw(dt, still);
    if (this.status !== "live") this.setStatus("live");
    if (!still) this.raf = requestAnimationFrame(this.frame);
    else this.last = -1;
  };

  private draw(dt: number, still: boolean): void {
    const gl = this.gl!;
    const U = this.U!;
    const host = this.canvas.parentElement ?? this.canvas;
    const hRect = host.getBoundingClientRect();

    // Canvas box (CSS px, viewport coordinates): whole host, or the visible band of it.
    let boxTop = hRect.top;
    let boxH = hRect.height;
    if (this.opts.clampToViewport) {
      const vh = window.innerHeight || boxH;
      boxH = Math.min(hRect.height, vh);
      const shift = clamp(-hRect.top, 0, Math.max(0, hRect.height - boxH));
      boxTop = hRect.top + shift;
      const css = Math.round(boxH) + "px";
      if (this.canvas.style.height !== css) this.canvas.style.height = css;
      this.canvas.style.transform = "translate3d(0," + shift.toFixed(1) + "px,0)";
    }
    const boxLeft = hRect.left;
    const boxW = hRect.width;

    const rects = this.slots.map((s) => s.el.getBoundingClientRect());
    let area = 0;
    for (const r of rects) {
      const vis = Math.max(0, Math.min(r.bottom, boxTop + boxH) - Math.max(r.top, boxTop)) * Math.max(0, Math.min(r.right, boxLeft + boxW) - Math.max(r.left, boxLeft));
      area += vis;
    }

    let dpr = this.opts.fixedDpr ?? Math.min(window.devicePixelRatio || 1, this.opts.maxDpr ?? 2) * this.governor.scale;
    if (this.opts.fixedDpr == null) {
      const budget = this.opts.pixelBudget ?? 240_000;
      if (area * dpr * dpr > budget) dpr = Math.sqrt(budget / Math.max(area, 1));
      dpr = Math.max(0.5, dpr);
    }

    const W = Math.max(1, Math.round(boxW * dpr));
    const H = Math.max(1, Math.round(boxH * dpr));
    if (this.canvas.width !== W) this.canvas.width = W;
    if (this.canvas.height !== H) this.canvas.height = H;

    gl.useProgram(this.prog);
    gl.bindVertexArray(this.vao);
    gl.disable(gl.SCISSOR_TEST);
    gl.viewport(0, 0, W, H);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.SCISSOR_TEST);
    gl.uniform1f(U.uTime, this.elapsed);
    if (this.ambientDirty) {
      gl.uniform3f(U.uAmbient, this.ambient[0], this.ambient[1], this.ambient[2]);
      this.ambientDirty = false;
    }

    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i];
      const r = rects[i];
      const p = s.preset;
      const x = Math.round((r.left - boxLeft) * dpr);
      const top = Math.round((r.top - boxTop) * dpr);
      const w = Math.round(r.width * dpr);
      const h = Math.round(r.height * dpr);
      if (w < 2 || h < 2 || x >= W || top >= H || x + w <= 0 || top + h <= 0) continue;
      const y = H - top - h;

      s.hover += (s.hoverTarget - s.hover) * Math.min(dt * 6, 1);
      if (!still) s.phase += p.turn * p.speed * (1 + p.hoverSpeedBoost * s.hover) * dt;
      const theta = num(p.adv.startAngle, 0) * DEG + s.offset + (still ? p.turn * 0.54 : s.phase);
      const wobble = num(p.adv.wobble, 1) * DEG * Math.sin(theta * 2);

      if (this.uploaded !== p) this.upload(p);

      const fov = clamp(num(p.adv.fov, 20), 1, 120) * DEG;
      let ppu: number;
      let targetX: number;
      let targetY: number;
      if (p.originkit) {
        ppu = (Math.min(h, w * 1.65) / 3.3) * p.scale;
        const frameH = h / ppu;
        const topY = p.crownH + (num(p.adv.apexY, 4) / 100) * frameH;
        targetX = -(num(p.adv.offsetX, 0) / 100) * (w / ppu);
        targetY = topY - frameH / 2;
      } else {
        // Fit the stone's projected box (height tilted by the camera pitch, full turn width).
        const tall = (p.top - p.bottom) * Math.cos(p.pitch) + 2 * p.radius * Math.sin(p.pitch);
        const ref = p.scale / 0.61;
        ppu = Math.min((h * p.fill) / tall, (w * 0.9) / (2 * p.radius)) * ref;
        targetX = 0;
        targetY = (p.top + p.bottom) / 2;
      }

      gl.viewport(x, y, w, h);
      gl.scissor(x, y, w, h);
      gl.uniform2f(U.uRes, w, h);
      gl.uniform2f(U.uOrigin, x, y);
      gl.uniform1f(U.uPpu, ppu);
      gl.uniform2f(U.uTarget, targetX, targetY);
      gl.uniform1f(U.uCamDist, 1.65 / Math.max(Math.tan(fov / 2), 1e-3));
      gl.uniform1f(U.uExposure, p.light * 5 * (1 + p.hoverStrength * s.hover));
      gl.uniform2f(U.uRim, num(p.adv.rimWidth, 2) * dpr, num(p.adv.rimStrength, 10) / 100);

      stoneRotation(theta, wobble, tmpStone);
      if (p.parts.length === 1) {
        this.drawPart(p.parts[0], tmpStone, [0, 0, 0]);
      } else {
        // Back to front along the camera direction (camera sits at +z, slightly above).
        const sp = Math.sin(p.pitch), cp = Math.cos(p.pitch);
        const order = p.parts
          .map((part) => ({ part, pos: worldOffset(tmpStone, part.offset) }))
          .sort((a, b) => (a.pos[1] * sp + a.pos[2] * cp) - (b.pos[1] * sp + b.pos[2] * cp));
        for (const { part, pos } of order) this.drawPart(part, tmpStone, pos);
      }
    }
  }

  private drawPart(part: BuiltPart, stone: Float32Array, pos: [number, number, number]): void {
    const gl = this.gl!;
    const U = this.U!;
    partRotation(part.tilt, stone, tmpRot);
    gl.uniformMatrix3fv(U.uRot, false, tmpRot);
    gl.uniform3f(U.uOffset, pos[0], pos[1], pos[2]);
    if (this.uploadedPart !== part) {
      gl.uniform1i(U.uCount, part.count);
      gl.uniform4fv(U.uPlanes, part.planes);
      this.uploadedPart = part;
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /** Static per-preset uniforms: only re-sent when the drawn preset changes. */
  private upload(p: Resolved): void {
    const gl = this.gl!;
    const U = this.U!;
    const a = p.adv;
    const kw = (num(a.keyWidth, 40) / 2) * DEG;
    const kh = (num(a.keyHeight, 100) / 2) * DEG;
    gl.uniform1f(U.uPitch, p.pitch);
    gl.uniform1f(U.uIor, clamp(num(a.ior, 151), 101, 400) / 100);
    gl.uniform1f(U.uSpread, p.spread);
    gl.uniform1i(U.uBounces, Math.round(clamp(num(a.bounces, 3), 1, 6)));
    gl.uniform3f(U.uLight, p.rgb[0], p.rgb[1], p.rgb[2]);
    gl.uniform3f(U.uAbsorb, p.absorb[0], p.absorb[1], p.absorb[2]);
    gl.uniform4f(U.uKey, num(a.keyX, -26) * DEG, num(a.keyY, 6) * DEG, kw, kh);
    gl.uniform4f(U.uFill, num(a.fillX, 40) * DEG, 0, kw * 0.7, kh * 0.8);
    gl.uniform4f(U.uStrip, 0, num(a.stripY, -30) * DEG, 70 * DEG, 5 * DEG);
    gl.uniform4f(U.uFront, -35 * DEG, 20 * DEG, 20 * DEG, 30 * DEG);
    gl.uniform4f(U.uGains, 1, num(a.fillStrength, 70) / 100, num(a.stripStrength, 80) / 100, num(a.frontStrength, 50) / 100);
    gl.uniform3f(U.uWarm, p.warm[0], p.warm[1], p.warm[2]);
    gl.uniform3f(U.uCool, p.cool[0], p.cool[1], p.cool[2]);
    gl.uniform1f(U.uSoft, Math.max(num(a.softness, 14), 0.5) * DEG);
    gl.uniform1f(U.uFalloff, clamp(num(a.falloff, 60), 0, 100) / 100);
    gl.uniform1f(U.uContrast, clamp(num(a.contrast, 60), 0, 100) / 100);
    gl.uniform1f(U.uResidual, clamp(num(a.residual, 15), 0, 100) / 100);
    gl.uniform1f(U.uReflect, num(a.reflectStrength, 100) / 100);
    gl.uniform1f(U.uGrain, clamp(num(a.grain, 4), 0, 100) / 100);
    gl.uniform1f(U.uVignette, clamp(num(a.vignette, 0), 0, 100) / 100);
    this.uploaded = p;
  }
}
