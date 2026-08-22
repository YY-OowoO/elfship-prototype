import { EXPRESSIONS } from './rings';
import { EMOTION_GROUPS, EMOTION_SEED } from './emotions';
import { createBall, type BallRenderer } from './renderer';
import type {
  AIMessagePayload,
  AnimConfig,
  BodyPose,
  EmotionBallInstance,
  EmotionBallOptions,
  EmotionGroup,
  EmotionRawConfig,
  EyePose,
  NormalizedEmotionConfig,
  Point2D,
  Pose,
  ShapeType
} from './types';

const TAU = Math.PI * 2;
const FALLBACK_ID = '02';

function clamp(v: number, a: number, b: number): number {
  return v < a ? a : v > b ? b : v;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function rand(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

interface Spring {
  x: number;
  v: number;
  t: number;
}

function spring(v0: number): Spring {
  return { x: v0, v: 0, t: v0 };
}

function springStep(s: Spring, w: number, z: number, dt: number): void {
  s.v += (-2 * z * w * s.v - w * w * (s.x - s.t)) * dt;
  s.x += s.v * dt;
  if (!isFinite(s.x) || !isFinite(s.v)) {
    s.x = s.t;
    s.v = 0;
  }
}

function lerpRingInPlace(out: Point2D[], a: Point2D[], b: Point2D[], t: number): Point2D[] {
  const len = a.length;
  if (out.length !== len) out.length = len;
  for (let i = 0; i < len; i++) {
    const ax = a[i][0];
    const ay = a[i][1];
    const bx = b[i][0];
    const by = b[i][1];
    if (!out[i]) {
      out[i] = [ax + (bx - ax) * t, ay + (by - ay) * t];
    } else {
      out[i][0] = ax + (bx - ax) * t;
      out[i][1] = ay + (by - ay) * t;
    }
  }
  return out;
}

function lerpRing(a: Point2D[], b: Point2D[], t: number): Point2D[] {
  const out: Point2D[] = new Array(a.length);
  for (let i = 0; i < a.length; i++) {
    out[i] = [a[i][0] + (b[i][0] - a[i][0]) * t, a[i][1] + (b[i][1] - a[i][1]) * t];
  }
  return out;
}

const BOUNCE_SEGS = [
  { h: 48, d: 0.5 },
  { h: 28, d: 0.382 },
  { h: 14, d: 0.27 },
  { h: 6, d: 0.177 }
];
const BOUNCE_TOTAL = BOUNCE_SEGS.reduce((s, q) => s + q.d, 0);

const RGB_CACHE = new Map<string, [number, number, number]>();

function hexToRgb(hex: string): [number, number, number] {
  let cached = RGB_CACHE.get(hex);
  if (cached) return cached;
  let h = hex.replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  cached = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  if (RGB_CACHE.size < 200) RGB_CACHE.set(hex, cached);
  return cached;
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0'))
      .join('')
  );
}

function lerpColor(a: string, b: string, t: number): string {
  if (a === b) return b;
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t));
}

const DEFAULT_BODY: BodyPose = {
  x: 0,
  y: 0,
  scale: 1,
  rotate: 0,
  color: '#F3F0EA',
  breathe: 0.01,
  ribbons: 0,
  confetti: 0,
  sketch: 0,
  zzz: 0,
  orbit: 0
};

const DEFAULT_EYE: EyePose = {
  x: 0,
  y: 0,
  scaleX: 1,
  scaleY: 1,
  rotate: 0,
  open: 1,
  color: '#1A1A1A',
  lookX: 0,
  lookY: 0
};

function defaultPose(): Pose {
  return {
    body: { ...DEFAULT_BODY },
    left: { ...DEFAULT_EYE },
    right: { ...DEFAULT_EYE }
  };
}

function clonePose(p: Pose): Pose {
  return {
    body: { ...p.body },
    left: { ...p.left },
    right: { ...p.right }
  };
}

