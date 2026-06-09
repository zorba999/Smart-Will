"use client";
import { useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "gold" | "ghost" | "violet";
  strength?: number;
}

export function MagneticButton({
  children,
  className,
  variant = "gold",
  strength = 0.35,
  ...rest
}: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  const glowRef = useRef<HTMLSpanElement>(null);

  const onMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    el.style.transform = `translate3d(${x * strength}px, ${y * strength}px, 0)`;
    if (glowRef.current) {
      glowRef.current.style.background = `radial-gradient(120px circle at ${
        e.clientX - rect.left
      }px ${e.clientY - rect.top}px, rgba(232,199,126,0.35), transparent 60%)`;
    }
  };
  const onLeave = () => {
    const el = ref.current;
    if (el) el.style.transform = "";
    if (glowRef.current) glowRef.current.style.background = "transparent";
  };

  const base =
    "relative inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-medium tracking-wide transition-[transform,box-shadow,background] duration-300 ease-out will-change-transform overflow-hidden";
  const variants = {
    gold:
      "text-obsidian bg-gradient-to-b from-[oklch(0.92_0.10_85)] to-[oklch(0.78_0.13_72)] shadow-[0_0_0_1px_rgba(232,199,126,0.5),0_10px_40px_-10px_rgba(232,199,126,0.6)] hover:shadow-[0_0_0_1px_rgba(232,199,126,0.7),0_18px_60px_-10px_rgba(232,199,126,0.7)]",
    violet:
      "text-white bg-gradient-to-b from-[oklch(0.70_0.22_290)] to-[oklch(0.55_0.22_290)] shadow-[0_0_0_1px_rgba(124,92,255,0.55),0_10px_40px_-10px_rgba(124,92,255,0.6)]",
    ghost:
      "text-foreground glass hover:bg-white/10",
  } as const;

  return (
    <button
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={cn(base, variants[variant], className)}
      {...rest}
    >
      <span ref={glowRef} aria-hidden className="pointer-events-none absolute inset-0" />
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </button>
  );
}
