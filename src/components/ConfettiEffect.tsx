import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  vRot: number;
  alpha: number;
  shape: "rect" | "circle" | "star";
}

const COLORS = [
  "#1677ff",
  "#52c41a",
  "#faad14",
  "#ff4d4f",
  "#13c2c2",
  "#722ed1",
  "#eb2f96",
  "#fa8c16",
  "#fadb14",
  "#a0d911",
];

export function ConfettiEffect({
  active,
  onComplete,
}: {
  active: boolean;
  onComplete?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight);

    const particles: Particle[] = [];
    const count = 120;

    for (let i = 0; i < count; i++) {
      const angle = (Math.random() * Math.PI) / 1.5 - Math.PI / 1.2;
      const speed = 12 + Math.random() * 18;
      particles.push({
        x: width * 0.5 + (Math.random() - 0.5) * 200,
        y: height * 0.85,
        vx: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1) * 0.8,
        vy: -Math.abs(Math.sin(angle) * speed) - 4,
        size: 6 + Math.random() * 8,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 12,
        alpha: 1,
        shape: Math.random() > 0.6 ? "rect" : Math.random() > 0.3 ? "circle" : "star",
      });
    }

    let animId: number;
    const startTime = Date.now();

    function render() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let alive = 0;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.45; // gravity
        p.vx *= 0.985; // air drag
        p.rotation += p.vRot;

        if (Date.now() - startTime > 1200) {
          p.alpha -= 0.02;
        }

        if (p.alpha > 0 && p.y < height + 40) {
          alive++;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillStyle = p.color;

          if (p.shape === "rect") {
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          } else if (p.shape === "circle") {
            ctx.beginPath();
            ctx.arc(0, 0, p.size * 0.45, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Star
            ctx.beginPath();
            for (let s = 0; s < 5; s++) {
              ctx.lineTo(
                Math.cos(((18 + s * 72) * Math.PI) / 180) * p.size * 0.5,
                -Math.sin(((18 + s * 72) * Math.PI) / 180) * p.size * 0.5
              );
              ctx.lineTo(
                Math.cos(((54 + s * 72) * Math.PI) / 180) * p.size * 0.25,
                -Math.sin(((54 + s * 72) * Math.PI) / 180) * p.size * 0.25
              );
            }
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();
        }
      }

      if (alive > 0) {
        animId = requestAnimationFrame(render);
      } else {
        onComplete?.();
      }
    }

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [active, onComplete]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 99999,
      }}
    />
  );
}