function applySpec(pose: Pose, spec?: Partial<EmotionRawConfig> | { body?: Partial<BodyPose>; eyes?: { both?: Partial<EyePose>; left?: Partial<EyePose>; right?: Partial<EyePose> } }): Pose {
  if (!spec) return pose;
  if (spec.body) Object.assign(pose.body, spec.body);
  const e = spec.eyes;
  if (e) {
    if (e.both) {
      Object.assign(pose.left, e.both);
      Object.assign(pose.right, e.both);
    }
    if (e.left) Object.assign(pose.left, e.left);
    if (e.right) Object.assign(pose.right, e.right);
  }
  return pose;
}

function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const out = defaultPose();
  (['body', 'left', 'right'] as const).forEach((part) => {
    const pa = a[part] as any;
    const pb = b[part] as any;
    const po = out[part] as any;
    for (const k in pb) {
      const vb = pb[k];
      if (typeof vb === 'number') po[k] = lerp(pa[k] != null ? pa[k] : vb, vb, t);
      else if (k === 'color') po[k] = lerpColor(pa[k] || vb, vb, t);
      else po[k] = vb;
    }
  });
  return out;
}

const ANIM_TYPES: Record<string, (a: AnimConfig, t: number, eng: EmotionEngine) => number> = {
  sine: (a, t) => a.amp! * Math.sin((TAU * t) / (a.period || 2000) + (a.phase || 0)),
  pulse: (a, t) => a.amp! * 0.5 * (1 - Math.cos((TAU * t) / (a.period || 1000) + (a.phase || 0))),
  jitter: (a, t, eng) => {
    const s = (t / 1000) * (a.speed || 8);
    let v =
      ((Math.sin(s * 3.1 + eng._seed) +
        Math.sin(s * 5.7 + eng._seed * 2.3) +
        Math.sin(s * 9.3 + eng._seed * 4.1)) /
        3) *
      a.amp!;
    if (a.decay) v *= clamp(1 - t / a.decay, 0, 1);
    return v;
  },
  scan: (a, t) => {
    const per = a.period || 800;
    const p = ((t + (a.phaseMs || 0)) % per) / per;
    const tri = p < 0.5 ? p * 4 - 1 : 3 - p * 4;
    return a.amp! * tri;
  },
  glance: (a, t) => {
    const per = a.period || 3600;
    const ph = TAU * (((t + (a.phaseMs || 0)) % per) / per) + (a.phase || 0);
    return a.amp! * Math.tanh(2.8 * Math.sin(ph));
  },
  blink: (a, t, eng) => {
    const interval = a.interval || 3800;
    const dur = a.dur || 200;
    const p = (t + (a.phaseMs || 0) + (eng ? eng._seed * 97 : 0)) % interval;
    if (p >= dur) return 0;
    return -(a.depth == null ? 1 : a.depth) * Math.sin(Math.PI * (p / dur));
  }
};

function applyAnim(pose: Pose, a: AnimConfig, t: number, eng: EmotionEngine) {
  const fn = ANIM_TYPES[a.type];
  if (!fn) return;
  const v = fn(a, t, eng);
  const targets: (EyePose | BodyPose)[] =
    a.target === 'eyes'
      ? [pose.left, pose.right]
      : a.target === 'body'
      ? [pose.body]
      : a.target === 'left'
      ? [pose.left]
      : a.target === 'right'
      ? [pose.right]
      : [];
  for (let i = 0; i < targets.length; i++) {
    const tg = targets[i] as any;
    if (a.prop === 'scale') {
      if (tg === pose.body) tg.scale += v;
      else {
        tg.scaleX += v;
        tg.scaleY += v;
      }
    } else if (a.prop in tg) {
      tg[a.prop] += v;
    }
  }
}

/* ---------------- 配置注册中心 ---------------- */

const registry = new Map<string, NormalizedEmotionConfig>();
const order: string[] = [];

function validate(raw: any): string[] {
  const errs: string[] = [];
  if (!raw || typeof raw !== 'object') {
    errs.push('配置必须是对象');
    return errs;
  }
  if (typeof raw.id !== 'string' || !raw.id.trim()) errs.push('缺少合法的字符串 id');
  if (typeof raw.name !== 'string' || !raw.name.trim()) errs.push('缺少 name');
  if (raw.anims != null) {
    if (!Array.isArray(raw.anims)) errs.push('anims 必须是数组');
    else {
      raw.anims.forEach((a: any, i: number) => {
        if (!a || !ANIM_TYPES[a.type]) errs.push('anims[' + i + '] 未知动画类型：' + (a && a.type));
      });
    }
  }
  if (raw.sequence != null && !Array.isArray(raw.sequence.frames)) {
    errs.push('sequence.frames 必须是数组');
  }
  return errs;
}

