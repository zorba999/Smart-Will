import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  HeartPulse,
  Coins,
  Scale,
  Infinity as InfinityIcon,
} from "lucide-react";
import { ParticleField } from "@/components/particle-field";
import { EkgLine } from "@/components/ekg-line";
import { MagneticButton } from "@/components/magnetic-button";
import { SmoothScroll } from "@/components/smooth-scroll";
import { CustomCursor } from "@/components/custom-cursor";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smart Will — Legacy, written in code." },
      {
        name: "description",
        content:
          "AI validators verify real-world events. Blockchain executes your will. No notaries. No courts. Just legacy.",
      },
      { property: "og:title", content: "Smart Will — Legacy, written in code." },
      {
        property: "og:description",
        content:
          "AI-validated digital inheritance protocol on GenLayer. Write a will in plain language; funds release automatically.",
      },
    ],
  }),
  component: Landing,
});

const STEPS = [
  {
    n: "01",
    title: "Create",
    body: "Write your will in plain language. Name beneficiaries, conditions, shares — the way you'd speak them.",
    icon: Sparkles,
  },
  {
    n: "02",
    title: "Fund",
    body: "Deposit GEN into your vault. Balances are visible to you and your beneficiaries — always.",
    icon: Coins,
  },
  {
    n: "03",
    title: "Heartbeat",
    body: "A quiet proof-of-life signal. One tap, on your cadence. Silence is what eventually speaks.",
    icon: HeartPulse,
  },
  {
    n: "04",
    title: "Verify",
    body: "When the grace period passes, AI validators reach consensus on real-world evidence.",
    icon: ShieldCheck,
  },
  {
    n: "05",
    title: "Execute",
    body: "Funds release to beneficiaries the moment conditions are met. No courts. No middlemen.",
    icon: Scale,
  },
] as const;

function Landing() {
  return (
    <SmoothScroll>
      <CustomCursor />
      <main className="relative grain min-h-screen overflow-x-clip">
        <SiteNav />
        <Hero />
        <Lifecycle />
        <Validators />
        <Trust />
        <ClosingCta />
        <Footer />
      </main>
    </SmoothScroll>
  );
}

function SiteNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto mt-4 flex max-w-7xl items-center justify-between gap-4 rounded-full px-5 py-2.5 glass-strong">
        <Link to="/" className="flex items-center gap-2 text-sm font-medium tracking-tight">
          <Mark />
          <span className="font-display text-base">Smart Will</span>
        </Link>
        <nav className="hidden items-center gap-8 text-xs uppercase tracking-[0.18em] text-muted-foreground md:flex">
          <a href="#lifecycle" className="hover:text-foreground">Lifecycle</a>
          <a href="#validators" className="hover:text-foreground">Validators</a>
          <a href="#trust" className="hover:text-foreground">Why GenLayer</a>
        </nav>
        <Link
          to="/app"
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs uppercase tracking-[0.18em] text-obsidian bg-gradient-to-b from-[oklch(0.92_0.10_85)] to-[oklch(0.78_0.13_72)] shadow-[0_0_0_1px_rgba(232,199,126,0.6),0_8px_30px_-10px_rgba(232,199,126,0.6)]"
        >
          Open App <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </header>
  );
}

function Mark() {
  return (
    <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-[oklch(0.92_0.10_85)] to-[oklch(0.55_0.22_290)] text-obsidian">
      <InfinityIcon className="h-4 w-4" strokeWidth={2.4} />
    </span>
  );
}

