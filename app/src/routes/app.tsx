import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Wallet,
  HeartPulse,
  Plus,
  Coins,
  ShieldAlert,
  ChevronRight,
  ExternalLink,
  X,
  Sparkles,
  Copy,
  Check,
  Infinity as InfinityIcon,
  Trash2,
} from "lucide-react";
import { useWallet } from "@/lib/smart-will/wallet";
import { useWill } from "@/lib/smart-will/hooks";
import { EXAMPLE_WILL_ADDRESS, EXPLORER_BASE, deployWill } from "@/lib/smart-will/client";
import { listWills, saveWill, removeWill, type SavedWill } from "@/lib/smart-will/storage";
import {
  attoToGen,
  formatDuration,
  formatGen,
  genToAtto,
  shortAddr,
  timeAgo,
} from "@/lib/smart-will/format";
import type { Clause, ConditionType, UserRole } from "@/lib/smart-will/types";
import { CountUp } from "@/components/count-up";
import { EkgLine } from "@/components/ekg-line";
import { MagneticButton } from "@/components/magnetic-button";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Smart Will — App" },
      { name: "description", content: "Manage your AI-validated on-chain will." },
    ],
  }),
  component: AppRoute,
});

function AppRoute() {
  const wallet = useWallet();
  const [wills, setWills] = useState<SavedWill[]>([]);
  const [activeAddress, setActiveAddress] = useState<string | null>(null);

  useEffect(() => {
    const list = listWills();
    setWills(list);
    if (list[0]) setActiveAddress(list[0].address);
  }, []);

  const refresh = () => setWills(listWills());

  return (
    <div className="relative min-h-screen grain">
      <AppNav
        wallet={wallet}
        wills={wills}
        active={activeAddress}
        onPick={setActiveAddress}
      />

      <main className="mx-auto max-w-7xl px-6 pb-32 pt-28">
        {!wallet.address ? (
          <ConnectScreen onConnect={wallet.connect} connecting={wallet.connecting} />
        ) : !activeAddress ? (
          <CreateOrLoad
            walletAddress={wallet.address}
            onCreated={(w) => {
              saveWill(w);
              refresh();
              setActiveAddress(w.address);
            }}
          />
        ) : (
          <Dashboard
            key={activeAddress}
            address={activeAddress}
            walletAddress={wallet.address}
            onRemove={() => {
              removeWill(activeAddress);
              const next = listWills();
              setWills(next);
              setActiveAddress(next[0]?.address ?? null);
            }}
          />
        )}
      </main>
      <Toaster theme="dark" />
    </div>
  );
}

