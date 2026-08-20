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

    const ctx = gsap.context(() => {
      const bar = document.querySelector<HTMLElement>(".scroll-rail-fill");
      if (!bar) return;
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
            scrub: 0.15,
          },
        },
      );
    }, root);

    const onResize = () => ScrollTrigger.refresh();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      ctx.revert();
    };
  }, []);

  return (
    <div className="page view-in" id="main" ref={ref}>
      {children}
    </div>
  );
}