function normalize(raw: EmotionRawConfig): NormalizedEmotionConfig {
  const base = applySpec(defaultPose(), raw);
  let pool = (raw.pool || [0, 8]).filter((i) => i >= 0 && i < EXPRESSIONS.length);
  if (!pool.length) pool = [0];
  const def: NormalizedEmotionConfig = {
    id: raw.id,
    name: raw.name,
    group: raw.group,
    desc: raw.desc || '',
    en: raw.en || null,
    gaze: raw.gaze !== false,
    transition: raw.transition != null ? raw.transition : 500,
    pool,
    poolMs: raw.poolMs || [9000, 16000],
    poolSpeed: raw.poolSpeed || 6,
    blinkMs: raw.blinkMs !== undefined ? raw.blinkMs : [6000, 14000],
    openness: raw.openness != null ? raw.openness : 1,
    antics: !!raw.antics,
    base,
    anims: (raw.anims || []).map((a) => ({ ...a })),
    sequence: null,
    raw
  };
  if (raw.sequence) {
    const frames = raw.sequence.frames
      .map((f) => ({
        at: f.at || 0,
        pose: applySpec(clonePose(base), f)
      }))
      .sort((x, y) => x.at - y.at);
    def.sequence = { frames, settle: raw.sequence.settle || 'base' };
  }
  return def;
}

export function registerEmotion(raw: EmotionRawConfig): { ok: boolean; id?: string; errors?: string[] } {
  const errs = validate(raw);
  if (errs.length) return { ok: false, id: raw && raw.id, errors: errs };
  const def = normalize(raw);
  if (!registry.has(def.id)) order.push(def.id);
  registry.set(def.id, def);
  return { ok: true, id: def.id };
}

export const EmotionBallConfig = {
  register: registerEmotion,
  get: (id: string): NormalizedEmotionConfig | null => registry.get(id) || null,
  list: (group?: string): NormalizedEmotionConfig[] =>
    order.map((id) => registry.get(id)!).filter((d) => !group || d.group === group),
  groups: (): EmotionGroup[] => EMOTION_GROUPS.slice(),
  exportConfig: (): string => JSON.stringify(order.map((id) => registry.get(id)!.raw), null, 2),
  importConfig: (json: string | object) => {
    let data: any;
    try {
      data = typeof json === 'string' ? JSON.parse(json) : json;
    } catch (e: any) {
      return { ok: false, added: 0, errors: ['JSON 解析失败：' + e.message] };
    }
    const arr = Array.isArray(data) ? data : [data];
    let added = 0;
    const errors: string[] = [];
    arr.forEach((raw) => {
      const r = registerEmotion(raw);
      if (r.ok) added++;
      else errors.push('[' + ((raw && raw.id) || '?') + '] ' + r.errors?.join('；'));
    });
    return { ok: errors.length === 0, added, errors };
  }
};

// Auto register seed emotions
EMOTION_SEED.forEach((raw) => registerEmotion(raw));

/* ---------------- 全局指针收集器 (O(1) 共享事件单例) ---------------- */

class GlobalPointerTracker {
  clientX = typeof window !== 'undefined' ? window.innerWidth / 2 : 0;
  clientY = typeof window !== 'undefined' ? window.innerHeight / 2 : 0;
  hasPointer = false;
  private listening = false;

  start() {
    if (this.listening || typeof window === 'undefined') return;
    this.listening = true;
    window.addEventListener('mousemove', this.onMove, { passive: true });
    window.addEventListener('mouseleave', this.onLeave, { passive: true });
  }

  private onMove = (e: MouseEvent) => {
    this.clientX = e.clientX;
    this.clientY = e.clientY;
    this.hasPointer = true;
  };

  private onLeave = () => {
    this.hasPointer = false;
  };
}

