// Convert atto (10^18) string to human GEN number
export function attoToGen(atto: string | bigint): number {
  try {
    const v = typeof atto === "bigint" ? atto : BigInt(atto || "0");
    const whole = v / 10n ** 18n;
    const frac = v % 10n ** 18n;
    return Number(whole) + Number(frac) / 1e18;
  } catch {
    return 0;
  }
}

export function genToAtto(gen: number): string {
  const whole = BigInt(Math.floor(gen));
  const frac = BigInt(Math.round((gen - Math.floor(gen)) * 1e18));
  return (whole * 10n ** 18n + frac).toString();
}

export function formatGen(atto: string | bigint, decimals = 4): string {
  const n = attoToGen(atto);
  if (n === 0) return "0";
  if (n < 0.0001) return "<0.0001";
  return n.toLocaleString(undefined, { maximumFractionDigits: decimals });
}

export function shortAddr(addr: string | null | undefined): string {
  if (!addr) return "—";
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (!t) return "—";
  const diff = (Date.now() - t) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
