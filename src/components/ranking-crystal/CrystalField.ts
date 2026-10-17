/* One WebGL2 context for every visible crystal: the canvas overlays a
   container, each slot is drawn with its own viewport/scissor, and the program
   and planes are shared. The RAF only exists while something is animating on
   screen; reduced motion renders one static pose on demand. */
import { ADVANCED_DEFAULTS, DEG, FRAG, MAX_PLANES, VERT, buildPlanes, clamp, num, toRgb, type Advanced, type Rgb } from "./crystal-shader";
import type { CrystalPreset } from "./crystal-presets";
import { QualityGovernor } from "./crystal-quality";

export type CrystalStatus = "loading" | "live" | "fallback" | "lost";

export interface CrystalFieldOptions {
  /** Element whose visibility gates the loop (defaults to the canvas). */
  visibilityTarget?: Element;
  /** Device-pixel-ratio ceiling before the quality governor applies. */
  maxDpr?: number;
  /** Max drawn pixels per frame across all slots (device pixels). */
  pixelBudget?: number;
  /** Debug/capture only: never enable in production. */
  preserveDrawingBuffer?: boolean;
  onStatus?: (status: CrystalStatus, error?: unknown) => void;
}

interface Resolved {
  planes: Float32Array;
  count: number;
  crownH: number;
  adv: Advanced;
  speed: number;
  scale: number;
  light: number;
  hoverStrength: number;
  hoverSpeedBoost: number;
  turn: number;
  spread: number;
  rgb: Rgb;
  warm: Rgb;
  cool: Rgb;
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
  "uRes", "uOrigin", "uTime", "uAngle", "uWobble", "uCount", "uPlanes", "uPpu", "uTarget", "uCamDist", "uPitch",
  "uIor", "uSpread", "uBounces", "uLight", "uAmbient", "uKey", "uFill", "uStrip", "uFront", "uGains", "uWarm",
  "uCool", "uSoft", "uFalloff", "uExposure", "uContrast", "uRim", "uResidual", "uReflect", "uGrain", "uVignette",
] as const;

