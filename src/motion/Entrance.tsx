import { type ReactNode } from "react";
import { motion } from "motion/react";
import { prefersReduce } from "./prefers";

/**
 * 全站通用进场动效组件（批次列表 / 英雄区 / 我的待办等共用）。
 * 所有组件都尊重 prefers-reduced-motion：用户偏好减弱动效时直接渲染静态结果。
 */

/** 全站统一的动效缓动曲线，与 antd motionEaseOut 一致。 */
export const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

/**
 * 进场属性：淡入 + 上移，可直接展开到 motion 元素上。
 * 过渡写在 animate 内部（per-animation transition），
 * 这样与元素上已有的 whileHover/top-level transition 互不干扰。
 * 用户偏好减弱动效时返回空对象，元素保持完全静态。
 */
export function entrance(delay = 0, y = 12) {
  if (prefersReduce()) return {};
  return {
    initial: { opacity: 0, y },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, delay, ease: EASE },
    },
  };
}

/** 任意区块的进场包裹器（fade + rise）。 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 10,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  if (prefersReduce()) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** 动态进度条：挂载时从 0 平滑填充到目标百分比。 */
export function Fill({
  pct,
  delay = 0,
  className,
  background,
}: {
  pct: number;
  delay?: number;
  className?: string;
  background?: string;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  if (prefersReduce()) {
    return <div className={className} style={{ width: `${clamped}%`, background }} />;
  }
  return (
    <motion.div
      className={className}
      initial={{ width: "0%" }}
      animate={{ width: `${clamped}%` }}
      transition={{ duration: 0.7, delay, ease: EASE }}
      style={{ background }}
    />
  );
}