function AppNav({
  wallet,
  wills,
  active,
  onPick,
}: {
  wallet: ReturnType<typeof useWallet>;
  wills: SavedWill[];
  active: string | null;
  onPick: (addr: string) => void;
}) {
  return (
    <header className="fixed inset-x-0 top-0 z-40">
      <div className="mx-auto mt-4 flex max-w-7xl items-center justify-between gap-4 rounded-full px-4 py-2.5 glass-strong">
        <Link to="/" className="flex items-center gap-2 text-sm font-medium tracking-tight">
          <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-[oklch(0.92_0.10_85)] to-[oklch(0.55_0.22_290)] text-obsidian">
            <InfinityIcon className="h-4 w-4" strokeWidth={2.4} />
          </span>
          <span className="font-display text-base">Smart Will</span>
          <span className="ml-2 hidden text-[10px] uppercase tracking-[0.22em] text-muted-foreground md:inline">/ app</span>
        </Link>

        <div className="flex items-center gap-2">
          {wills.length > 0 && active && (
            <select
              value={active}
              onChange={(e) => onPick(e.target.value)}
              className="hidden sm:block rounded-full bg-white/5 px-3 py-1.5 text-xs text-foreground border border-white/10 focus:outline-none focus:ring-2 focus:ring-[color:var(--gold)]/40"
            >
              {wills.map((w) => (
                <option key={w.address} value={w.address} className="bg-background">
                  {w.label} · {shortAddr(w.address)}
                </option>
              ))}
            </select>
          )}
          {wallet.address ? (
            <div className="flex items-center gap-2">
              <span className="hidden md:inline-flex items-center gap-2 rounded-full glass px-3 py-1.5 text-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--teal)]" />
                {wallet.isMock ? "Demo wallet" : "Connected"}
              </span>
              <button
                onClick={wallet.disconnect}
                className="rounded-full glass px-3 py-1.5 text-xs font-mono hover:bg-white/10"
                title="Disconnect"
              >
                {shortAddr(wallet.address)}
              </button>
            </div>
          ) : (
            <button
              onClick={wallet.connect}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs uppercase tracking-[0.18em] text-obsidian bg-gradient-to-b from-[oklch(0.92_0.10_85)] to-[oklch(0.78_0.13_72)]"
            >
              <Wallet className="h-3.5 w-3.5" /> Connect
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function ConnectScreen({ onConnect, connecting }: { onConnect: () => void; connecting: boolean }) {
  return (
    <section className="relative mx-auto flex max-w-3xl flex-col items-center pt-20 text-center">
      <div className="pointer-events-none absolute inset-x-0 -top-10 -z-10 h-[60vh] bg-[radial-gradient(50%_50%_at_50%_50%,oklch(0.65_0.22_290/0.25),transparent_70%)]" />
      <span className="inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--gold)] animate-heartbeat" />
        Step one
      </span>
      <h1 className="mt-6 font-display text-5xl md:text-7xl leading-[1.02] text-balance text-gradient-aurora">
        Connect your wallet.
      </h1>
      <p className="mt-5 max-w-md text-muted-foreground">
        Your keys, your vault. We connect to an injected EVM wallet on the GenLayer Bradbury
        testnet. No wallet handy? A demo address is fine — you can still try the full flow.
      </p>
      <div className="mt-10">
        <MagneticButton onClick={onConnect} disabled={connecting} variant="gold" strength={0.45}>
          <Wallet className="h-4 w-4" /> {connecting ? "Connecting…" : "Connect wallet"}
        </MagneticButton>
      </div>
      <div className="mt-12 grid w-full max-w-2xl grid-cols-3 overflow-hidden rounded-2xl glass text-left">
        <NavInfo k="Network" v="Bradbury" />
        <NavInfo k="Chain ID" v="4221" />
        <NavInfo k="Asset" v="GEN" />
      </div>
    </section>
  );
}

function NavInfo({ k, v }: { k: string; v: string }) {
  return (
    <div className="px-5 py-4 border-r last:border-r-0 border-white/5">
      <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{k}</div>
      <div className="mt-1 font-display text-lg">{v}</div>
    </div>
  );
}

function CreateOrLoad({
  walletAddress,
  onCreated,
}: {
  walletAddress: string;
  onCreated: (w: SavedWill) => void;
}) {
  const [label, setLabel] = useState("");
  const [loadAddr, setLoadAddr] = useState("");
  const [creating, setCreating] = useState(false);

  const create = async () => {
    setCreating(true);
    const t = toast.loading("Deploying your will…", {
      description: "Confirm in your wallet, then wait for consensus.",
    });
    try {
      const addr = await deployWill(walletAddress, label.trim(), 30);
      onCreated({ address: addr, label: label.trim() || "My Will", createdAt: Date.now() });
      toast.success("Will deployed", { id: t, description: shortAddr(addr) });
    } catch (e) {
      const msg =
        (e as { shortMessage?: string; message?: string })?.shortMessage ||
        (e as Error)?.message ||
        String(e);
      toast.error("Deploy failed", { id: t, description: msg });
    } finally {
      setCreating(false);
    }
  };

  const load = () => {
    const v = loadAddr.trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(v)) {
      toast.error("Enter a valid 0x address");
      return;
    }
    onCreated({ address: v, label: "Loaded Will", createdAt: Date.now() });
  };

  return (
    <section className="mx-auto max-w-4xl pt-10">
      <div className="text-center">
        <span className="text-[10px] uppercase tracking-[0.32em] text-[color:var(--gold)]">
          Welcome, {shortAddr(walletAddress)}
        </span>
        <h1 className="mt-4 font-display text-5xl md:text-6xl leading-[1.02] text-balance">
          Begin your <em className="not-italic text-gradient-gold">will</em>.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Deploy a new vault in a single tap, or paste an existing contract address to manage
          a will you already created.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <article className="rounded-3xl glass-strong p-8">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-[color:var(--gold)]">
            <Sparkles className="h-3.5 w-3.5" /> New will
          </div>
          <h2 className="mt-3 font-display text-3xl">Create your will</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Give it a private name. Everything else can be added later.
          </p>
          <label className="mt-6 block text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Name (optional)
          </label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Family vault"
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-[color:var(--gold)]/50 focus:ring-2 focus:ring-[color:var(--gold)]/20"
          />
          <div className="mt-7">
            <MagneticButton onClick={create} disabled={creating} variant="gold" strength={0.4}>
              {creating ? "Deploying…" : "Create my will"} <ChevronRight className="h-4 w-4" />
            </MagneticButton>
          </div>
        </article>

        <article className="rounded-3xl glass p-8">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
            Load existing
          </div>
          <h2 className="mt-3 font-display text-3xl">Have a contract?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Paste any Smart Will contract address to view or act on it.
          </p>
          <label className="mt-6 block text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Contract address
          </label>
          <input
            value={loadAddr}
            onChange={(e) => setLoadAddr(e.target.value)}
            placeholder="0x…"
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm outline-none focus:border-[color:var(--violet)]/50 focus:ring-2 focus:ring-[color:var(--violet)]/20"
          />
          <div className="mt-3 flex items-center gap-2 text-xs">
            <button
              onClick={() => setLoadAddr(EXAMPLE_WILL_ADDRESS)}
              className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Use example testnet contract
            </button>
          </div>
          <div className="mt-7">
            <MagneticButton onClick={load} variant="ghost">
              Load will
            </MagneticButton>
          </div>
        </article>
      </div>
    </section>
  );
}

function Dashboard({
  address,
  walletAddress,
  onRemove,
}: {
  address: string;
  walletAddress: string;
  onRemove: () => void;
}) {
  const will = useWill(address, walletAddress);
  const status = will.status.data;
  const clauses = will.clauses.data ?? [];
  const evidence = will.evidence.data;

  const role: UserRole = useMemo(() => {
    if (!status) return "observer";
    if (status.testator?.toLowerCase() === walletAddress.toLowerCase()) return "testator";
    if (clauses.some((c) => c.beneficiary?.toLowerCase().includes(walletAddress.slice(2, 6).toLowerCase())))
      return "beneficiary";
    return "observer";
  }, [status, clauses, walletAddress]);

  const [showAddClause, setShowAddClause] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showDeath, setShowDeath] = useState(false);
  const [pulse, setPulse] = useState(0);
  const [copied, setCopied] = useState(false);

  if (!status) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        <div className="animate-pulse text-sm">Reading the vault…</div>
      </div>
    );
  }

  const bal = attoToGen(status.balance_atto);
  const deposited = attoToGen(status.total_deposited_atto);
  const paidOut = attoToGen(status.total_paid_out_atto);

  const cadenceSecs = status.proof_of_life_cadence_seconds;
  const sinceAlive = status.seconds_since_last_alive;
  const remaining = Math.max(0, cadenceSecs - sinceAlive);
  const ringProgress = Math.min(1, sinceAlive / cadenceSecs);

  const txToast = (label: string, hash: string) =>
    toast.success(label, {
      description: (
        <a
          href={`${EXPLORER_BASE}/tx/${hash}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
        >
          {shortAddr(hash)} <ExternalLink className="h-3 w-3" />
        </a>
      ),
    });

  const onHeartbeat = async () => {
    setPulse((p) => p + 1);
    try {
      const r = await will.heartbeat.mutateAsync();
      txToast("Heartbeat confirmed", r.hash);
    } catch (e) {
      toast.error("Heartbeat failed", { description: String(e) });
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {/* */}
  };

  return (
    <div className="space-y-8">
      {/* Vault hero */}
      <section className="relative overflow-hidden rounded-[28px] glass-strong p-8 md:p-10">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[radial-gradient(circle,oklch(0.83_0.12_80/0.22),transparent_60%)]" />
        <div className="pointer-events-none absolute -left-32 -bottom-32 h-96 w-96 rounded-full bg-[radial-gradient(circle,oklch(0.65_0.22_290/0.22),transparent_60%)]" />

        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
              <StatusBadge status={status.status} /> · created {timeAgo(status.created_at)}
            </div>
            <h1 className="mt-3 font-display text-4xl md:text-5xl leading-[1.02]">
              {status.testator_identity_hint || "Unnamed testator"}
            </h1>
            <button
              onClick={copy}
              className="mt-3 inline-flex items-center gap-2 rounded-full glass px-3 py-1.5 text-xs font-mono hover:bg-white/10"
              title="Copy contract address"
            >
              {shortAddr(address)} {copied ? <Check className="h-3 w-3 text-[color:var(--teal)]" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {role === "testator" && (
              <>
                <MagneticButton onClick={onHeartbeat} variant="gold" strength={0.35}>
                  <HeartPulse className="h-4 w-4" /> Heartbeat
                </MagneticButton>
                <MagneticButton onClick={() => setShowDeposit(true)} variant="violet">
                  <Coins className="h-4 w-4" /> Deposit
                </MagneticButton>
                <MagneticButton onClick={() => setShowAddClause(true)} variant="ghost">
                  <Plus className="h-4 w-4" /> Add clause
                </MagneticButton>
              </>
            )}
            <button
              onClick={onRemove}
              title="Remove from this device"
              className="rounded-full glass px-3 py-2 text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-10 grid gap-8 md:grid-cols-[1fr_auto]">
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl glass">
            <BigNum k="Balance" value={bal} suffix=" GEN" gold />
            <BigNum k="Deposited" value={deposited} suffix=" GEN" />
            <BigNum k="Paid out" value={paidOut} suffix=" GEN" />
          </div>

          <ProofOfLifeRing
            progress={ringProgress}
            remainingSecs={remaining}
            graceSecs={status.grace_period_seconds}
            sinceAliveSecs={sinceAlive}
            cadenceSecs={cadenceSecs}
            danger={status.can_trigger_death_check}
          />
        </div>

        <div className="mt-8 h-20 -mx-2">
          <EkgLine className="h-full w-full" pulseSignal={pulse} bpm={68} />
        </div>
      </section>

      {/* Role / death */}
      <section className="grid gap-6 md:grid-cols-3">
        <RolePanel role={role} />
        {status.can_trigger_death_check ? (
          <article className="md:col-span-2 rounded-2xl ring-glow-violet glass-strong p-6">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-[color:var(--violet)]">
              <ShieldAlert className="h-3.5 w-3.5" /> Grace period exceeded
            </div>
            <h3 className="mt-2 font-display text-2xl">Death verification available</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Anyone may submit at least three evidence URLs. AI validators will reach
              consensus and, if confirmed, the vault enters execution.
            </p>
            <div className="mt-4">
              <MagneticButton onClick={() => setShowDeath(true)} variant="violet">
                Submit evidence
              </MagneticButton>
            </div>
          </article>
        ) : (
          <article className="md:col-span-2 rounded-2xl glass p-6">
            <div className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Vault timeline</div>
            <h3 className="mt-2 font-display text-2xl">Quietly alive</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Last heartbeat {timeAgo(status.last_alive_signal)}. Next required in{" "}
              <span className="text-foreground">{formatDuration(remaining)}</span>. After
              cadence, a grace period of {formatDuration(status.grace_period_seconds)} opens
              before death verification can begin.
            </p>
          </article>
        )}
      </section>

      {evidence && (
        <section className="rounded-2xl glass-strong p-6">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-[color:var(--violet)]">
            Death evidence · {evidence.verdict}
          </div>
          <h3 className="mt-2 font-display text-2xl">Submitted {timeAgo(evidence.submitted_at_iso)}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{evidence.reasoning}</p>
          <ul className="mt-4 space-y-2 text-sm">
            {evidence.evidence_urls.map((u) => (
              <li key={u}>
                <a
                  href={u}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 font-mono text-[color:var(--gold)] hover:underline underline-offset-4"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> {u}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Clauses */}
      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--gold)]">Clauses</div>
            <h2 className="mt-1 font-display text-3xl">{clauses.length} written</h2>
          </div>
          {role === "testator" && (
            <button
              onClick={() => setShowAddClause(true)}
              className="text-xs uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" /> Add clause
            </button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {clauses.map((c, i) => (
            <ClauseCard
              key={c.id}
              clause={c}
              index={i}
              canManage={role === "testator"}
              canClaim={role !== "observer" && status.status === "executing"}
              onRemove={async () => {
                try {
                  const r = await will.removeClause.mutateAsync(c.id);
                  txToast("Clause removed", r.hash);
                } catch (e) {
                  toast.error(String(e));
                }
              }}
              onClaim={async () => {
                try {
                  const r = await will.claimClause.mutateAsync({
                    id: c.id,
                    url: "https://example.com/evidence",
                  });
                  txToast("Clause claimed", r.hash);
                } catch (e) {
                  toast.error(String(e));
                }
              }}
            />
          ))}
          {clauses.length === 0 && (
            <div className="md:col-span-2 rounded-2xl glass p-10 text-center text-muted-foreground">
              No clauses yet. The vault is empty paper.
            </div>
          )}
        </div>
      </section>

      {showAddClause && (
        <AddClauseModal
          onClose={() => setShowAddClause(false)}
          onSubmit={async (input) => {
            try {
              const r = await will.addClause.mutateAsync(input);
              txToast("Clause added", r.hash);
              setShowAddClause(false);
            } catch (e) {
              toast.error(String(e));
            }
          }}
        />
      )}
      {showDeposit && (
        <DepositModal
          onClose={() => setShowDeposit(false)}
          onSubmit={async (amount) => {
            try {
              const r = await will.deposit.mutateAsync(amount);
              txToast(`Deposited ${amount} GEN`, r.hash);
              setShowDeposit(false);
            } catch (e) {
              toast.error(String(e));
            }
          }}
        />
      )}
      {showDeath && (
        <DeathModal
          onClose={() => setShowDeath(false)}
          onSubmit={async (urls) => {
            try {
              const r = await will.triggerDeathCheck.mutateAsync(urls);
              txToast("Verification submitted", r.hash);
              setShowDeath(false);
            } catch (e) {
              toast.error(String(e));
            }
          }}
        />
      )}
    </div>
  );
}

function BigNum({ k, value, suffix, gold }: { k: string; value: number; suffix?: string; gold?: boolean }) {
  return (
    <div className="bg-background/30 px-5 py-5">
      <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{k}</div>
      <div className={`mt-2 font-display text-3xl md:text-4xl tracking-tight ${gold ? "text-gradient-gold" : ""}`}>
        <CountUp value={value} decimals={value > 100 ? 2 : 4} suffix={suffix} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-[color:var(--teal)]/15 text-[color:var(--teal)] border-[color:var(--teal)]/30",
    pending_death: "bg-[color:var(--violet)]/15 text-[color:var(--violet)] border-[color:var(--violet)]/30",
    executing: "bg-[color:var(--gold)]/15 text-[color:var(--gold)] border-[color:var(--gold)]/30",
    executed: "bg-white/10 text-foreground border-white/15",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-[0.18em] ${colors[status] ?? "bg-white/5 text-foreground"}`}>
      <span className="h-1 w-1 rounded-full bg-current animate-heartbeat" />
      {status.replace("_", " ")}
    </span>
  );
}

function ProofOfLifeRing({
  progress,
  remainingSecs,
  graceSecs,
  sinceAliveSecs,
  cadenceSecs,
  danger,
}: {
  progress: number;
  remainingSecs: number;
  graceSecs: number;
  sinceAliveSecs: number;
  cadenceSecs: number;
  danger: boolean;
}) {
  const size = 200;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - progress);

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="oklch(1 0 0 / 0.08)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={danger ? "oklch(0.65 0.22 290)" : "oklch(0.83 0.12 80)"}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 600ms ease, stroke 400ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {danger ? "Grace exceeded" : "Next heartbeat"}
        </div>
        <div className="mt-1 font-display text-2xl">
          {danger ? formatDuration(sinceAliveSecs - cadenceSecs - graceSecs) : formatDuration(remainingSecs)}
        </div>
        <div className="mt-1 text-[10px] text-muted-foreground">
          cadence {formatDuration(cadenceSecs)}
        </div>
      </div>
    </div>
  );
}