export const globalPointer = new GlobalPointerTracker();

/* ---------------- 全局共享 rAF 时钟 ---------------- */

const ticker = {
  set: new Set<EmotionEngine>(),
  raf: 0,
  add(e: EmotionEngine) {
    this.set.add(e);
    if (!this.raf) this.raf = requestAnimationFrame(ticker.loop);
  },
  remove(e: EmotionEngine) {
    this.set.delete(e);
  },
  loop(now: number) {
    ticker.raf = 0;
    ticker.set.forEach((e) => e._tick(now));
    if (ticker.set.size) ticker.raf = requestAnimationFrame(ticker.loop);
  }
};

/* ---------------- EmotionEngine ---------------- */

export class EmotionEngine implements EmotionBallInstance {
  ball: BallRenderer;
  _seed: number;
  _events: Record<string, ((payload: any) => void)[]> = {};
  _gaze = { x: 0, y: 0, tx: 0, ty: 0 };
  _style = { sketch: 0 };
  _theme: { body: string; eyes: string } | null;
  _eyeScale: number;
  _lastTick = 0;
  _dt = 1 / 60;
  _spin: Spring | null = null;

  /* 表情形变系统 */
  _ringSrc: [Point2D[], Point2D[]] = [EXPRESSIONS[0][0], EXPRESSIONS[0][1]];
  _ringDst: [Point2D[], Point2D[]] = [EXPRESSIONS[0][0], EXPRESSIONS[0][1]];
  _ringBuf: [Point2D[], Point2D[]] = [[], []];
  _ringCur: [Point2D[], Point2D[]] = this._ringDst;
  _ringSpring: Spring = spring(1);
  _ringSpeed = 7;
  _exprIdx = 0;
  _poolPos = 0;
  _poolNext = 0;

  /* 眨眼系统 */
  _open: Spring = spring(1);
  _blinkQ: { at: number; v: number }[] = [];
  _blinkNext = Infinity;

  /* 待机小动作 */
  _anticNext = 0;
  _bounceAt = -1;

  _def: NormalizedEmotionConfig | null = null;
  _lastPose: Pose | null = null;
  _prevPose: Pose | null = null;
  _transStart = 0;
  _transDur = 0;
  _emoStart = 0;
  _seq: { frames: { at: number; pose: Pose }[]; settle: 'base' | 'hold' | { next: string }; done: boolean } | null = null;
  _active = false;
  _touring = false;
  _tourTimer: any = 0;
  _fallbackId: string;
  _lastActivity = performance.now();
  _idle: { standbyAfter: number; sleepAfter: number; standbyId: string; sleepId: string } | null;
  _interactive = true;
  _containerEl: HTMLElement | null = null;

  constructor(target: HTMLElement | string, opts: EmotionBallOptions = {}) {
    const el = typeof target === 'string' ? (document.querySelector(target) as HTMLElement) : target;
    if (!el) throw new Error('EmotionBall.create：找不到容器元素');

    this._containerEl = el;
    this._interactive = opts.interactive !== false;
    if (this._interactive) globalPointer.start();

    this.ball = createBall(el, {
      ...opts,
      lite: opts.lite != null ? opts.lite : opts.autostart === false
    });
    this._seed = Math.random() * 100;
    this._theme = opts.color ? { body: opts.color, eyes: opts.eyeColor || '#FFFFFF' } : null;
    this._eyeScale = opts.eyeScale || 1;
    this._fallbackId = opts.fallbackId || FALLBACK_ID;

    if (opts.idle) {
      this._idle = {
        standbyAfter: 60000,
        sleepAfter: 180000,
        standbyId: '02',
        sleepId: '00',
        ...(opts.idle === true ? {} : opts.idle)
      };
    } else {
      this._idle = null;
    }

    this.setEmotion(opts.emotion || this._fallbackId, { auto: true });
    if (opts.autostart !== false) this.setActive(true);
    else this.renderStatic();
  }

  get emotionId(): string | null {
    return this._def ? this._def.id : null;
  }

  get touring(): boolean {
    return this._touring;
  }

  on(evt: 'change' | 'tips' | 'error', cb: (payload: any) => void): this {
    (this._events[evt] = this._events[evt] || []).push(cb);
    return this;
  }