const resolvedCache = new Map<string, Resolved>();
function resolve(p: CrystalPreset): Resolved {
  const key = JSON.stringify(p);
  const hit = resolvedCache.get(key);
  if (hit) return hit;
  const adv: Advanced = { ...ADVANCED_DEFAULTS, ...(p.advanced ?? {}) };
  const planes = new Float32Array(MAX_PLANES * 4);
  const { count, crownH } = buildPlanes(adv, num(p.facets, 6), planes);
  const r: Resolved = {
    planes, count, crownH, adv,
    speed: clamp(num(p.speed, 50), 0, 100) / 50,
    scale: clamp(num(p.scale, 100), 10, 400) / 100,
    light: clamp(num(p.light, 60), 0, 100) / 100,
    hoverStrength: clamp(num(p.hoverStrength, 30), 0, 100) / 100,
    hoverSpeedBoost: clamp(num(p.hoverSpeedBoost, 50), 0, 200) / 100,
    turn: num(adv.turnRate, 50) * DEG,
    spread: (clamp(num(p.dispersion, 50), 0, 100) / 100) * 0.08,
    rgb: toRgb(p.baseColor, [0.933, 0.945, 0.933]),
    warm: toRgb(adv.warmColor, [0.85, 0.64, 0.31]).map((c) => c * (num(adv.warmStrength, 35) / 100)) as Rgb,
    cool: toRgb(adv.coolColor, [0.23, 0.36, 1]).map((c) => c * (num(adv.coolStrength, 30) / 100)) as Rgb,
  };
  if (resolvedCache.size > 32) resolvedCache.clear();
  resolvedCache.set(key, r);
  return r;
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
  private ambient: Rgb = [0, 0, 0];
  private ambientDirty = true;
  private raf = 0;
  private last = -1;
  private elapsed = 0;
  private visible = false;
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
      this.ro.observe(canvas);
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
      gl.disable(gl.BLEND);
      gl.disable(gl.DEPTH_TEST);
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      const renderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) ?? "") : "";
      if (/swiftshader|llvmpipe|software|basic render/i.test(renderer)) this.governor.level = Math.max(this.governor.level, 1);
      this.uploaded = null;
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

  private get reduced(): boolean {
    return !!this.reducedMq?.matches;
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
    const reduced = this.reduced;
    if (!reduced) {
      this.elapsed += dt;
      this.governor.sample(dtMs);
    }
    this.draw(dt, reduced);
    if (this.status !== "live") this.setStatus("live");
    if (!reduced) this.raf = requestAnimationFrame(this.frame);
    else this.last = -1;
  };

  private draw(dt: number, reduced: boolean): void {
    const gl = this.gl!;
    const U = this.U!;
    const cRect = this.canvas.getBoundingClientRect();
    const rects = this.slots.map((s) => s.el.getBoundingClientRect());

    let dpr = Math.min(window.devicePixelRatio || 1, this.opts.maxDpr ?? 2) * this.governor.scale;
    const area = rects.reduce((a, r) => a + r.width * r.height, 0);
    const budget = this.opts.pixelBudget ?? 240_000;
    if (area * dpr * dpr > budget) dpr = Math.sqrt(budget / Math.max(area, 1));
    dpr = Math.max(0.5, dpr);

    const W = Math.max(1, Math.round(cRect.width * dpr));
    const H = Math.max(1, Math.round(cRect.height * dpr));
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
      const x = Math.round((r.left - cRect.left) * dpr);
      const top = Math.round((r.top - cRect.top) * dpr);
      const w = Math.round(r.width * dpr);
      const h = Math.round(r.height * dpr);
      if (w < 2 || h < 2 || x >= W || top >= H || x + w <= 0 || top + h <= 0) continue;
      const y = H - top - h;

      s.hover += (s.hoverTarget - s.hover) * Math.min(dt * 6, 1);
      if (!reduced) s.phase += p.turn * p.speed * (1 + p.hoverSpeedBoost * s.hover) * dt;
      const theta = num(p.adv.startAngle, 0) * DEG + s.offset + (reduced ? p.turn * 0.54 : s.phase);

      if (this.uploaded !== p) this.upload(p);

      const ppu = (Math.min(h, w * 1.65) / 3.3) * p.scale;
      const frameH = h / ppu;
      const topY = p.crownH + (num(p.adv.apexY, 4) / 100) * frameH;
      const fov = clamp(num(p.adv.fov, 20), 1, 120) * DEG;

      gl.viewport(x, y, w, h);
      gl.scissor(x, y, w, h);
      gl.uniform2f(U.uRes, w, h);
      gl.uniform2f(U.uOrigin, x, y);
      gl.uniform1f(U.uAngle, theta);
      gl.uniform1f(U.uWobble, num(p.adv.wobble, 1) * DEG * Math.sin(theta * 2));
      gl.uniform1f(U.uPpu, ppu);
      gl.uniform2f(U.uTarget, -(num(p.adv.offsetX, 0) / 100) * (w / ppu), topY - frameH / 2);
      gl.uniform1f(U.uCamDist, 1.65 / Math.max(Math.tan(fov / 2), 1e-3));
      gl.uniform1f(U.uExposure, p.light * 5 * (1 + p.hoverStrength * s.hover));
      gl.uniform2f(U.uRim, num(p.adv.rimWidth, 2) * dpr, num(p.adv.rimStrength, 10) / 100);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
  }

  /** Static per-preset uniforms: only re-sent when the drawn preset changes. */
  private upload(p: Resolved): void {
    const gl = this.gl!;
    const U = this.U!;
    const a = p.adv;
    const kw = (num(a.keyWidth, 40) / 2) * DEG;
    const kh = (num(a.keyHeight, 100) / 2) * DEG;
    gl.uniform1i(U.uCount, p.count);
    gl.uniform4fv(U.uPlanes, p.planes);
    gl.uniform1f(U.uPitch, num(a.tilt, 6) * DEG);
    gl.uniform1f(U.uIor, clamp(num(a.ior, 151), 101, 400) / 100);
    gl.uniform1f(U.uSpread, p.spread);
    gl.uniform1i(U.uBounces, Math.round(clamp(num(a.bounces, 3), 1, 6)));
    gl.uniform3f(U.uLight, p.rgb[0], p.rgb[1], p.rgb[2]);
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
