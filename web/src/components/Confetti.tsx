import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  spin: number;
  shape: "rect" | "circle";
}

export function Confetti({ fire }: { fire: number }): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (fire <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const colors = ["#d97757", "#f0c75e", "#5fa47a", "#5b8fc4", "#bf76a8", "#e08a4f"];
    const particles: Particle[] = [];
    for (const side of [-1, 1]) {
      for (let index = 0; index < 64; index += 1) {
        const spread = 0.22 + Math.random() * 0.32;
        const angle = -Math.PI / 2 - side * spread;
        const speed = 8 + Math.random() * 11;
        particles.push({
          x: side < 0 ? width * 0.02 : width * 0.98,
          y: height * 0.82,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 5 + Math.random() * 8,
          color: colors[Math.floor(Math.random() * colors.length)] ?? colors[0],
          rotation: Math.random() * Math.PI * 2,
          spin: (Math.random() - 0.5) * 0.3,
          shape: Math.random() < 0.35 ? "circle" : "rect",
        });
      }
    }

    const startedAt = performance.now();
    let frame = 0;
    const draw = (now: number): void => {
      const elapsed = now - startedAt;
      const alpha = Math.max(0, 1 - elapsed / 2800);
      context.clearRect(0, 0, width, height);
      for (const particle of particles) {
        particle.vx *= 0.985;
        particle.vy = particle.vy * 0.985 + 0.22;
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.rotation += particle.spin;
        context.save();
        context.globalAlpha = alpha;
        context.translate(particle.x, particle.y);
        context.rotate(particle.rotation);
        context.fillStyle = particle.color;
        if (particle.shape === "circle") {
          context.beginPath();
          context.arc(0, 0, particle.size / 2, 0, Math.PI * 2);
          context.fill();
        } else {
          context.fillRect(-particle.size / 2, -particle.size / 3, particle.size, particle.size * 0.66);
        }
        context.restore();
      }
      if (elapsed < 2800) {
        frame = window.requestAnimationFrame(draw);
      } else {
        context.clearRect(0, 0, width, height);
      }
    };
    frame = window.requestAnimationFrame(draw);
    return () => {
      window.cancelAnimationFrame(frame);
      context.clearRect(0, 0, width, height);
    };
  }, [fire]);

  return <canvas ref={canvasRef} className="confetti-canvas" aria-hidden="true" />;
}