function RolePanel({ role }: { role: UserRole }) {
  const map = {
    testator: {
      label: "Testator",
      desc: "You wrote this will. Keep the heartbeat alive, deposit funds, add or revise clauses.",
    },
    beneficiary: {
      label: "Beneficiary",
      desc: "You're named in this will. When conditions are met, you may claim your share.",
    },
    observer: {
      label: "Observer",
      desc: "You're watching this will. Anyone can submit evidence when grace expires.",
    },
  } as const;
  const info = map[role];
  return (
    <article className="rounded-2xl glass p-6">
      <div className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--teal)]">Your role</div>
      <h3 className="mt-2 font-display text-2xl">{info.label}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{info.desc}</p>
    </article>
  );
}

function ClauseCard({
  clause,
  index,
  canManage,
  canClaim,
  onRemove,
  onClaim,
}: {
  clause: Clause;
  index: number;
  canManage: boolean;
  canClaim: boolean;
  onRemove: () => void;
  onClaim: () => void;
}) {
  const isPending = clause.status === "pending";
  return (
    <article
      className="group relative overflow-hidden rounded-2xl glass-strong p-6 transition-transform duration-300 will-change-transform hover:-translate-y-0.5"
      style={{ animation: `fade-in 0.6s ${index * 0.05}s both` }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-[radial-gradient(circle_at_80%_0%,oklch(0.83_0.12_80/0.12),transparent_60%)]" />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          <span className="font-mono">#{clause.id}</span>
          <span>·</span>
          <ConditionBadge type={clause.condition_type} />
        </div>
        <ClauseStatusPill status={clause.status} />
      </div>

      <p className="mt-4 text-[15px] leading-relaxed text-foreground/90">
        “{clause.original_text}”
      </p>

      <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Beneficiary</div>
          <div className="mt-1">{clause.beneficiary_hint || shortAddr(clause.beneficiary)}</div>
          <div className="text-xs text-muted-foreground font-mono">{shortAddr(clause.beneficiary)}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Share</div>
          <div className="mt-1 font-display text-2xl text-gradient-gold">
            {formatGen(clause.asset_share_atto)} <span className="text-sm text-muted-foreground">GEN</span>
          </div>
        </div>
      </div>

      {clause.condition_description && (
        <div className="mt-5 rounded-xl bg-white/5 border border-white/10 p-3 text-xs text-muted-foreground">
          <span className="text-foreground/80">Condition:</span> {clause.condition_description}
          {clause.data_sources_hint && clause.data_sources_hint !== "—" && (
            <div className="mt-1 font-mono opacity-70">sources · {clause.data_sources_hint}</div>
          )}
        </div>
      )}

      {isPending && (
        <div className="pointer-events-none absolute inset-x-0 -bottom-px h-px shimmer" />
      )}

      <div className="mt-5 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {clause.deadline_iso ? `Deadline ${new Date(clause.deadline_iso).toLocaleDateString()}` : "No deadline"}
        </span>
        <div className="flex items-center gap-2">
          {canClaim && isPending && (
            <button
              onClick={onClaim}
              className="rounded-full bg-[color:var(--gold)]/15 text-[color:var(--gold)] px-3 py-1 hover:bg-[color:var(--gold)]/25"
            >
              Claim
            </button>
          )}
          {canManage && (
            <button
              onClick={onRemove}
              className="rounded-full glass px-3 py-1 text-muted-foreground hover:text-destructive"
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function ConditionBadge({ type }: { type: ConditionType }) {
  const map: Record<ConditionType, string> = {
    unconditional: "unconditional",
    date: "date",
    milestone: "milestone",
    world_event: "world event",
  };
  return <span className="text-[color:var(--teal)]">{map[type]}</span>;
}

function ClauseStatusPill({ status }: { status: Clause["status"] }) {
  const m: Record<Clause["status"], string> = {
    pending: "bg-white/8 text-foreground/80 border-white/15",
    claimed: "bg-[color:var(--teal)]/15 text-[color:var(--teal)] border-[color:var(--teal)]/30",
    rejected: "bg-destructive/15 text-destructive border-destructive/30",
    expired: "bg-muted text-muted-foreground border-white/15",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] ${m[status]}`}>
      {status}
    </span>
  );
}

/* ----------------------- Modals ----------------------- */

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-3xl glass-strong p-7 animate-[scale-in_0.25s_ease-out]">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-2xl">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-white/10 text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

function AddClauseModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (input: import("@/lib/smart-will/types").AddClauseInput) => void;
}) {
  const [text, setText] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [hint, setHint] = useState("");
  const [amount, setAmount] = useState(1);
  const [condition, setCondition] = useState<ConditionType>("unconditional");
  const [conditionDesc, setConditionDesc] = useState("");
  const [sources, setSources] = useState("");
  const [deadline, setDeadline] = useState("");

  const submit = () => {
    if (!text.trim() || !beneficiary.trim()) {
      toast.error("Write the clause and a beneficiary address");
      return;
    }
    onSubmit({
      original_text: text.trim(),
      beneficiary: beneficiary.trim(),
      beneficiary_hint: hint.trim(),
      asset_share_atto: genToAtto(amount || 0),
      condition_type: condition,
      condition_description: conditionDesc.trim(),
      data_sources_hint: sources.trim() || "—",
      deadline_iso: deadline ? new Date(deadline).toISOString() : null,
    });
  };

  return (
    <ModalShell title="Add a clause" onClose={onClose}>
      <div className="space-y-4">
        <Field label="In your own words">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="To my daughter Mira, leave 40% of the vault…"
            rows={3}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 outline-none focus:border-[color:var(--gold)]/40"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Beneficiary address">
            <input
              value={beneficiary}
              onChange={(e) => setBeneficiary(e.target.value)}
              placeholder="0x…"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm outline-none focus:border-[color:var(--gold)]/40"
            />
          </Field>
          <Field label="Beneficiary hint">
            <input
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="Mira · daughter"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 outline-none focus:border-[color:var(--gold)]/40"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Share (GEN)">
            <input
              type="number"
              min={0}
              step="0.0001"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 outline-none focus:border-[color:var(--gold)]/40"
            />
          </Field>
          <Field label="Condition type">
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as ConditionType)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 outline-none focus:border-[color:var(--gold)]/40"
            >
              <option value="unconditional" className="bg-background">Unconditional</option>
              <option value="date" className="bg-background">Date</option>
              <option value="milestone" className="bg-background">Milestone</option>
              <option value="world_event" className="bg-background">World event</option>
            </select>
          </Field>
        </div>
        <Field label="Condition description">
          <input
            value={conditionDesc}
            onChange={(e) => setConditionDesc(e.target.value)}
            placeholder="On verified passing."
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 outline-none focus:border-[color:var(--gold)]/40"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data sources">
            <input
              value={sources}
              onChange={(e) => setSources(e.target.value)}
              placeholder="domain.com, registry"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 outline-none focus:border-[color:var(--gold)]/40"
            />
          </Field>
          <Field label="Deadline (optional)">
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 outline-none focus:border-[color:var(--gold)]/40"
            />
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
            Cancel
          </button>
          <MagneticButton onClick={submit} variant="gold">Add clause</MagneticButton>
        </div>
      </div>
    </ModalShell>
  );
}

function DepositModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (amount: number) => void }) {
  const [amount, setAmount] = useState(1);
  return (
    <ModalShell title="Deposit GEN" onClose={onClose}>
      <p className="text-sm text-muted-foreground">
        Funds enter the vault immediately. Withdrawals only occur on verified execution.
      </p>
      <div className="mt-4">
        <Field label="Amount (GEN)">
          <input
            type="number"
            min={0}
            step="0.0001"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 outline-none focus:border-[color:var(--gold)]/40"
          />
        </Field>
        <div className="mt-2 flex gap-2 text-xs">
          {[1, 5, 25, 100].map((v) => (
            <button
              key={v}
              onClick={() => setAmount(v)}
              className="rounded-full glass px-3 py-1 hover:bg-white/10"
            >
              {v} GEN
            </button>
          ))}
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
          Cancel
        </button>
        <MagneticButton onClick={() => onSubmit(amount)} variant="violet">Deposit</MagneticButton>
      </div>
    </ModalShell>
  );
}

function DeathModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (urls: string[]) => void }) {
  const [urls, setUrls] = useState<string[]>(["", "", ""]);
  const update = (i: number, v: string) => setUrls(urls.map((u, idx) => (idx === i ? v : u)));
  const submit = () => {
    const cleaned = urls.map((u) => u.trim()).filter(Boolean);
    if (cleaned.length < 3) {
      toast.error("Submit at least three sources");
      return;
    }
    onSubmit(cleaned);
  };
  return (
    <ModalShell title="Submit death evidence" onClose={onClose}>
      <p className="text-sm text-muted-foreground">
        Validators will read these sources, cross-reference them, and vote. At least three
        URLs are required.
      </p>
      <div className="mt-4 space-y-2">
        {urls.map((u, i) => (
          <input
            key={i}
            value={u}
            onChange={(e) => update(i, e.target.value)}
            placeholder={`Evidence URL #${i + 1}`}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 outline-none focus:border-[color:var(--violet)]/40"
          />
        ))}
        <button
          onClick={() => setUrls([...urls, ""])}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          + add another
        </button>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
          Cancel
        </button>
        <MagneticButton onClick={submit} variant="violet">Submit</MagneticButton>
      </div>
    </ModalShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
