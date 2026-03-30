"use client";
import { useRef, useEffect, useCallback } from "react";
import styles from "./Background.module.css";

const throttle = (func, limit) => {
  let lastCall = 0;
  return function (...args) {
    const now = performance.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      func.apply(this, args);
    }
  };
};

const DotGrid = ({
  dotSize = 16,
  gap = 20,
  maxSpeed = 5000,
  className = "",
  style,
}) => {
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const dotsRef = useRef([]);

  const pointerRef = useRef({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    vx: 0,
    vy: 0,
    lastMoveTime: 0,
    lastTime: 0,
    lastX: 0,
    lastY: 0,
  });

  const buildGrid = useCallback(() => {
    const wrap = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const { width, height } = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(dpr, dpr);

    const cols = Math.floor((width + gap) / (dotSize + gap));
    const rows = Math.floor((height + gap) / (dotSize + gap));
    const cell = dotSize + gap;

    const startX = (width - (cell * cols - gap)) / 2 + dotSize / 2;
    const startY = (height - (cell * rows - gap)) / 2 + dotSize / 2;

    const dots = [];

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        dots.push({
          cx: startX + x * cell,
          cy: startY + y * cell,
          xOffset: 0,
          yOffset: 0,
          vx: 0,
          vy: 0,
          life: 0,
        });
      }
    }

    dotsRef.current = dots;
  }, [dotSize, gap]);

  useEffect(() => {
    let rafId;

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const pr = pointerRef.current;
      const now = performance.now();
      const isMoving = now - pr.lastMoveTime < 50;

      if (!isMoving) {
        pr.vx = 0;
        pr.vy = 0;
      }

      // smooth cursor follow
      pr.x += (pr.targetX - pr.x) * 0.25;
      pr.y += (pr.targetY - pr.y) * 0.25;

      for (const dot of dotsRef.current) {
        const dx = dot.cx - pr.x;
        const dy = dot.cy - pr.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const influence = 100;

        if (isMoving && dist < influence) {
          const force = 1 - dist / influence;
          dot.vx += pr.vx * 0.0006 * force;
          dot.vy += pr.vy * 0.0006 * force;
        }

        if (!isMoving) {
          dot.vx = 0;
          dot.vy = 0;
        } else {
          dot.vx *= 0.9;
          dot.vy *= 0.9;
        }

        dot.xOffset += dot.vx - dot.xOffset * 0.02;
        dot.yOffset += dot.vy - dot.yOffset * 0.02;

        const speed = Math.hypot(dot.vx, dot.vy);
        const rawIntensity = Math.min(1, speed * 0.05);

        // 🌊 grow + fade system
        dot.life = Math.max(dot.life, rawIntensity);
        dot.life *= 0.92;

        const alpha = Math.min(1, dot.life * 1.4);
        if (alpha < 0.01) continue;

        const hueShift = (dot.cx + dot.cy) * 0.05;
        const r = 122 + Math.sin(hueShift) * 20;
        const g = 155 + Math.cos(hueShift) * 20;
        const b = 168;

        const glowBoost = 2;
        const fill = `rgba(${r * glowBoost}, ${g * glowBoost}, ${b * glowBoost}, ${alpha})`;

        const scale = 1 + dot.life * 0.4;

        const ox = dot.cx + dot.xOffset;
        const oy = dot.cy + dot.yOffset;

        ctx.save();
        ctx.translate(ox, oy);
        ctx.scale(scale, scale);

        ctx.fillStyle = fill;
        ctx.shadowColor = fill;
        ctx.shadowBlur = 100;

        // soft outer glow
        ctx.beginPath();
        ctx.arc(0, 0, dotSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.2})`;
        ctx.fill();

        // main dot
        ctx.beginPath();
        ctx.arc(0, 0, dotSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = fill;
        ctx.fill();

        ctx.restore();
      }

      rafId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(rafId);
  }, [dotSize]);

  useEffect(() => {
    buildGrid();

    let ro;
    if ("ResizeObserver" in window) {
      ro = new ResizeObserver(buildGrid);
      wrapperRef.current && ro.observe(wrapperRef.current);
    } else {
      window.addEventListener("resize", buildGrid);
    }

    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", buildGrid);
    };
  }, [buildGrid]);

  useEffect(() => {
    const onMove = (e) => {
      const pr = pointerRef.current;

      const now = performance.now();
      const dt = pr.lastTime ? now - pr.lastTime : 16;

      const dx = e.clientX - pr.lastX;
      const dy = e.clientY - pr.lastY;

      let vx = (dx / dt) * 1000;
      let vy = (dy / dt) * 1000;

      const speed = Math.hypot(vx, vy);

      if (speed > maxSpeed) {
        const scale = maxSpeed / speed;
        vx *= scale;
        vy *= scale;
      }

      pr.vx = vx;
      pr.vy = vy;
      pr.lastTime = now;
      pr.lastX = e.clientX;
      pr.lastY = e.clientY;
      pr.lastMoveTime = now;

      const rect = canvasRef.current.getBoundingClientRect();
      pr.targetX = e.clientX - rect.left;
      pr.targetY = e.clientY - rect.top;
    };

    const throttledMove = throttle(onMove, 50);
    window.addEventListener("mousemove", throttledMove, { passive: true });

    return () => {
      window.removeEventListener("mousemove", throttledMove);
    };
  }, [maxSpeed]);

  return (
    <section className={`${styles.root} ${className}`} style={style}>
      <div ref={wrapperRef} className={styles.wrap}>
        <canvas ref={canvasRef} className={styles.canvas} />
      </div>
    </section>
  );
};

export default DotGrid;
