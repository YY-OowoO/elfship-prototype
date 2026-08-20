import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import gsap from "gsap";
import { prefersReduce } from "./prefers";
import { iosIn, iosOut } from "./eases";

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
  const liveRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const lastHtml = useRef("");
  const lastSig = useRef<string | null>(null);
  const tween = useRef<gsap.core.Timeline | null>(null);
  const [ghost, setGhost] = useState<string | null>(null);

  useLayoutEffect(() => {
    const live = liveRef.current;
    if (!live) return;

    const first = lastSig.current === null;
    const changed = lastSig.current !== sig;
    lastSig.current = sig;

    const snapshot = () => {
      lastHtml.current = live.innerHTML;
    };

    if (frozen || prefersReduce() || !changed) {
      if (!frozen) snapshot();
      return;
    }

    tween.current?.kill();
    const previous = first ? "" : lastHtml.current;
    if (previous) flushSync(() => setGhost(previous));
    else setGhost(null);

    const out = ghostRef.current;
    gsap.set(live, {
      transformOrigin: "50% 0%",
      rotateX: -38,
      y: -6,
      scale: 0.992,
      opacity: 0.45,
      force3D: true,
    });
    if (out) {
      gsap.set(out, {
        transformOrigin: "50% 0%",
        rotateX: 0,
        y: 0,
        scale: 1,
        opacity: 1,
        force3D: true,
      });
    }

    let done = false;
    const finish = () => {
      done = true;
      setGhost(null);
      gsap.set(live, { clearProps: "transform,opacity" });
      snapshot();
    };

    const tl = gsap.timeline({ delay, onComplete: finish });
    tween.current = tl;

    if (out) {
      tl.to(
        out,
        {
          rotateX: 42,
          y: 6,
          opacity: 0,
          duration: 0.26,
          ease: iosIn,
        },
        0,
      );
      tl.to(
        live,
        {
          rotateX: 0,
          y: 0,
          scale: 1,
          opacity: 1,
          duration: 0.46,
          ease: iosOut,
        },
        0.06,
      );
    } else {
      tl.to(live, {
        rotateX: 0,
        y: 0,
        scale: 1,
        opacity: 1,
        duration: 0.5,
        ease: iosOut,
      });
    }

    return () => {
      tl.kill();
      gsap.set(live, { clearProps: "transform,opacity" });
      if (out) gsap.set(out, { clearProps: "transform,opacity" });
      if (!done && first) lastSig.current = null;
    };
  }, [sig, delay, frozen]);

  return (
    <div className="kanban-flip">
      {ghost ? (
        <div
          ref={ghostRef}
          className="kanban-flip-ghost kanban-cards"
          aria-hidden
          dangerouslySetInnerHTML={{ __html: ghost }}
        />
      ) : null}
      <div ref={liveRef} className="kanban-flip-live kanban-cards">
        {children}
      </div>
    </div>
  );
}
