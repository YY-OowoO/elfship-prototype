import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReduce } from "./prefers";

gsap.registerPlugin(ScrollTrigger);

export function BoardScroll({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (prefersReduce()) return;

    root.classList.add("gsap-on");
    let lockSnap = false;

    const block = (event: Event) => {
      const t = event.target;
      if (!(t instanceof Element)) return;
      if (t.closest(".kanban, .res-table, .ant-select, .ant-picker, .ant-modal, .res-occupy")) {
        lockSnap = true;
      }
    };
    const release = () => {
      window.setTimeout(() => {
        lockSnap = false;
      }, 160);
    };
    root.addEventListener("pointerdown", block);
    window.addEventListener("pointerup", release);

    const ctx = gsap.context(() => {
      const panes = gsap.utils.toArray<HTMLElement>(".snap-pane");
      panes.forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0.7, y: 16 },
          {
            opacity: 1,
            y: 0,
            duration: 0.42,
            ease: "power3.out",
            scrollTrigger: {
              scroller: root,
              trigger: el,
              start: "top 94%",
              toggleActions: "play none none none",
            },
          },
        );
      });

      const flowCols = root.querySelectorAll(".kanban-col");
      if (flowCols.length > 0) {
        gsap.fromTo(
          flowCols,
          { y: 12, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.36,
            stagger: 0.04,
            ease: "power3.out",
            delay: 0.05,
            clearProps: "transform",
          },
        );
      }

      const occupyKids = root.querySelectorAll(".res-occupy-seg");
      if (occupyKids.length > 0) {
        gsap.fromTo(
          occupyKids,
          { opacity: 0, y: 6 },
          {
            opacity: 1,
            y: 0,
            duration: 0.28,
            stagger: 0.04,
            ease: "power2.out",
            scrollTrigger: {
              scroller: root,
              trigger: ".res-occupy",
              start: "top 96%",
              toggleActions: "play none none none",
            },
          },
        );
      }

      const bar = document.querySelector<HTMLElement>(".scroll-rail-fill");
      if (bar) {
        gsap.fromTo(
          bar,
          { scaleX: 0 },
          {
            scaleX: 1,
            ease: "none",
            scrollTrigger: {
              scroller: root,
              start: 0,
              end: "max",
              scrub: 0.2,
            },
          },
        );
      }

      let snapReady = false;
      window.setTimeout(() => {
        snapReady = true;
      }, 700);

      const snapTo = (progress: number) => {
        if (!snapReady || lockSnap) return progress;
        const max = root.scrollHeight - root.clientHeight;
        if (max <= 0) return progress;
        const starts = panes.map((el) => Math.min(1, Math.max(0, el.offsetTop / max)));
        let nearest = starts[0] ?? 0;
        let best = 1;
        for (const start of starts) {
          const d = Math.abs(start - progress);
          if (d < best) {
            best = d;
            nearest = start;
          }
        }
        return nearest;
      };

      ScrollTrigger.create({
        scroller: root,
        start: 0,
        end: "max",
        snap: {
          snapTo,
          duration: { min: 0.16, max: 0.3 },
          ease: "power2.out",
          delay: 0.04,
        },
      });
    }, root);

    const onResize = () => ScrollTrigger.refresh();
    window.addEventListener("resize", onResize);

    return () => {
      root.removeEventListener("pointerdown", block);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("resize", onResize);
      ctx.revert();
    };
  }, []);

  return (
    <div className="page" id="main" ref={ref}>
      {children}
    </div>
  );
}
