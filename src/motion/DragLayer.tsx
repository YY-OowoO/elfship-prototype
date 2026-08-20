import { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { WorkCard } from "../ui";
import type { ResourceLane, WorkItem } from "../types";
import { prefersReduce } from "./prefers";
import { iosOut } from "./eases";

export type DragOrigin = {
  x: number;
  y: number;
  w: number;
  h: number;
  grabX: number;
  grabY: number;
};

export type DragApi = {
  follow: (x: number, y: number) => void;
  settle: (x: number, y: number) => Promise<void>;
};

let lastPointer: { x: number; y: number } | null = null;

export function seedDragPointer(x: number, y: number) {
  lastPointer = { x, y };
}

function layerXY(origin: DragOrigin) {
  if (!lastPointer) return { x: origin.x, y: origin.y };
  return {
    x: lastPointer.x - origin.grabX,
    y: lastPointer.y - origin.grabY,
  };
}

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
    const start = layerXY(origin);
    let raf = 0;
    let nextX = start.x;
    let nextY = start.y;
    let live = true;
    let settled = false;

    const paint = () => {
      raf = 0;
      if (!live) return;
      gsap.set(el, { x: nextX, y: nextY, force3D: true });
    };

    const moveTo = (x: number, y: number) => {
      if (!live) return;
      nextX = x;
      nextY = y;
      if (!raf) raf = window.requestAnimationFrame(paint);
    };

    gsap.killTweensOf(el);
    gsap.set(el, {
      x: nextX,
      y: nextY,
      scale: 1,
      rotation: 0,
      transformOrigin: "0 0",
      force3D: true,
    });

    const onMove = (event: PointerEvent) => {
      lastPointer = { x: event.clientX, y: event.clientY };
      moveTo(event.clientX - origin.grabX, event.clientY - origin.grabY);
    };
    window.addEventListener("pointermove", onMove, { capture: true });

    apiRef.current = {
      follow(x, y) {
        moveTo(x, y);
      },
      settle(x, y) {
        if (settled) return Promise.resolve();
        settled = true;
        live = false;
        window.removeEventListener("pointermove", onMove, { capture: true });
        if (raf) {
          window.cancelAnimationFrame(raf);
          raf = 0;
        }
        lastPointer = null;
        if (reduce) {
          gsap.set(el, { x, y, scale: 1, rotation: 0 });
          return Promise.resolve();
        }
        return new Promise((resolve) => {
          let done = false;
          const finish = () => {
            if (done) return;
            done = true;
            resolve();
          };
          gsap.to(el, {
            x,
            y,
            scale: 1,
            rotation: 0,
            duration: 0.22,
            ease: iosOut,
            overwrite: true,
            onComplete: finish,
            onInterrupt: finish,
          });
        });
      },
    };

    return () => {
      live = false;
      window.removeEventListener("pointermove", onMove, { capture: true });
      if (raf) window.cancelAnimationFrame(raf);
      if (apiRef.current) apiRef.current = null;
      gsap.killTweensOf(el);
    };
  }, [apiRef, lane.id, origin.grabX, origin.grabY, origin.x, origin.y]);

  return createPortal(
    <div ref={ref} className="k-drag-layer" style={{ width: origin.w, minHeight: origin.h }}>
      <WorkCard name={lane.name} item={item} extra={extra} onOpen={() => undefined} />
    </div>,
    document.body,
  );
}
