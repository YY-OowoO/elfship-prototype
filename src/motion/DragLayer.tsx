import { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { WorkCard } from "../ui";
import type { ResourceLane, WorkItem } from "../types";
import { prefersReduce } from "./prefers";
import { iosOut, iosSpring } from "./eases";

export type DragOrigin = { x: number; y: number; w: number; h: number };

export type DragApi = {
  follow: (x: number, y: number, tilt: number) => void;
  settle: (x: number, y: number, scale?: number) => Promise<void>;
};

export function DragLayer({
  lane,
  item,
  extra,
  origin,
  apiRef,
}: {
  lane: ResourceLane;
  item: WorkItem;
  extra: string;
  origin: DragOrigin;
  apiRef: { current: DragApi | null };
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = prefersReduce();

    gsap.set(el, {
      x: origin.x,
      y: origin.y,
      scale: 1,
      rotation: 0,
      transformOrigin: "50% 50%",
      force3D: true,
    });

    if (reduce) {
      apiRef.current = {
        follow(x, y) {
          gsap.set(el, { x, y, rotation: 0 });
        },
        settle(x, y, scale = 1) {
          gsap.set(el, { x, y, scale, rotation: 0 });
          return Promise.resolve();
        },
      };
      return () => {
        apiRef.current = null;
      };
    }

    const xTo = gsap.quickTo(el, "x", { duration: 0.2, ease: iosOut });
    const yTo = gsap.quickTo(el, "y", { duration: 0.24, ease: iosOut });
    const rotTo = gsap.quickTo(el, "rotation", { duration: 0.3, ease: iosOut });

    gsap.to(el, { scale: 1.055, duration: 0.46, ease: iosSpring });

    apiRef.current = {
      follow(x, y, tilt) {
        xTo(x);
        yTo(y);
        rotTo(tilt);
      },
      settle(x, y, scale = 1) {
        return new Promise((resolve) => {
          gsap.to(el, {
            x,
            y,
            scale,
            rotation: 0,
            duration: 0.5,
            ease: iosOut,
            overwrite: true,
            onComplete: () => resolve(),
          });
        });
      },
    };

    return () => {
      apiRef.current = null;
      gsap.killTweensOf(el);
    };
  }, [apiRef, lane.id, origin.h, origin.w, origin.x, origin.y]);

  return createPortal(
    <div
      ref={ref}
      className="k-drag-layer"
      style={{
        width: origin.w,
        minHeight: origin.h,
        transform: `translate(${origin.x}px, ${origin.y}px)`,
      }}
    >
      <WorkCard name={lane.name} item={item} extra={extra} onOpen={() => undefined} />
    </div>,
    document.body,
  );
}