function Hero() {
  const root = useRef<HTMLDivElement>(null);
  const [pulse, setPulse] = useState(0);

  useGSAP(
    () => {
      const split = (selector: string) => {
        const el = root.current?.querySelector(selector);
        if (!el) return;
        const text = el.textContent || "";
        el.innerHTML = text
          .split(" ")
          .map(
            (w) =>
              `<span class="inline-block overflow-hidden align-bottom"><span class="inline-block translate-y-[110%] opacity-0 blur-[6px]" data-word>${w}&nbsp;</span></span>`,
          )
          .join("");
      };
      split("[data-headline-1]");
      split("[data-headline-2]");

      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      tl.to("[data-headline-1] [data-word]", {
        y: 0,
        opacity: 1,
        filter: "blur(0px)",
        duration: 1.4,
        stagger: 0.07,
      })
        .to(
          "[data-headline-2] [data-word]",
          { y: 0, opacity: 1, filter: "blur(0px)", duration: 1.4, stagger: 0.05 },
          "-=1.1",
        )
        .from(
          "[data-hero-sub]",
          { y: 20, opacity: 0, duration: 1, ease: "power3.out" },
          "-=0.9",
        )
        .from(
          "[data-hero-cta]",
          { y: 20, opacity: 0, duration: 0.9, stagger: 0.08, ease: "power3.out" },
          "-=0.7",
        )
        .from(
          "[data-hero-meta]",
          { opacity: 0, y: 12, duration: 0.8, stagger: 0.06 },
          "-=0.6",
        );
    },
    { scope: root },
  );

  // periodic background pulse for the EKG
  useEffect(() => {
    const i = setInterval(() => setPulse((p) => p + 1), 7500);
    return () => clearInterval(i);
  }, []);

  return (
    <section
      ref={root}
      className="relative isolate flex min-h-[100svh] items-center justify-center pt-24"
    >
      <ParticleField className="absolute inset-0 -z-10 h-full w-full" />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[70svh] bg-[radial-gradient(60%_50%_at_50%_30%,oklch(0.25_0.12_290/0.45),transparent_70%)]" />

      <div className="mx-auto max-w-6xl px-6 text-center">
        <span
          data-hero-meta
          className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--gold)] animate-heartbeat" />
          Live on GenLayer Bradbury · Testnet
        </span>

        <h1 className="mt-6 font-display text-[clamp(3rem,9vw,8.5rem)] font-light leading-[0.95] tracking-[-0.02em] text-balance">
          <span data-headline-1 className="block text-gradient-aurora">
            Legacy, written in code.
          </span>
          <span
            data-headline-2
            className="mt-1 block italic text-foreground/80"
          >
            Witnessed by intelligence.
          </span>
        </h1>

        <p
          data-hero-sub
          className="mx-auto mt-7 max-w-2xl text-pretty text-base text-muted-foreground md:text-lg"
        >
          Write your will in plain language. AI validators verify real-world events through
          blockchain consensus and release funds the moment your wishes can be honored. No
          notaries. No courts. Only what you leave behind.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link to="/app" data-hero-cta>
            <MagneticButton variant="gold">
              Create your will <ArrowRight className="h-4 w-4" />
            </MagneticButton>
          </Link>
          <a href="#lifecycle" data-hero-cta>
            <MagneticButton variant="ghost">How it works</MagneticButton>
          </a>
        </div>

        <div className="mt-16 grid grid-cols-3 gap-px overflow-hidden rounded-2xl glass max-w-2xl mx-auto text-left" data-hero-meta>
          <Stat k="Validators" v="AI consensus" />
          <Stat k="Custody" v="Self-sovereign" />
          <Stat k="Settlement" v="On execution" />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32">
        <EkgLine className="h-full w-full" pulseSignal={pulse} />
        <div className="absolute inset-x-0 bottom-3 text-center text-[10px] uppercase tracking-[0.32em] text-muted-foreground/70">
          proof of life
        </div>
      </div>
    </section>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="bg-background/30 px-5 py-4">
      <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{k}</div>
      <div className="mt-1 font-display text-lg text-foreground">{v}</div>
    </div>
  );
}