  off(evt: 'change' | 'tips' | 'error', cb: (payload: any) => void): this {
    const list = this._events[evt];
    if (list) {
      const i = list.indexOf(cb);
      if (i >= 0) list.splice(i, 1);
    }
    return this;
  }

  _emit(evt: string, payload: any) {
    (this._events[evt] || []).slice().forEach((cb) => {
      try {
        cb(payload);
      } catch (e) {
        console.error(e);
      }
    });
  }

  setEmotion(id: string, o: { auto?: boolean } = {}): boolean {
    let def = EmotionBallConfig.get(id);
    if (!def) {
      console.warn(`[EmotionBall] 未知表情 ID "${id}"，回退到待机 (${this._fallbackId})`);
      this._emit('error', { message: `未知表情 ID "${id}"，已回退待机`, id });
      def = EmotionBallConfig.get(this._fallbackId);
      if (!def) return false;
    }
    const now = performance.now();
    const prevId = this._def ? this._def.id : null;
    this._prevPose = this._lastPose ? clonePose(this._lastPose) : null;
    this._def = def;
    this._emoStart = now;
    this._transStart = now;
    this._transDur = this._prevPose ? def.transition : 0;
    this._seq = def.sequence
      ? { frames: def.sequence.frames, settle: def.sequence.settle, done: false }
      : null;
    if (!o.auto) this._lastActivity = now;

    this._poolPos = 0;
    this._setExpr(def.pool[0], def.poolSpeed >= 10 ? 10 : 8);
    this._poolNext = now + rand(def.poolMs[0], def.poolMs[1]);
    if (prevId !== null && prevId !== def.id && def.blinkMs) this._blinkNow(now);
    this._blinkNext = def.blinkMs ? now + rand(def.blinkMs[0], def.blinkMs[1]) : Infinity;
    this._anticNext = now + rand(2500, 5000);

    this._emit('change', { id: def.id, def, auto: !!o.auto });

    if (this._active) {
      const fx = def.base.body;
      if (fx.ribbons > 0) this.spin(fx.ribbons >= 1 ? 2 : 1);
      if (fx.confetti > 0) this.burst(20);
    }
    if (!this._active) this.renderStatic();
    return true;
  }

  handleAIMessage(msg: AIMessagePayload | string): boolean {
    let obj: any = msg;
    if (typeof msg === 'string') {
      try {
        obj = JSON.parse(msg);
      } catch (e: any) {
        this._emit('error', { message: 'AI 消息 JSON 解析失败，已回退待机', raw: msg });
        this.setEmotion(this._fallbackId);
        return false;
      }
    }
    if (!obj || typeof obj !== 'object' || typeof obj.emotionId !== 'string') {
      this._emit('error', { message: 'AI 消息缺少 emotionId 字段，已回退待机', raw: msg });
      this.setEmotion(this._fallbackId);
      return false;
    }
    const ok = this.setEmotion(obj.emotionId);
    if (obj.tips) this._emit('tips', { text: String(obj.tips) });
    return ok;
  }

  setShape(shape: ShapeType) {
    this.ball.setShape(shape);
    if (!this._active) this.renderStatic();
  }

  startTour(ids?: string[], interval = 2500): void {
    this.stopTour();
    const list = ids && ids.length ? ids : EmotionBallConfig.list().map((d) => d.id);
    if (!list.length) return;
    this._touring = true;
    let i = 0;
    this.setEmotion(list[0], { auto: true });
    this._tourTimer = setInterval(() => {
      i = (i + 1) % list.length;
      this.setEmotion(list[i], { auto: true });
    }, interval);
  }

  stopTour(): void {
    if (this._tourTimer) {
      clearInterval(this._tourTimer);
      this._tourTimer = 0;
    }
    this._touring = false;
    this._lastActivity = performance.now();
  }

  resetIdle(): void {
    this._lastActivity = performance.now();
  }

  setGaze(nx: number, ny: number): void {
    this._gaze.tx = clamp(nx, -1, 1) * 24;
    this._gaze.ty = clamp(ny, -1, 1) * 15;
  }

