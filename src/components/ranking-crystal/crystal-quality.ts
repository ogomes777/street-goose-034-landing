/* Resolution governor with hysteresis: drops one step after sustained slow
   frames, recovers one step only after a much longer good streak, and never
   changes twice inside the cooldown. Frame gaps above `ignoreMs` (tab switch,
   resume) are not load and are skipped. */
export interface QualityOptions {
  levels?: readonly number[];
  startLevel?: number;
  downMs?: number;
  upMs?: number;
  downFrames?: number;
  upFrames?: number;
  cooldownFrames?: number;
  ignoreMs?: number;
}

export class QualityGovernor {
  readonly levels: readonly number[];
  level: number;
  private ema = 0;
  private over = 0;
  private under = 0;
  private cooldown = 0;
  private readonly o: Required<Omit<QualityOptions, "levels" | "startLevel">>;

  constructor(opts: QualityOptions = {}) {
    this.levels = opts.levels ?? [1, 0.85, 0.7, 0.55];
    this.level = Math.max(0, Math.min(this.levels.length - 1, opts.startLevel ?? 0));
    this.o = {
      downMs: opts.downMs ?? 24,
      upMs: opts.upMs ?? 18,
      downFrames: opts.downFrames ?? 45,
      upFrames: opts.upFrames ?? 300,
      cooldownFrames: opts.cooldownFrames ?? 90,
      ignoreMs: opts.ignoreMs ?? 120,
    };
  }

  get scale(): number {
    return this.levels[this.level];
  }

  /** Forget the running average (call after a pause so stale samples don't count). */
  reset(): void {
    this.ema = 0;
    this.over = 0;
    this.under = 0;
  }

  /** Feed one frame interval; returns true when the level changed. */
  sample(dtMs: number): boolean {
    if (!(dtMs > 0) || dtMs > this.o.ignoreMs) return false;
    this.ema = this.ema === 0 ? dtMs : this.ema * 0.9 + dtMs * 0.1;
    if (this.cooldown > 0) {
      this.cooldown--;
      return false;
    }
    this.over = this.ema > this.o.downMs ? this.over + 1 : 0;
    this.under = this.ema < this.o.upMs ? this.under + 1 : 0;
    if (this.over >= this.o.downFrames && this.level < this.levels.length - 1) return this.shift(1);
    if (this.under >= this.o.upFrames && this.level > 0) return this.shift(-1);
    return false;
  }

  private shift(d: number): boolean {
    this.level += d;
    this.over = 0;
    this.under = 0;
    this.cooldown = this.o.cooldownFrames;
    return true;
  }
}
