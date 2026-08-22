import { useLayoutEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
const SIG_DELTA = 72;

export function KanbanFlip({
  sig,
  delay = 0,
  frozen = false,
  children,
}: {
  sig: string;
  delay?: number;
  frozen?: boolean;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  const lastSig = useRef<string | null>(null);

  useLayoutEffect(() => {
    lastSig.current = sig;
  }, [sig]);

  const animate =
    !frozen &&
    !reduce &&
    lastSig.current !== null &&
    Math.abs(sig.length - lastSig.current.length) <= SIG_DELTA;

  if (!animate) {
    return (
      <div className="kanban-flip">
        <div className="kanban-cards flip-pane">{children}</div>
      </div>
    );
  }

  return (
    <div className="kanban-flip">
      <AnimatePresence initial={false} mode="sync">
        <motion.div
          key={sig}
          className="kanban-cards flip-pane"
          initial={{ rotateX: -38, y: -6, scale: 0.992, opacity: 0.45 }}
          animate={{ rotateX: 0, y: 0, scale: 1, opacity: 1 }}
          exit={{ rotateX: 42, y: 6, opacity: 0 }}
          transition={{ delay, duration: 0.46, ease: EASE_OUT }}
          style={{
            transformOrigin: "50% 0%",
            transformStyle: "preserve-3d",
            backfaceVisibility: "hidden",
          }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}