  clearGaze(): void {
    this._gaze.tx = 0;
    this._gaze.ty = 0;
  }

  setTheme(theme: { body?: string; eyes?: string } | null): void {
    this._theme = theme ? { body: theme.body || '#F3F0EA', eyes: theme.eyes || '#FFFFFF' } : null;
    if (!this._active) this.renderStatic();
  }

  setSketch(sketch: boolean | number): void {
    this._style.sketch = typeof sketch === 'boolean' ? (sketch ? 1 : 0) : sketch;
    if (!this._active) this.renderStatic();
  }

  spin(turns = 1, dir?: number): void {
    if (this._spin) return;
    const d = dir || (Math.random() < 0.5 ? -1 : 1);
    this._spin = { x: 0, v: 0, t: Math.max(1, Math.round(turns)) * TAU * d };
  }

  burst(count = 20): void {
    this.ball.burst(count);
  }

  bounce(): void {
    if (this._bounceAt < 0) this._bounceAt = performance.now();
  }

  _setExpr(idx: number, speed = 7): void {
    if (idx === this._exprIdx && this._ringSpring.x >= 0.999) return;
    const s = clamp(this._ringSpring.x, 0, 1);
    this._ringSrc = [
      lerpRing(this._ringSrc[0], this._ringDst[0], s),
      lerpRing(this._ringSrc[1], this._ringDst[1], s)
    ];
    this._ringDst = [EXPRESSIONS[idx][0], EXPRESSIONS[idx][1]];
    this._ringSpring.x = 0;
    this._ringSpring.v = 0;
    this._ringSpring.t = 1;
    this._ringSpeed = speed;
    this._exprIdx = idx;
  }

  _blinkNow(t: number): void {
    this._blinkQ.push({ at: t, v: 0.05 }, { at: t + 70, v: 0.05 }, { at: t + 150, v: 1.08 }, { at: t + 300, v: 1 });
    if (Math.random() < 0.14) {
      this._blinkQ.push({ at: t + 370, v: 0.05 }, { at: t + 480, v: 1 });
    }
  }

  registerEmotion(raw: EmotionRawConfig) {
    return EmotionBallConfig.register(raw);
  }

  setActive(on: boolean): void {
    if (on === this._active) return;
    this._active = on;
    if (on) ticker.add(this);
    else ticker.remove(this);
  }

  replay(): void {
    if (this._def) this.setEmotion(this._def.id, { auto: true });
  }

  renderStatic(): void {
    this._transDur = 0;
    this._ringSpring.x = 1;
    this._ringSpring.v = 0;
    this._open.x = this._def ? this._def.openness : 1;
    this._open.v = 0;
    const seq = this._seq;
    this._seq = null;
    this._tick(performance.now());
    this._seq = seq;
  }

  destroy(): void {
    this.stopTour();
    this.setActive(false);
    this._events = {};
    this.ball.destroy();
  }

  _tick(now: number): void {
    this._dt = this._lastTick ? clamp((now - this._lastTick) / 1000, 0.001, 0.05) : 1 / 60;
    this._lastTick = now;
    if (this._idle && !this._touring) this._checkIdle(now);

    // Global Pointer Unified Gaze Sampling (O(1) centralized event model)
    if (this._interactive && this._containerEl && globalPointer.hasPointer) {
      const rect = this._containerEl.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (globalPointer.clientX - cx) / (window.innerWidth / 2);
        const dy = (globalPointer.clientY - cy) / (window.innerHeight / 2);
        this.setGaze(dx, dy);
      }
    } else if (this._interactive && !globalPointer.hasPointer && (this._gaze.tx !== 0 || this._gaze.ty !== 0)) {
      this.clearGaze();
    }

