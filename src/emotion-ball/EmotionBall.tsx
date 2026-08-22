import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type CSSProperties,
  type MouseEvent
} from 'react';
import { EmotionEngine } from './engine';
import type {
  EmotionBallInstance,
  EmotionBallOptions,
  NormalizedEmotionConfig,
  ShapeType
} from './types';

export interface EmotionBallProps {
  emotion?: string;
  shape?: ShapeType;
  size?: number | string;
  color?: string;
  eyeColor?: string;
  eyeScale?: number;
  sketch?: boolean | number;
  interactive?: boolean;
  idle?: boolean | EmotionBallOptions['idle'];
  lite?: boolean;
  autostart?: boolean;
  label?: string;
  className?: string;
  style?: CSSProperties;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
  onEmotionChange?: (data: { id: string; def: NormalizedEmotionConfig; auto: boolean }) => void;
  onTips?: (data: { text: string }) => void;
  onError?: (data: { message: string; id?: string }) => void;
}

export const EmotionBall = forwardRef<EmotionBallInstance, EmotionBallProps>(function EmotionBall(
  {
    emotion = '02',
    shape = 'blob',
    size = 120,
    color,
    eyeColor,
    eyeScale,
    sketch = 0,
    interactive = true,
    idle = true,
    lite = false,
    autostart = true,
    label,
    className,
    style,
    onClick,
    onEmotionChange,
    onTips,
    onError
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<EmotionEngine | null>(null);

  // Initialize engine
  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new EmotionEngine(containerRef.current, {
      emotion,
      shape,
      color,
      eyeColor,
      eyeScale,
      sketch: typeof sketch === 'boolean' ? (sketch ? 1 : 0) : sketch,
      idle,
      lite,
      autostart,
      label
    });
    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Sync emotion
  useEffect(() => {
    if (engineRef.current && emotion && engineRef.current.emotionId !== emotion) {
      engineRef.current.setEmotion(emotion);
    }
  }, [emotion]);

  // Sync shape
  useEffect(() => {
    if (engineRef.current && shape) {
      engineRef.current.setShape(shape);
    }
  }, [shape]);

  // Sync color / theme
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setTheme(color ? { body: color, eyes: eyeColor } : null);
    }
  }, [color, eyeColor]);

  // Sync sketch
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setSketch(sketch);
    }
  }, [sketch]);

  // Event listeners
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const handleChange = (payload: any) => onEmotionChange?.(payload);
    const handleTips = (payload: any) => onTips?.(payload);
    const handleError = (payload: any) => onError?.(payload);

    engine.on('change', handleChange);
    engine.on('tips', handleTips);
    engine.on('error', handleError);

    return () => {
      engine.off('change', handleChange);
      engine.off('tips', handleTips);
      engine.off('error', handleError);
    };
  }, [onEmotionChange, onTips, onError]);

  useImperativeHandle(ref, () => engineRef.current!, []);

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (interactive && engineRef.current) {
      // Trigger a random interactive animation
      const r = Math.random();
      if (r < 0.45) {
        engineRef.current.spin(1);
      } else if (r < 0.75) {
        engineRef.current.bounce();
      } else {
        engineRef.current.burst(16);
      }
    }
    onClick?.(e);
  };

  const dim = typeof size === 'number' ? `${size}px` : size;

  return (
    <div
      ref={containerRef}
      className={`emotion-ball-container ${className || ''}`}
      style={{
        width: dim,
        height: dim,
        display: 'inline-block',
        position: 'relative',
        cursor: interactive ? 'pointer' : 'default',
        userSelect: 'none',
        ...style
      }}
      onClick={handleClick}
    />
  );
});
