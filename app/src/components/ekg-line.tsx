"use client";
import { useEffect, useRef } from "react";

interface Props {
  className?: string;
  bpm?: number;
  pulseSignal?: number; // increment to trigger spike
}

// Continuous EKG / proof-of-life line. Externally triggered "spike" via pulseSignal.
export function EkgLine({ className, bpm = 64, pulseSignal = 0 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spikeRef = useRef(0);

  useEffect(() => {
    spikeRef.current = 1;
  }, [pulseSignal]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let t = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // ekg-ish pulse function
    const pulse = (x: number) => {
      const phase = (x % 1 + 1) % 1;
      // Quiet baseline + sharp QRS spike
      if (phase < 0.35) return Math.sin(phase * Math.PI * 6) * 0.05;
      if (phase < 0.42) return (phase - 0.35) * 12; // P-up
      if (phase < 0.46) return 0.84 - (phase - 0.42) * 30; // R-down
      if (phase < 0.5) return -0.36 + (phase - 0.46) * 16; // S-up
      if (phase < 0.6) return 0.28 - (phase - 0.5) * 2.6;
      return Math.sin((phase - 0.6) * Math.PI * 4) * 0.04;
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const mid = h * 0.55;
      const amp = h * 0.32;
      const speed = (bpm / 60) * 0.012; // periods per ms-ish
      t += 16 * speed;

      ctx.lineWidth = 1.6;
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, "rgba(232,199,126,0)");
      grad.addColorStop(0.15, "rgba(232,199,126,0.85)");
      grad.addColorStop(0.85, "rgba(124,92,255,0.85)");
      grad.addColorStop(1, "rgba(124,92,255,0)");
      ctx.strokeStyle = grad;
      ctx.shadowColor = "rgba(232,199,126,0.6)";
      ctx.shadowBlur = 12;

      ctx.beginPath();
      const step = 2;
      const spike = spikeRef.current;
      for (let x = 0; x <= w; x += step) {
        const u = x / w; // 0..1
        const phase = u * 3 - t * 0.01;
        let y = mid - pulse(phase) * amp;
        if (spike > 0.01) {
          // extra burst in center when triggered
          const center = Math.abs(u - 0.5);
          y -= Math.exp(-center * 30) * amp * spike;
        }
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      spikeRef.current *= 0.94;
      raf = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [bpm]);

  return <canvas ref={canvasRef} className={className} />;
}