    const pose = this._compose(now, 0);
    this.ball.applyPose(pose);
    this._lastPose = pose;
  }

  _checkIdle(now: number): void {
    if (!this._idle) return;
    const elapsed = now - this._lastActivity;
    const cur = this.emotionId;
    if (elapsed >= this._idle.sleepAfter) {
      if (cur !== this._idle.sleepId) this.setEmotion(this._idle.sleepId, { auto: true });
    } else if (elapsed >= this._idle.standbyAfter) {
      if (cur !== this._idle.standbyId && cur !== this._idle.sleepId) {
        this.setEmotion(this._idle.standbyId, { auto: true });
      }
    }
  }

  _compose(now: number, depth: number): Pose {
    const def = this._def!;
    const t = now - this._emoStart;
    let pose: Pose;

    if (this._seq) {
      const res = this._seqPose(t, now);
      if (res === 'switch') {
        return depth < 4 ? this._compose(now, depth + 1) : clonePose(this._def!.base);
      }
      pose = res || clonePose(def.base);
    } else {
      pose = clonePose(def.base);
    }

    const br = pose.body.breathe || 0;
    if (br) {
      const ph = (TAU * now) / 3600;
      pose.body.scale += br * Math.sin(ph);
      pose.body.y += br * 55 * Math.sin(ph + 0.6);
    }

    for (let i = 0; i < def.anims.length; i++) applyAnim(pose, def.anims[i], t, this);

    pose.body.sketch = Math.max(pose.body.sketch || 0, this._style.sketch || 0);

    const dt = this._dt || 1 / 60;

    /* 表情池轮换 */
    if (this._active && now >= this._poolNext) {
      if (def.pool.length > 1) {
        this._poolPos = (this._poolPos + 1 + Math.floor(rand(0, def.pool.length - 1))) % def.pool.length;
        this._setExpr(def.pool[this._poolPos], def.poolSpeed);
      }
      this._poolNext = now + rand(def.poolMs[0], def.poolMs[1]);
    }

    /* 眨眼调度 */
    if (this._active && def.blinkMs && now >= this._blinkNext) {
      this._blinkNow(now);
      this._blinkNext = now + rand(def.blinkMs[0], def.blinkMs[1]);
    }
    let openKey: number | null = null;
    while (this._blinkQ.length && now >= this._blinkQ[0].at) {
      openKey = this._blinkQ[0].v;
      this._blinkQ.shift();
    }
    this._open.t = openKey != null ? openKey : this._blinkQ.length ? this._open.t : def.openness;

    /* 待机小动作 */
    if (this._active && def.antics && now >= this._anticNext) {
      if (!this._spin && this._bounceAt < 0) {
        const pick = Math.random();
        if (pick < 0.45) this.spin(1);
        else if (pick < 0.8) this.bounce();
        else this._blinkNow(now);
      }
      this._anticNext = now + rand(9000, 18000);
    }

    /* 弹簧整步 */
    const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
    const j = dt / steps;
    for (let si = 0; si < steps; si++) {
      springStep(this._ringSpring, this._ringSpeed, 1, j);
      springStep(this._open, 26, 1, j);
      if (this._spin) {
        springStep(this._spin, 6.2, 1, j);
        if (Math.abs(this._spin.t - this._spin.x) < 0.01 && Math.abs(this._spin.v) < 0.05) {
          this._spin = null;
        }
      }
    }
    pose.body.yaw = this._spin ? this._spin.x : 0;

    /* 弹跳位移 */
    if (this._bounceAt >= 0) {
      const be = (now - this._bounceAt) / 1000;
      if (be >= BOUNCE_TOTAL) {
        this._bounceAt = -1;
      } else {
        let acc = 0;
        let bi = 0;
        while (bi < BOUNCE_SEGS.length && be >= acc + BOUNCE_SEGS[bi].d) {
          acc += BOUNCE_SEGS[bi].d;
          bi++;
        }
        const seg = BOUNCE_SEGS[Math.min(bi, BOUNCE_SEGS.length - 1)];
        const bn = (be - acc) / seg.d;
        pose.body.y += -4 * seg.h * bn * (1 - bn);
      }
    }

    /* 当前眼环 (零 GC 原地缓冲复用) */
    if (this._ringSpring.x < 0.999 || this._ringSpring.v > 0.001 || this._ringSpring.v < -0.001) {
      const rs = clamp(this._ringSpring.x, 0, 1.35);
      lerpRingInPlace(this._ringBuf[0], this._ringSrc[0], this._ringDst[0], rs);
      lerpRingInPlace(this._ringBuf[1], this._ringSrc[1], this._ringDst[1], rs);
      this._ringCur = this._ringBuf;
    } else if (this._ringCur !== this._ringDst) {
      this._ringCur = this._ringDst;
    }
    pose.left.ring = this._ringCur[0];
    pose.right.ring = this._ringCur[1];

    /* 鼠标注视 */
    const k = 1 - Math.exp(-5.66 * dt);
    const gx = def.gaze !== false ? this._gaze.tx : 0;
    const gy = def.gaze !== false ? this._gaze.ty : 0;
    this._gaze.x += (gx - this._gaze.x) * k;
    this._gaze.y += (gy - this._gaze.y) * k;
    pose.left.lookX += this._gaze.x;
    pose.right.lookX += this._gaze.x;
    pose.left.lookY += this._gaze.y;
    pose.right.lookY += this._gaze.y;

    /* 常驻眼神微漂移 */
    if (def.gaze !== false) {
      const w = now / 1000;
      pose.left.lookX += 1.4 * Math.sin(0.42 * w) + 0.5 * Math.sin(1.0 * w);
      pose.right.lookX += 1.4 * Math.sin(0.42 * w + 1) + 0.5 * Math.sin(1.0 * w + 2);
      pose.left.lookY += 0.9 * Math.sin(0.58 * w);
      pose.right.lookY += 0.9 * Math.sin(0.58 * w + 1);
    }

    /* 尺寸缩放 */
    if (this._eyeScale !== 1) {
      pose.left.scaleX *= this._eyeScale;
      pose.left.scaleY *= this._eyeScale;
      pose.right.scaleX *= this._eyeScale;
      pose.right.scaleY *= this._eyeScale;
    }

    /* 主题色 */
    if (this._theme) {
      pose.body.color = this._theme.body;
      if (pose.left.color === DEFAULT_EYE.color) pose.left.color = this._theme.eyes;
      if (pose.right.color === DEFAULT_EYE.color) pose.right.color = this._theme.eyes;
    }

    /* 开合度 */
    const openS = clamp(this._open.x, 0.02, 1.5);
    pose.left.open = clamp(pose.left.open, 0, 1.3) * openS;
    pose.right.open = clamp(pose.right.open, 0, 1.3) * openS;
    pose.left.scaleX = Math.max(pose.left.scaleX, 0.05);
    pose.left.scaleY = Math.max(pose.left.scaleY, 0.05);
    pose.right.scaleX = Math.max(pose.right.scaleX, 0.05);
    pose.right.scaleY = Math.max(pose.right.scaleY, 0.05);

    /* 过渡插值 */
    const tt = now - this._transStart;
    if (this._transDur > 0 && tt < this._transDur && this._prevPose) {
      pose = lerpPose(this._prevPose, pose, easeInOutCubic(tt / this._transDur));
    }
    return pose;
  }

  _seqPose(t: number, now: number): Pose | 'switch' | null {
    const seq = this._seq!;
    const frames = seq.frames;
    const last = frames[frames.length - 1];

    if (t >= last.at) {
      if (!seq.done) {
        seq.done = true;
        const s = seq.settle;
        if (s === 'base') {
          this._prevPose = this._lastPose ? clonePose(this._lastPose) : clonePose(last.pose);
          this._transStart = now;
          this._transDur = this._def!.transition || 500;
          this._seq = null;
          return null;
        }
        if (s && typeof s === 'object' && s.next) {
          this.setEmotion(s.next, { auto: true });
          return 'switch';
        }
      }
      return clonePose(last.pose);
    }

    if (t <= frames[0].at) return clonePose(frames[0].pose);
    for (let i = 0; i < frames.length - 1; i++) {
      const a = frames[i];
      const b = frames[i + 1];
      if (t >= a.at && t < b.at) {
        const k = easeInOutCubic((t - a.at) / (b.at - a.at));
        return lerpPose(a.pose, b.pose, k);
      }
    }
    return clonePose(last.pose);
  }
}

export const EmotionBallCore = {
  create: (target: HTMLElement | string, opts?: EmotionBallOptions): EmotionEngine =>
    new EmotionEngine(target, opts),
  config: EmotionBallConfig,
  version: '1.0.0'
};
