import { HEAD_C, EYE_HALF, EXPRESSIONS, SHAPES, STAR_GOLD } from './rings';
import type { EmotionBallOptions, Point2D, Pose, ShapeType } from './types';

const SVGNS = 'http://www.w3.org/2000/svg';
let uid = 0;
const TAU = Math.PI * 2;
const CONFETTI_COLORS = ['#f9705c', '#5b95f0', '#3fbe86', '#f5b13f', '#9a72ee', '#35c3bd'];

const STAR_PATH = (function () {
  const pts: string[] = [];
  for (let e = 0; e < 10; e++) {
    const a = -Math.PI / 2 + (e * Math.PI) / 5;
    const r = e % 2 === 0 ? 1 : 0.42;
    pts.push((Math.cos(a) * r).toFixed(3) + ' ' + (Math.sin(a) * r).toFixed(3));
  }
  return 'M' + pts.join('L') + 'Z';
})();

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string>): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVGNS, tag);
  for (const k in attrs) node.setAttribute(k, attrs[k]);
  return node;
}

function r2(v: number): number {
  return Math.round(v * 100) / 100;
}

function clamp(v: number, a: number, b: number): number {
  return v < a ? a : v > b ? b : v;
}

function rand(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

function shade(hex: string, amt: number): string {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  const target = amt < 0 ? 0 : 255;
  const a = Math.abs(amt);
  r = Math.round(r + (target - r) * a);
  g = Math.round(g + (target - g) * a);
  b = Math.round(b + (target - b) * a);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

function ringPath(ring: Point2D[]): string {
  let s = 'M';
  for (let i = 0; i < ring.length; i++) {
    s += (i ? 'L' : '') + ring[i][0].toFixed(2) + ' ' + ring[i][1].toFixed(2);
  }
  return s + 'Z';
}

function centroid(ring: Point2D[]): Point2D {
  let x = 0;
  let y = 0;
  for (let i = 0; i < ring.length; i++) {
    x += ring[i][0];
    y += ring[i][1];
  }
  return [x / ring.length, y / ring.length];
}

interface OrbitPt {
  x: number;
  y: number;
  z: number;
  l: number;
}

interface OrbitParams {
  lam: number;
  lamVel: number;
  tilt: number;
  roll: number;
  rad: number;
  radVel: number;
  follow: number;
  carry: number;
  arc: number;
}

interface Trail {
  o: OrbitParams;
  r: number;
  life: number;
  ret: number;
  hist: OrbitPt[];
  orbitMode: boolean;
  hue: number;
  hueSpan: number;
  hueVel: number;
  gradEl: SVGLinearGradientElement;
  stops: SVGStopElement[];
  back: SVGPathElement;
  front: SVGPathElement;
}

interface ConfPiece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  r: number;
  rot: number;
  vr: number;
  stretch: number;
  el: SVGElement;
}

export interface BallRenderer {
  svg: SVGSVGElement;
  applyPose(pose: Pose): void;
  burst(count?: number): void;
  setShape(shape: ShapeType): void;
  destroy(): void;
}

export function createBall(container: HTMLElement, opts: EmotionBallOptions = {}): BallRenderer {
  const id = 'eb' + uid++;
  const lite = !!opts.lite;
  let shapeKey: ShapeType = (opts.shape as ShapeType) || 'blob';
  let shape = SHAPES[shapeKey] || SHAPES.blob;
  let face = shape.face;
  let headRing = shape.ring;

  /* ---- 形状轮廓采样：每 2px 一行的 [minX, maxX]，供眼睛贴合任意身体轮廓 ---- */
  let silMinY = 1e9;
  let silMaxY = -1e9;
  const SIL_STEP = 2;
  let silRows: [number, number][] = [];

  function buildSil() {
    silMinY = 1e9;
    silMaxY = -1e9;
    for (let i = 0; i < headRing.length; i++) {
      if (headRing[i][1] < silMinY) silMinY = headRing[i][1];
      if (headRing[i][1] > silMaxY) silMaxY = headRing[i][1];
    }
    silRows = [];
    const rows = Math.ceil((silMaxY - silMinY) / SIL_STEP) + 1;
    for (let r = 0; r < rows; r++) {
      const y = silMinY + r * SIL_STEP;
      let lo = 1e9;
      let hi = -1e9;
      for (let e = 0; e < headRing.length; e++) {
        const a = headRing[e];
        const b = headRing[(e + 1) % headRing.length];
        const y0 = a[1];
        const y1 = b[1];
        if ((y0 <= y && y1 >= y) || (y1 <= y && y0 >= y)) {
          const t = y1 === y0 ? 0 : (y - y0) / (y1 - y0);
          const x = a[0] + (b[0] - a[0]) * t;
          if (x < lo) lo = x;
          if (x > hi) hi = x;
        }
      }
      if (lo > hi) {
        lo = HEAD_C - 4;
        hi = HEAD_C + 4;
      }
      silRows.push([lo, hi]);
    }
  }
  buildSil();

  function silAt(y: number): [number, number] {
    const r = Math.round((clamp(y, silMinY, silMaxY) - silMinY) / SIL_STEP);
    return silRows[clamp(r, 0, silRows.length - 1)];
  }

  /* ---- SVG 骨架 ---- */
  const svg = el('svg', {
    viewBox: '-15 -15 259 259',
    width: '100%',
    height: '100%',
    role: 'img',
    'aria-label': opts.label || 'AI 表情小球'
  });
  svg.style.display = 'block';
  svg.style.overflow = 'visible';

  const defs = el('defs', {});
  const grad = el('radialGradient', { id: id + 'g', cx: '38%', cy: '32%', r: '75%' });
  const stopA = el('stop', { offset: '0%' });
  const stopB = el('stop', { offset: '62%' });
  const stopC = el('stop', { offset: '100%' });
  grad.appendChild(stopA);
  grad.appendChild(stopB);
  grad.appendChild(stopC);
  defs.appendChild(grad);
  svg.appendChild(defs);

  const fxBack = el('g', { 'pointer-events': 'none' });
  svg.appendChild(fxBack);

  const bodyG = el('g', {});
  const head = el('path', { d: ringPath(headRing), fill: 'url(#' + id + 'g)', stroke: 'none', 'stroke-width': '2' });
  bodyG.appendChild(head);

  interface EyeNode {
    node: SVGPathElement;
    ring: Point2D[];
    c: Point2D;
    lastFill?: string;
    lastStroke?: string;
  }

  function buildEye(k: number): EyeNode {
    const node = el('path', { fill: '#1A1A1A', stroke: 'none', 'stroke-width': '1.6' });
    node.setAttribute('d', ringPath(EXPRESSIONS[0][k]));
    return { node, ring: EXPRESSIONS[0][k], c: centroid(EXPRESSIONS[0][k]) };
  }

  const eyeL = buildEye(0);
  const eyeR = buildEye(1);
  bodyG.appendChild(eyeL.node);
  bodyG.appendChild(eyeR.node);
  svg.appendChild(bodyG);

  const fxFront = el('g', { 'pointer-events': 'none' });
  svg.appendChild(fxFront);

  const BASE_C: [Point2D, Point2D] = [centroid(EXPRESSIONS[0][0]), centroid(EXPRESSIONS[0][1])];

  /* ---- zzz 睡眠粒子 ---- */
  let zzzNodes: SVGTextElement[] | null = null;
  if (!lite) {
    zzzNodes = [];
    for (let zi = 0; zi < 3; zi++) {
      const zn = el('text', {
        x: '0',
        y: '0',
        fill: '#A8A296',
        opacity: '0',
        'font-family': "'Space Grotesk', 'Noto Sans SC', system-ui, sans-serif",
        'font-weight': '700',
        'font-style': 'italic',
        'text-anchor': 'middle'
      });
      zn.textContent = 'z';
      fxFront.appendChild(zn);
      zzzNodes.push(zn);
    }
  }

  container.appendChild(svg);

  /* ---- 彩带：3D 轨道拖尾 ---- */
  const trails: Trail[] = [];
  let planes: { tilt: number; roll: number }[] = [];
  let planeG = 4;
  let baseHue = 0;
  let spawnAt: number[] = [];
  let spawnIdx = 0;
  let wasFast = false;
  let prevYaw = 0;
  let prevNow = 0;
  let orbitNextAt = 0;
  const confPieces: ConfPiece[] = [];

  function makePlanes() {
    planes = [];
    const n = Math.random() < 0.45 ? 2 : 3;
    const roll0 = rand(-0.9, 0.9);
    for (let pi = 0; pi < n; pi++) {
      planes.push({
        tilt: rand(0.16, 0.72),
        roll: roll0 + pi * (Math.PI / n) + rand(-0.15, 0.15)
      });
    }
    planeG = Math.round(rand(4, 6));
    baseHue = rand(0, 360);
    spawnIdx = 0;
  }

  function orbitPoint(o: OrbitParams, lam: number): OrbitPt {
    const hx = o.rad * Math.sin(lam);
    const hy = -o.rad * Math.cos(lam) * Math.sin(o.tilt);
    const ca = Math.cos(o.roll);
    const sa = Math.sin(o.roll);
    return {
      x: HEAD_C + hx * ca - hy * sa,
      y: HEAD_C + hx * sa + hy * ca,
      z: Math.cos(lam) * Math.cos(o.tilt),
      l: lam
    };
  }

  function createTrail(cfg: { o: OrbitParams; r: number; hue: number; orbit?: boolean }) {
    if (trails.length > 8) return;
    const gradEl = el('linearGradient', { id: id + 'tg' + uid++, gradientUnits: 'userSpaceOnUse' });
    const stops: SVGStopElement[] = [];
    for (let s = 0; s < 5; s++) {
      const st = el('stop', { offset: (s / 4).toFixed(3) });
      gradEl.appendChild(st);
      stops.push(st);
    }
    defs.appendChild(gradEl);
    const fill = 'url(#' + gradEl.getAttribute('id') + ')';
    const back = el('path', { stroke: 'none', fill, opacity: '0' });
    const front = el('path', { stroke: 'none', fill, opacity: '0' });
    fxBack.appendChild(back);
    fxFront.appendChild(front);
    trails.push({
      o: cfg.o,
      r: cfg.r,
      life: 0,
      ret: 0,
      hist: [],
      orbitMode: !!cfg.orbit,
      hue: cfg.hue,
      hueSpan: rand(45, 95) * (Math.random() < 0.5 ? 1 : -1),
      hueVel: rand(18, 42) * (Math.random() < 0.5 ? 1 : -1),
      gradEl,
      stops,
      back,
      front
    });
  }

  function spawnTrail(lam0: number, dir: number) {
    const pl = planes[spawnIdx % planes.length];
    const tierStep = 38 / Math.max(planeG - 1, 1);
    const rw = planeG <= 3 ? rand(8, 10.5) : planeG === 4 ? rand(6.6, 8.6) : rand(5.6, 7.4);
    createTrail({
      o: {
        lam: lam0,
        lamVel: dir * rand(0.5, 1.1),
        tilt: pl.tilt + rand(-0.04, 0.04),
        roll: pl.roll + rand(-0.05, 0.05),
        rad: 116 + spawnIdx * tierStep + rand(-1.5, 1.5),
        radVel: rand(0, 2.5),
        follow: rand(0.74, 0.94),
        carry: 0,
        arc: rand(2.2, 3.4)
      },
      r: rw,
      hue: baseHue + (360 * spawnIdx) / Math.max(planeG, 1) + rand(-14, 14)
    });
    spawnIdx++;
  }

  function spawnOrbit(idx: number) {
    createTrail({
      orbit: true,
      o: {
        lam: rand(0, TAU),
        lamVel: (Math.random() < 0.5 ? -1 : 1) * rand(1.7, 2.3),
        tilt: rand(0.1, 0.22),
        roll: rand(-0.12, 0.12),
        rad: 124 + idx * 16,
        radVel: 0,
        follow: 0.8,
        carry: 0,
        arc: rand(2.4, 3.2)
      },
      r: rand(5.5, 7),
      hue: rand(0, 360)
    });
  }

  function buildTrail(pts: OrbitPt[], width: number) {
    const n = pts.length;
    const nx: number[] = [];
    const ny: number[] = [];
    for (let e = 0; e < n; e++) {
      const p0 = pts[e > 0 ? e - 1 : 0];
      const p1 = pts[e < n - 1 ? e + 1 : n - 1];
      let dx = p1.x - p0.x;
      let dy = p1.y - p0.y;
      const h = Math.hypot(dx, dy) || 1;
      dx /= h;
      dy /= h;
      const d = (width * (0.5 + (e / (n - 1)) * 0.5)) / 2;
      nx.push(-dy * d);
      ny.push(dx * d);
    }
    function cap(idx: number) {
      const hw = Math.max(Math.hypot(nx[idx], ny[idx]), 0.2);
      return 'A' + r2(hw) + ' ' + r2(hw) + ' 0 0 0 ';
    }
    function seg(a: number, b: number) {
      let s = '';
      for (let k = a; k <= b; k++) s += (k === a ? 'M' : 'L') + r2(pts[k].x + nx[k]) + ' ' + r2(pts[k].y + ny[k]);
      s += b === n - 1 ? cap(b) : 'L';
      for (let k = b; k >= a; k--) s += (k === b ? '' : 'L') + r2(pts[k].x - nx[k]) + ' ' + r2(pts[k].y - ny[k]);
      if (a === 0) s += cap(0) + r2(pts[0].x + nx[0]) + ' ' + r2(pts[0].y + ny[0]);
      return s + 'Z';
    }
    let front = '';
    let back = '';
    let d0 = 0;
    while (d0 < n) {
      const isF = pts[d0].z >= 0;
      let i2 = d0;
      while (i2 + 1 < n && pts[i2 + 1].z >= 0 === isF) i2++;
      const a2 = Math.max(d0 - 1, 0);
      const b2 = Math.min(i2 + 1, n - 1);
      if (b2 > a2) {
        const str = seg(a2, b2);
        if (isF) front += str;
        else back += str;
      }
      d0 = i2 + 1;
    }
    return { front, back };
  }

  function removeTrail(idx: number) {
    const rb = trails[idx];
    rb.back.remove();
    rb.front.remove();
    rb.gradEl.remove();
    trails.splice(idx, 1);
  }

  function burst(count = 20) {
    if (lite) return;
    for (let i = 0; i < count && confPieces.length < 60; i++) {
      const ang = (i / count) * TAU + rand(-0.35, 0.35);
      const spd = rand(170, 360);
      const star = Math.random() < 0.18;
      const round = !star && Math.random() < 0.3;
      let node: SVGElement;
      if (star) node = el('path', { d: STAR_PATH, fill: STAR_GOLD });
      else if (round) node = el('circle', { r: '1', fill: CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0] });
      else node = el('rect', { x: '-0.5', y: '-0.5', width: '1', height: '1', rx: '0.24', fill: CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0] });
      fxFront.appendChild(node);
      confPieces.push({
        x: HEAD_C + Math.cos(ang) * rand(96, 116),
        y: HEAD_C + Math.sin(ang) * rand(96, 116),
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - rand(20, 75),
        life: 0,
        max: rand(0.45, 0.85),
        r: star ? rand(4, 7) : rand(3.5, 8),
        rot: rand(0, 360),
        vr: rand(-260, 260),
        stretch: !star && !round ? 1.9 : 1,
        el: node
      });
    }
  }

  let curBodyColor: string | null = null;
  let curSketch = -1;

  function setBodyColor(color: string) {
    if (color === curBodyColor) return;
    curBodyColor = color;
    stopA.setAttribute('stop-color', shade(color, 0.22));
    stopB.setAttribute('stop-color', color);
    stopC.setAttribute('stop-color', shade(color, -0.12));
    if (curSketch > 0.5) head.style.stroke = 'var(--sketch-ink, ' + shade(color, -0.6) + ')';
  }

  function setEye(eye: EyeNode, pose: Pose['left'], k: number, sketch: number, yaw: number) {
    const ring = pose.ring;
    if (ring && ring !== eye.ring) {
      eye.ring = ring;
      eye.node.setAttribute('d', ringPath(ring));
      eye.c = centroid(ring);
    }

    const base = eye.c || BASE_C[k];
    const open = clamp(pose.open, 0.02, 2.4);
    const sy = clamp(pose.scaleY * open * face.eye, 0.02, 2.4);
    const sxBase = pose.scaleX * face.eye;

    const halfH = EYE_HALF * sy + 2;
    let ey0 = HEAD_C + face.y + (base[1] - HEAD_C) * face.sy + pose.y + pose.lookY;
    ey0 = clamp(ey0, silMinY + halfH, silMaxY - halfH);

    const sil = silAt(ey0);
    const cx0 = (sil[0] + sil[1]) / 2;
    const hw = Math.max((sil[1] - sil[0]) / 2, 12);

    const ox = face.x + (base[0] - HEAD_C) * face.sx + pose.x + pose.lookX;
    const theta = clamp(ox / hw, -1.15, 1.15);
    const total = theta + (yaw || 0);
    const cn = Math.cos(total);
    if (cn <= 0.02) {
      eye.node.style.display = 'none';
      return;
    }
    eye.node.style.display = '';
    const ex = cx0 + hw * Math.sin(total) * 0.985;
    const dyN = (ey0 - HEAD_C) / 130;
    const fy = Math.sqrt(1 - dyN * dyN * 0.22);

    eye.node.setAttribute(
      'transform',
      'translate(' +
        r2(ex) +
        ' ' +
        r2(ey0) +
        ')' +
        (pose.rotate ? ' rotate(' + r2(pose.rotate) + ')' : '') +
        ' scale(' +
        r2(sxBase * cn) +
        ' ' +
        r2(sy * fy) +
        ')' +
        ' translate(' +
        r2(-base[0]) +
        ' ' +
        r2(-base[1]) +
        ')'
    );

    const fill = sketch > 0.5 ? 'none' : pose.color;
    const stroke = sketch > 0.5 ? 'var(--sketch-ink, ' + pose.color + ')' : '';
    if (fill !== eye.lastFill) {
      eye.node.setAttribute('fill', fill);
      eye.lastFill = fill;
    }
    if (stroke !== eye.lastStroke) {
      eye.node.style.stroke = stroke;
      eye.lastStroke = stroke;
    }
  }

  function applyPose(pose: Pose) {
    const b = pose.body;
    const now = performance.now();
    const sketch = b.sketch || 0;

    bodyG.setAttribute(
      'transform',
      'translate(' +
        r2(HEAD_C + b.x) +
        ' ' +
        r2(HEAD_C + b.y) +
        ')' +
        ' rotate(' +
        r2(b.rotate || 0) +
        ')' +
        ' scale(' +
        r2(b.scale) +
        ')' +
        ' translate(' +
        r2(-HEAD_C) +
        ' ' +
        r2(-HEAD_C) +
        ')'
    );
    setBodyColor(b.color);

    if (sketch !== curSketch) {
      curSketch = sketch;
      if (sketch > 0.5) {
        head.setAttribute('fill', 'none');
        head.style.stroke = 'var(--sketch-ink, ' + shade(b.color, -0.6) + ')';
        head.setAttribute('stroke-opacity', '0.85');
      } else {
        head.setAttribute('fill', 'url(#' + id + 'g)');
        head.style.stroke = '';
      }
    }

    const yaw = b.yaw || 0;
    setEye(eyeL, pose.left, 0, sketch, yaw);
    setEye(eyeR, pose.right, 1, sketch, yaw);

    if (lite) return;

    const dt = prevNow ? clamp((now - prevNow) / 1000, 0.001, 0.05) : 1 / 60;
    prevNow = now;

    /* ---- zzz 粒子 ---- */
    if (zzzNodes) {
      const zOn = (b.zzz || 0) > 0;
      for (let z = 0; z < zzzNodes.length; z++) {
        const znode = zzzNodes[z];
        if (!zOn) {
          if (znode.getAttribute('opacity') !== '0') znode.setAttribute('opacity', '0');
          continue;
        }
        const zp = (now * 0.00033 + z / 3) % 1;
        const zo = (zp < 0.18 ? zp / 0.18 : 1 - (zp - 0.18) / 0.82) * 0.8 * b.zzz;
        znode.setAttribute('opacity', zo.toFixed(3));
        znode.setAttribute('font-size', (12 + zp * 11).toFixed(1));
        znode.setAttribute(
          'transform',
          'translate(' + r2(180 + zp * 34 + 4 * Math.sin(zp * 9)) + ' ' + r2(48 - zp * 42) + ') rotate(' + r2(-10 + zp * 14) + ')'
        );
      }
    }

    /* ---- 自旋角速度（甩带触发源） ---- */
    let dYaw = yaw - prevYaw;
    if (!isFinite(dYaw) || Math.abs(dYaw) > 1.2) dYaw = 0;
    prevYaw = yaw;
    const vel = dYaw / dt;
    const fast = Math.abs(vel) >= 0.9;
    const dir = vel >= 0 ? 1 : -1;

    if (fast && !wasFast) {
      makePlanes();
      spawnAt = [];
      for (let q = 0; q < planeG; q++) spawnAt.push(now + q * rand(55, 105));
    }
    if (!fast) spawnAt.length = 0;
    wasFast = fast;
    if (Math.abs(vel) >= 5) {
      while (spawnAt.length && now >= spawnAt[0]) {
        spawnAt.shift();
        spawnTrail(yaw - rand(0, 0.18) * dir, dir);
      }
    }

    /* ---- 常驻环带补给 ---- */
    const orbitWant = (b.orbit || 0) > 0;
    if (orbitWant && now >= orbitNextAt) {
      let orbitCount = 0;
      for (let oc = 0; oc < trails.length; oc++) if (trails[oc].orbitMode) orbitCount++;
      if (orbitCount < 2) spawnOrbit(orbitCount);
      orbitNextAt = now + 700;
    }

    /* ---- 彩带逐帧更新 ---- */
    for (let ti = trails.length - 1; ti >= 0; ti--) {
      const rb = trails[ti];
      rb.life += dt;
      const retract = rb.orbitMode ? !orbitWant : !fast || rb.life > 5;
      rb.ret = clamp(rb.ret + (retract ? dt / 0.5 : -dt / 0.35), 0, 1);
      if (retract && rb.ret >= 1) {
        removeTrail(ti);
        continue;
      }
      const o = rb.o;
      if (rb.orbitMode) {
        o.lam += o.lamVel * dt + dYaw * o.follow;
      } else if (fast) {
        o.carry = vel * o.follow;
        o.lam += dYaw * o.follow + o.lamVel * dt;
      } else {
        o.lam += (o.carry + o.lamVel) * dt;
        o.carry *= Math.exp(-2.6 * dt);
        o.lamVel *= Math.exp(-2.6 * dt);
      }
      o.rad += o.radVel * dt;

      const hist = rb.hist;
      const lastL = hist.length ? hist[hist.length - 1].l : o.lam - 0.001 * dir;
      const dl = o.lam - lastL;
      const steps = Math.min(Math.ceil(Math.abs(dl) / 0.09), 24);
      for (let st = 1; st <= steps; st++) hist.push(orbitPoint(o, lastL + (dl * st) / steps));
      if (!hist.length) hist.push(orbitPoint(o, o.lam));

      const span = o.arc * (1 - rb.ret * rb.ret * (3 - 2 * rb.ret));
      while (hist.length > 2 && Math.abs(o.lam - hist[0].l) > span) hist.shift();
      const over = Math.abs(o.lam - hist[0].l) - span;
      if (hist.length >= 2 && over > 0) {
        const tl = hist[0].l + (o.lam - hist[0].l >= 0 ? 1 : -1) * over;
        hist[0] = orbitPoint(o, tl);
      }
      if (hist.length > 48) hist.splice(0, hist.length - 48);

      const zHead = Math.cos(o.lam) * Math.cos(o.tilt);
      const pz = 0.72 + 0.28 * clamp(zHead, 0, 1);
      let grow = Math.min(rb.life / 0.34, 1);
      grow = grow * grow * (3 - 2 * grow);
      const width = rb.r * pz * 1.7 * grow * (1 - 0.72 * rb.ret * rb.ret);
      const fade = Math.min(rb.life / 0.26, 1).toFixed(3);

      if (hist.length < 2 || width < 0.5) {
        rb.back.setAttribute('opacity', '0');
        rb.front.setAttribute('opacity', '0');
        continue;
      }
      const dstr = buildTrail(hist, width);
      rb.back.setAttribute('d', dstr.back);
      rb.front.setAttribute('d', dstr.front);
      rb.back.setAttribute('opacity', fade);
      rb.front.setAttribute('opacity', fade);

      const hue = rb.hue + rb.hueVel * rb.life;
      for (let si = 0; si < rb.stops.length; si++) {
        const frac = si / (rb.stops.length - 1);
        const hv = hue + frac * rb.hueSpan;
        rb.stops[si].setAttribute(
          'stop-color',
          'hsl(' + ((((hv % 360) + 360) % 360).toFixed(0) + ' 56% ' + (56 + 11 * frac).toFixed(0) + '%)')
        );
      }
      const tail = hist[0];
      const headP = hist[hist.length - 1];
      rb.gradEl.setAttribute('x1', tail.x.toFixed(1));
      rb.gradEl.setAttribute('y1', tail.y.toFixed(1));
      rb.gradEl.setAttribute('x2', headP.x.toFixed(1));
      rb.gradEl.setAttribute('y2', headP.y.toFixed(1));
    }

    /* ---- 撒花更新 ---- */
    for (let ci = confPieces.length - 1; ci >= 0; ci--) {
      const pc = confPieces[ci];
      pc.life += dt;
      if (pc.life >= pc.max) {
        pc.el.remove();
        confPieces.splice(ci, 1);
        continue;
      }
      pc.x += pc.vx * dt;
      pc.y += pc.vy * dt;
      const drag = Math.pow(0.94, 60 * dt);
      pc.vx *= drag;
      pc.vy = pc.vy * drag + 40 * dt;
      pc.rot += pc.vr * dt;
      const u = pc.life / pc.max;
      const fd = u < 0.1 ? u / 0.1 : Math.pow(1 - (u - 0.1) / 0.9, 1.7);
      const sz = Math.max(pc.r * (1 - 0.4 * u), 0.5);
      pc.el.setAttribute('opacity', fd.toFixed(3));
      pc.el.setAttribute(
        'transform',
        'translate(' + r2(pc.x) + ' ' + r2(pc.y) + ') rotate(' + r2(pc.rot) + ') scale(' + r2(sz) + ' ' + r2(sz * pc.stretch) + ')'
      );
    }
  }

  function setShape(newShapeKey: ShapeType) {
    if (newShapeKey === shapeKey) return;
    shapeKey = newShapeKey;
    shape = SHAPES[shapeKey] || SHAPES.blob;
    face = shape.face;
    headRing = shape.ring;
    buildSil();
    head.setAttribute('d', ringPath(headRing));
  }

  function destroy() {
    if (svg.parentNode) svg.parentNode.removeChild(svg);
  }

  return { svg, applyPose, burst, setShape, destroy };
}
