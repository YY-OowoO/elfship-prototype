export type ShapeType = 'blob' | 'wedge' | 'gem';

export type Point2D = [number, number];

export interface ShapeDefinition {
  ring: Point2D[];
  face: {
    x: number;
    y: number;
    sx: number;
    sy: number;
    eye: number;
  };
  tiltScale: number;
}

export interface BodyPose {
  x: number;
  y: number;
  scale: number;
  rotate: number;
  color: string;
  breathe: number;
  ribbons: number;
  confetti: number;
  sketch: number;
  zzz: number;
  orbit: number;
  yaw?: number;
}

export interface EyePose {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotate: number;
  open: number;
  color: string;
  lookX: number;
  lookY: number;
  ring?: Point2D[];
}

export interface Pose {
  body: BodyPose;
  left: EyePose;
  right: EyePose;
}

export interface AnimConfig {
  target: 'eyes' | 'body' | 'left' | 'right';
  prop: string;
  type: 'sine' | 'pulse' | 'jitter' | 'scan' | 'glance' | 'blink';
  amp?: number;
  period?: number;
  phase?: number;
  speed?: number;
  decay?: number;
  phaseMs?: number;
  interval?: number;
  dur?: number;
  depth?: number;
}

export interface FrameConfig {
  at: number;
  body?: Partial<BodyPose>;
  eyes?: {
    both?: Partial<EyePose>;
    left?: Partial<EyePose>;
    right?: Partial<EyePose>;
  };
}

export interface SequenceConfig {
  frames: FrameConfig[];
  settle?: 'base' | 'hold' | { next: string };
}

export interface EmotionRawConfig {
  id: string;
  name: string;
  group: 'life' | 'emotion' | 'agent' | 'custom' | string;
  desc?: string;
  en?: {
    name: string;
    desc?: string;
  };
  transition?: number;
  gaze?: boolean;
  pool?: number[];
  poolMs?: [number, number];
  poolSpeed?: number;
  blinkMs?: [number, number] | null;
  openness?: number;
  antics?: boolean;
  body?: Partial<BodyPose>;
  eyes?: {
    both?: Partial<EyePose>;
    left?: Partial<EyePose>;
    right?: Partial<EyePose>;
  };
  anims?: AnimConfig[];
  sequence?: {
    frames: FrameConfig[];
    settle?: 'base' | 'hold' | { next: string };
  };
}

export interface EmotionGroup {
  key: string;
  name: string;
  en?: string;
}

export interface NormalizedEmotionConfig {
  id: string;
  name: string;
  group: string;
  desc: string;
  en: { name: string; desc?: string } | null;
  gaze: boolean;
  transition: number;
  pool: number[];
  poolMs: [number, number];
  poolSpeed: number;
  blinkMs: [number, number] | null;
  openness: number;
  antics: boolean;
  base: Pose;
  anims: AnimConfig[];
  sequence: {
    frames: { at: number; pose: Pose }[];
    settle: 'base' | 'hold' | { next: string };
  } | null;
  raw: EmotionRawConfig;
}

export interface AIMessagePayload {
  emotionId: string;
  tips?: string;
}

export interface EmotionBallOptions {
  emotion?: string;
  shape?: ShapeType;
  color?: string;
  eyeColor?: string;
  eyeScale?: number;
  sketch?: boolean | number;
  label?: string;
  lite?: boolean;
  autostart?: boolean;
  interactive?: boolean;
  idle?: boolean | {
    standbyAfter?: number;
    sleepAfter?: number;
    standbyId?: string;
    sleepId?: string;
  };
  fallbackId?: string;
}

export interface EmotionBallInstance {
  readonly emotionId: string | null;
  readonly touring: boolean;
  setEmotion(id: string, options?: { auto?: boolean }): boolean;
  handleAIMessage(msg: AIMessagePayload | string): boolean;
  spin(rotations?: number): void;
  burst(count?: number): void;
  bounce(): void;
  setGaze(x: number, y: number): void;
  clearGaze(): void;
  setTheme(theme: { body?: string; eyes?: string } | null): void;
  setSketch(sketch: boolean | number): void;
  startTour(ids?: string[], interval?: number): void;
  stopTour(): void;
  setActive(active: boolean): void;
  renderStatic(): void;
  registerEmotion(raw: EmotionRawConfig): { ok: boolean; id?: string; errors?: string[] };
  on(event: 'change' | 'tips' | 'error', callback: (payload: any) => void): this;
  off(event: 'change' | 'tips' | 'error', callback: (payload: any) => void): this;
  destroy(): void;
}
