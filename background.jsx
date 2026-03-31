"use client";

import React, { useEffect, useRef } from "react";

const dot_spacing = 36;
const dot_base_radius = 1.5;
const influence_radius = 5;
const max_radius = 2;
const ripple_speed = 0.10;
const ripple_decay = 0.025;

export default function InteractiveBackground() {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const animRef = useRef(null);
  const ripplesRef = useRef([]);
  const lastMouseRef = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const colors = [
      "#7a9ba8",
      "#8fb3c0",
      "#a0c4d0",
      "#6a8fa0",
      "#c5d8e0",
      "#5a7f90",
    ];

    let dots = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      buildDots();
    };

    const buildDots = () => {
      dots = [];
      const cols = Math.ceil(canvas.width / dot_spacing) + 1;
      const rows = Math.ceil(canvas.height / dot_spacing) + 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          dots.push({
            x: c * dot_spacing,
            y: r * dot_spacing,
            color: colors[Math.floor(Math.random() * colors.length)],
            baseAlpha: 0.18 + Math.random() * 0.12,
          });
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const now = performance.now();

      // give ripple effect when mouse moves
      const dx0 = mx - lastMouseRef.current.x;
      const dy0 = my - lastMouseRef.current.y;
      if (Math.sqrt(dx0 * dx0 + dy0 * dy0) > 8 && mx > 0) {
        ripplesRef.current.push({ x: mx, y: my, r: 0, strength: 1.0, born: now });
        lastMouseRef.current = { x: mx, y: my };
      }

      // ripple animation
      ripplesRef.current = ripplesRef.current.filter(rip => rip.strength > 0.02);
      for (const rip of ripplesRef.current) {
        rip.r += ripple_speed * 16;
        rip.strength -= ripple_decay;
      }

      for (const dot of dots) {
        let offsetX = 0;
        let offsetY = 0;
        let radius = dot_base_radius;
        let alpha = dot.baseAlpha;

        // repulsion from the mouse
        const cdx = dot.x - mx;
        const cdy = dot.y - my;
        const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
        if (cdist < influence_radius) {
          const t = 1 - cdist / influence_radius;
          radius = dot_base_radius + (max_radius - dot_base_radius) * t * t;
          alpha = dot.baseAlpha + (0.85 - dot.baseAlpha) * t * t;

          // push strength increases with how close the dot is to the mouse
          const pushStrength = t * t * 10;
          offsetX += (cdx / (cdist + 0.001)) * pushStrength;
          offsetY += (cdy / (cdist + 0.001)) * pushStrength;
        }

        // ripple waves
        for (const rip of ripplesRef.current) {
          const rdx = dot.x - rip.x;
          const rdy = dot.y - rip.y;
          const rdist = Math.sqrt(rdx * rdx + rdy * rdy);
          const rippleWidth = 30;
          const diff = rdist - rip.r;
          
          if (Math.abs(diff) < rippleWidth) {
            const wave = Math.cos((diff / rippleWidth) * Math.PI * 0.5);
            const intensity = wave * rip.strength * 8;
            offsetX += (rdx / (rdist + 0.001)) * intensity;
            offsetY += (rdy / (rdist + 0.001)) * intensity;
            alpha = Math.min(0.9, alpha + wave * rip.strength * 0.5);
            radius = Math.min(max_radius, radius + wave * rip.strength * 2.5);
          }
        }

        ctx.beginPath();
        ctx.arc(dot.x + offsetX, dot.y + offsetY, Math.max(0.5, radius), 0, Math.PI * 2);
        const hex = dot.color;
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    const handleMouseMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const handleMouseLeave = () => {
      mouseRef.current = { x: -9999, y: -9999 };
    };
    const handleTouchMove = (e) => {
      const touch = e.touches[0];
      mouseRef.current = { x: touch.clientX, y: touch.clientY };
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("resize", resize);

    resize();
    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />
  );
}