function Lifecycle() {
  const root = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const sec = root.current;
      const track = trackRef.current;
      if (!sec || !track) return;
      const distance = () => track.scrollWidth - window.innerWidth + 80;

      const ctx = gsap.context(() => {
        gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: sec,
            start: "top top",
            end: () => `+=${distance()}`,
            scrub: 0.8,
            pin: true,
            invalidateOnRefresh: true,
          },
        });

        gsap.to("[data-progress-fill]", {
          height: "100%",
          ease: "none",
          scrollTrigger: {
            trigger: sec,
            start: "top top",
            end: () => `+=${distance()}`,
            scrub: true,
          },
        });

        gsap.utils.toArray<HTMLElement>("[data-step]").forEach((el, i) => {
          gsap.from(el.querySelectorAll("[data-step-in]"), {
            y: 30,
            opacity: 0,
            duration: 0.7,
            stagger: 0.06,
            ease: "power3.out",
            delay: i * 0.05,
          });
        });
      }, sec);

      return () => ctx.revert();
    },
    { scope: root },
  );

  return (
    <section
      id="lifecycle"
      ref={root}
      className="relative h-[100svh] overflow-hidden border-y border-white/5 bg-[color:var(--ink)]/40"
    >
      <div className="pointer-events-none absolute left-10 top-1/2 z-10 hidden -translate-y-1/2 md:block">
        <div className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground">Lifecycle</div>
        <div className="relative mt-3 h-72 w-px bg-white/10 overflow-hidden">
          <div data-progress-fill className="absolute top-0 left-0 h-0 w-full bg-gradient-to-b from-[color:var(--gold)] to-[color:var(--violet)]" />
        </div>
      </div>

      <div
        ref={trackRef}
        className="flex h-full items-center gap-8 pl-[8vw] pr-[20vw] will-change-transform"
      >
        <div className="shrink-0 w-[60vw] max-w-xl">
          <div data-step className="space-y-4">
            <div data-step-in className="text-[10px] uppercase tracking-[0.32em] text-[color:var(--gold)]">
              Five movements
            </div>
            <h2 data-step-in className="font-display text-5xl md:text-6xl leading-[1.02] text-balance">
              The shape of <em className="not-italic text-gradient-gold">a passing</em>, rewritten.
            </h2>
            <p data-step-in className="text-muted-foreground max-w-md">
              Scroll. Each act is a contract method, each method a real-world consequence.
            </p>
          </div>
        </div>

        {STEPS.map((s, i) => (
          <article
            key={s.n}
            data-step
            className="shrink-0 w-[70vw] max-w-md rounded-3xl p-8 glass-strong relative overflow-hidden"
          >
            <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[radial-gradient(circle,oklch(0.83_0.12_80/0.25),transparent_70%)]" />
            <div data-step-in className="flex items-baseline justify-between text-xs uppercase tracking-[0.28em] text-muted-foreground">
              <span>{s.n}</span>
              <span>{i + 1} / {STEPS.length}</span>
            </div>
            <s.icon data-step-in className="mt-6 h-7 w-7 text-[color:var(--gold)]" />
            <h3 data-step-in className="mt-5 font-display text-4xl text-foreground">{s.title}</h3>
            <p data-step-in className="mt-3 text-muted-foreground leading-relaxed">{s.body}</p>
            <div data-step-in className="mt-8 h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            <div data-step-in className="mt-4 font-mono text-[11px] text-muted-foreground/80">
              contract.{["add_clause","deposit_funds","heartbeat","trigger_death_check","claim_clause"][i]}()
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Validators() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from("[data-vnode]", {
        scale: 0.3,
        opacity: 0,
        duration: 1,
        stagger: 0.07,
        ease: "back.out(2)",
        scrollTrigger: { trigger: ref.current, start: "top 70%" },
      });
      gsap.from("[data-vline]", {
        scaleX: 0,
        opacity: 0,
        duration: 1.2,
        stagger: 0.05,
        ease: "power3.out",
        scrollTrigger: { trigger: ref.current, start: "top 65%" },
      });
      gsap.from("[data-vtext]", {
        y: 30,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: { trigger: ref.current, start: "top 80%" },
      });
    },
    { scope: ref },
  );

  const nodes = Array.from({ length: 9 });

  return (
    <section id="validators" ref={ref} className="relative py-32 md:py-44">
      <div className="mx-auto max-w-6xl px-6 grid gap-16 md:grid-cols-2 md:items-center">
        <div>
          <div data-vtext className="text-[10px] uppercase tracking-[0.32em] text-[color:var(--gold)]">
            AI validators
          </div>
          <h2 data-vtext className="mt-4 font-display text-5xl md:text-6xl leading-[1.02] text-balance">
            Consensus is the new <em className="not-italic text-gradient-aurora">notary</em>.
          </h2>
          <p data-vtext className="mt-6 text-muted-foreground leading-relaxed max-w-md">
            GenLayer's intelligent validators read the world the way you'd ask a thoughtful
            stranger: news, public records, on-chain events. They vote. Truth is the majority,
            cryptographically signed.
          </p>
          <ul data-vtext className="mt-8 space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-3"><Dot /> Deterministic for math. Probabilistic for meaning.</li>
            <li className="flex items-start gap-3"><Dot /> Leader-only execution for instant actions.</li>
            <li className="flex items-start gap-3"><Dot /> Full consensus for irreversible ones.</li>
          </ul>
        </div>

        <div className="relative aspect-square w-full max-w-md mx-auto">
          <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full">
            <defs>
              <radialGradient id="core" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="oklch(0.92 0.10 85)" stopOpacity="0.9" />
                <stop offset="100%" stopColor="oklch(0.92 0.10 85)" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="200" cy="200" r="80" fill="url(#core)" />
            {nodes.map((_, i) => {
              const a = (i / nodes.length) * Math.PI * 2;
              const x = 200 + Math.cos(a) * 150;
              const y = 200 + Math.sin(a) * 150;
              return (
                <g key={i}>
                  <line
                    data-vline
                    x1="200"
                    y1="200"
                    x2={x}
                    y2={y}
                    stroke="oklch(0.83 0.12 80 / 0.35)"
                    strokeWidth="1"
                    style={{ transformOrigin: "200px 200px" }}
                  />
                </g>
              );
            })}
            {nodes.map((_, i) => {
              const a = (i / nodes.length) * Math.PI * 2;
              const x = 200 + Math.cos(a) * 150;
              const y = 200 + Math.sin(a) * 150;
              const accent = i % 3 === 0;
              return (
                <circle
                  key={`n${i}`}
                  data-vnode
                  cx={x}
                  cy={y}
                  r="9"
                  fill={accent ? "oklch(0.65 0.22 290)" : "oklch(0.92 0.10 85)"}
                  stroke="oklch(0.10 0.015 270)"
                  strokeWidth="3"
                />
              );
            })}
            <circle cx="200" cy="200" r="10" fill="oklch(0.96 0.05 90)" className="animate-heartbeat" />
          </svg>
          <div className="absolute inset-x-0 bottom-0 text-center text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
            9-of-9 validators · majority verdict
          </div>
        </div>
      </div>
    </section>
  );
}

function Dot() {
  return <span className="mt-1.5 inline-block h-1 w-1 rounded-full bg-[color:var(--gold)] shrink-0" />;
}

function Trust() {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      gsap.from("[data-trust]", {
        y: 40,
        opacity: 0,
        duration: 1,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: { trigger: ref.current, start: "top 75%" },
      });
    },
    { scope: ref },
  );

  const items = [
    {
      k: "Self-sovereign",
      v: "Your keys hold your vault. We never custody, never freeze, never override.",
    },
    {
      k: "Plain language",
      v: "Write the way you'd speak. AI parses intent; you confirm the structure.",
    },
    {
      k: "Probabilistic truth",
      v: "Validators read sources, debate evidence, and converge on verdicts.",
    },
    {
      k: "Always visible",
      v: "Every beneficiary, every clause, every transaction — auditable forever.",
    },
  ];

  return (
    <section id="trust" ref={ref} className="relative py-32 md:py-40 border-t border-white/5">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <div data-trust className="text-[10px] uppercase tracking-[0.32em] text-[color:var(--gold)]">
            Why GenLayer
          </div>
          <h2 data-trust className="mt-4 font-display text-5xl md:text-6xl leading-[1.02] text-balance">
            Trust without <em className="not-italic text-gradient-gold">institutions</em>.
          </h2>
        </div>
        <div className="mt-16 grid gap-6 md:grid-cols-2">
          {items.map((it) => (
            <article
              key={it.k}
              data-trust
              className="group relative overflow-hidden rounded-3xl p-8 glass hover:bg-white/[0.06] transition-colors"
            >
              <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-[radial-gradient(circle_at_30%_0%,oklch(0.65_0.22_290/0.18),transparent_60%)]" />
              <h3 className="font-display text-2xl">{it.k}</h3>
              <p className="mt-3 text-muted-foreground leading-relaxed">{it.v}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ClosingCta() {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    gsap.from("[data-close]", {
      y: 40,
      opacity: 0,
      duration: 1.2,
      stagger: 0.1,
      ease: "power3.out",
      scrollTrigger: { trigger: ref.current, start: "top 70%" },
    });
  }, { scope: ref });

  return (
    <section ref={ref} className="relative py-32 md:py-44">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 data-close className="font-display text-5xl md:text-7xl leading-[1] tracking-[-0.02em] text-balance text-gradient-aurora">
          What you leave behind<br/>should outlast you.
        </h2>
        <p data-close className="mx-auto mt-6 max-w-xl text-muted-foreground">
          Open the app. Connect a wallet. Write the first sentence. The rest can wait — but
          this part is the part that doesn't.
        </p>
        <div data-close className="mt-10 inline-flex">
          <Link to="/app">
            <MagneticButton variant="gold" strength={0.45}>
              Enter Smart Will <ArrowRight className="h-4 w-4" />
            </MagneticButton>
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="relative border-t border-white/5 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <Mark />
          <div>
            <div className="font-display text-base">Smart Will</div>
            <div className="text-xs text-muted-foreground">Legacy, written in code.</div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          GenLayer Bradbury Testnet · chainId 4221 ·{" "}
          <a className="underline-offset-4 hover:underline" href="https://explorer-bradbury.genlayer.com" target="_blank" rel="noreferrer">
            explorer
          </a>
        </div>
      </div>
    </footer>
  );
}
