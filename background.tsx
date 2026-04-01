import { useEffect, useRef } from "react";

const dot_spacing = 36;
const dot_base_radius = 1.5;
const influence_radius = 70;
const max_radius = 5;
const ripple_speed = 0.10;
const ripple_decay = 0.025;
const ripple_push = 4.5;
const ripple_alpha = 0.22;
const ripple_radius_boost = 1.1;
const quiet_zone_width = 420;
const quiet_zone_height = 420;
const quiet_zone_min_effect = 0.2;

type MousePoint = {
  x: number;
  y: number;
};

type Ripple = {
  x: number;
  y: number;
  r: number;
  strength: number;
  born: number;
};

type Dot = {
  x: number;
  y: number;
  color: string;
  baseAlpha: number;
};

export default function InteractiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<MousePoint>({ x: -9999, y: -9999 });
  const animRef = useRef<number | null>(null);
  const ripplesRef = useRef<Ripple[]>([]);
  const lastMouseRef = useRef<MousePoint>({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const colors = [
      "#7a9ba8", 
      "#8fb3c0", 
      "#a0c4d0", 
      "#6a8fa0", 
      "#c5d8e0", 
      "#5a7f90"
    ];
    
    let dots: Dot[] = [];

    const buildDots = () => {
      dots = [];
      const cols = Math.ceil(canvas.width / dot_spacing) + 1;
      const rows = Math.ceil(canvas.height / dot_spacing) + 1;

      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          dots.push({
            x: col * dot_spacing,
            y: row * dot_spacing,
            color: colors[Math.floor(Math.random() * colors.length)],
            baseAlpha: 0.18 + Math.random() * 0.12,
          });
        }
      }
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      buildDots();
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const now = performance.now();
      const deltaX = mx - lastMouseRef.current.x;
      const deltaY = my - lastMouseRef.current.y;

      if (Math.sqrt(deltaX * deltaX + deltaY * deltaY) > 8 && mx > 0) {
        ripplesRef.current.push({ x: mx, y: my, r: 0, strength: 1, born: now });
        lastMouseRef.current = { x: mx, y: my };
      }

      ripplesRef.current = ripplesRef.current.filter((ripple) => ripple.strength > 0.02);
      for (const ripple of ripplesRef.current) {
        ripple.r += ripple_speed * 16;
        ripple.strength -= ripple_decay;
      }

      for (const dot of dots) {
        let offsetX = 0;
        let offsetY = 0;
        let radius = dot_base_radius;
        let alpha = dot.baseAlpha;
        const centerDx = (dot.x - canvas.width / 2) / quiet_zone_width;
        const centerDy = (dot.y - canvas.height / 2) / quiet_zone_height;
        const centerDistance = Math.sqrt(centerDx * centerDx + centerDy * centerDy);
        const quietZoneBlend =
          centerDistance >= 1
            ? 1
            : quiet_zone_min_effect +
              (1 - quiet_zone_min_effect) * centerDistance * centerDistance;

        const cursorDx = dot.x - mx;
        const cursorDy = dot.y - my;
        const cursorDistance = Math.sqrt(cursorDx * cursorDx + cursorDy * cursorDy);

        if (cursorDistance < influence_radius) {
          const influence = 1 - cursorDistance / influence_radius;
          const adjustedInfluence = influence * influence * quietZoneBlend;
          radius = dot_base_radius + (max_radius - dot_base_radius) * adjustedInfluence;
          alpha = dot.baseAlpha + (0.85 - dot.baseAlpha) * adjustedInfluence;

          const pushStrength = adjustedInfluence * 10;
          offsetX += (cursorDx / (cursorDistance + 0.001)) * pushStrength;
          offsetY += (cursorDy / (cursorDistance + 0.001)) * pushStrength;
        }

        for (const ripple of ripplesRef.current) {
          const rippleDx = dot.x - ripple.x;
          const rippleDy = dot.y - ripple.y;
          const rippleDistance = Math.sqrt(rippleDx * rippleDx + rippleDy * rippleDy);
          const rippleWidth = 30;
          const diff = rippleDistance - ripple.r;

          if (Math.abs(diff) < rippleWidth) {
            const wave = Math.cos((diff / rippleWidth) * Math.PI * 0.5);
            const intensity = wave * ripple.strength * ripple_push * quietZoneBlend;
            offsetX += (rippleDx / (rippleDistance + 0.001)) * intensity;
            offsetY += (rippleDy / (rippleDistance + 0.001)) * intensity;
            alpha = Math.min(0.9, alpha + wave * ripple.strength * ripple_alpha * quietZoneBlend);
            radius = Math.min(
              max_radius,
              radius + wave * ripple.strength * ripple_radius_boost * quietZoneBlend,
            );
          }
        }

        ctx.beginPath();
        ctx.arc(dot.x + offsetX, dot.y + offsetY, Math.max(0.5, radius), 0, Math.PI * 2);

        const red = Number.parseInt(dot.color.slice(1, 3), 16);
        const green = Number.parseInt(dot.color.slice(3, 5), 16);
        const blue = Number.parseInt(dot.color.slice(5, 7), 16);

        ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
        ctx.fill();
      }

      animRef.current = window.requestAnimationFrame(draw);
    };

    const handleMouseMove = (event: MouseEvent) => {
      mouseRef.current = { x: event.clientX, y: event.clientY };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -9999, y: -9999 };
    };

    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) {
        return;
      }

      mouseRef.current = { x: touch.clientX, y: touch.clientY };
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("resize", resize);

    resize();
    draw();

    return () => {
      if (animRef.current !== null) {
        window.cancelAnimationFrame(animRef.current);
      }

      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="interactive-background" aria-hidden="true" />;
}
