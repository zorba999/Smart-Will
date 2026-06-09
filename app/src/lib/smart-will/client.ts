// Smart Will client — real genlayer-js wiring against the GenLayer Bradbury
// testnet. Implements the same SmartWillClient interface the UI already uses,
// so swapping from the previous mock required no UI changes.

import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import type {
  AddClauseInput,
  Clause,
  ConditionType,
  ClauseStatus,
  DeathEvidence,
  WillStatus,
  WillStatusData,
} from "./types";
import { genToAtto } from "./format";
// Bundled contract source (read at build time) so the user can deploy their
// own will straight from the browser, signed by their wallet.
import contractSource from "./smart_will.py?raw";

const EXAMPLE_CONTRACT = "0xd4388aC3A5BBdE1c55125109bD521706eA1dA4d8";

export const EXAMPLE_WILL_ADDRESS = EXAMPLE_CONTRACT;
export const EXPLORER_BASE = "https://explorer-bradbury.genlayer.com";

type AnyRecord = Record<string, unknown>;

/** genlayer-js may return a Map or a plain object for dict returns. Normalize. */
function toObj(v: unknown): AnyRecord {
  if (v instanceof Map) return Object.fromEntries(v.entries()) as AnyRecord;
  return (v ?? {}) as AnyRecord;
}

function asString(v: unknown, fallback = ""): string {
  if (v === null || v === undefined) return fallback;
  return typeof v === "string" ? v : String(v);
}

function asNumber(v: unknown, fallback = 0): number {
  if (v === null || v === undefined) return fallback;
  if (typeof v === "bigint") return Number(v);
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Big integer atto values come back as BigInt/number — keep them as strings. */
function asAtto(v: unknown): string {
  if (typeof v === "bigint") return v.toString();
  if (v === null || v === undefined) return "0";
  return String(v);
}

function makeReadWriteClient(walletAddress?: string) {
  return walletAddress
    ? createClient({ chain: testnetBradbury, account: walletAddress as `0x${string}` })
    : createClient({ chain: testnetBradbury });
}

export interface SmartWillClient {
  address: string;
  getStatus(): Promise<WillStatusData>;
  getAllClauses(): Promise<Clause[]>;
  getDeathEvidence(): Promise<DeathEvidence | null>;
  heartbeat(): Promise<{ hash: string }>;
  depositFunds(genAmount: number): Promise<{ hash: string }>;
  addClause(input: AddClauseInput): Promise<{ hash: string; clause: Clause }>;
  removeClause(clauseId: string): Promise<{ hash: string }>;
  triggerDeathCheck(evidenceUrls: string[]): Promise<{ hash: string }>;
  claimClause(clauseId: string, evidenceUrl: string): Promise<{ hash: string }>;
}

export function createSmartWillClient(
  address: string,
  walletAddress?: string,
): SmartWillClient {
  const client = makeReadWriteClient(walletAddress);
  const contractAddress = address as `0x${string}`;

  const read = (functionName: string, args: unknown[] = []) =>
    client.readContract({ address: contractAddress, functionName, args });

  // Submit a write and return the tx hash immediately (non-blocking). Bradbury
  // consensus settles in the background; react-query polling reconciles state.
  const write = async (
    functionName: string,
    args: unknown[],
    opts: { value?: bigint; leaderOnly?: boolean } = {},
  ): Promise<{ hash: string }> => {
    const params: AnyRecord = {
      address: contractAddress,
      functionName,
      args,
      leaderOnly: opts.leaderOnly ?? false,
    };
    if (opts.value && opts.value > 0n) params.value = opts.value;
    const hash = (await client.writeContract(params as never)) as string;
    return { hash };
  };

  return {
    address,

    async getStatus(): Promise<WillStatusData> {
      const s = toObj(await read("get_status"));
      const deathVerified = asString(s.death_verified_at);
      return {
        status: asString(s.status, "active") as WillStatus,
        testator: asString(s.testator),
        testator_identity_hint: asString(s.testator_identity_hint),
        created_at: asString(s.created_at),
        last_alive_signal: asString(s.last_alive_signal),
        death_verified_at: deathVerified || null,
        proof_of_life_cadence_seconds: asNumber(s.proof_of_life_cadence_seconds),
        grace_period_seconds: asNumber(s.grace_period_seconds),
        seconds_since_last_alive: asNumber(s.seconds_since_last_alive),
        can_trigger_death_check: Boolean(s.can_trigger_death_check),
        total_deposited_atto: asAtto(s.total_deposited_atto),
        total_paid_out_atto: asAtto(s.total_paid_out_atto),
        balance_atto: asAtto(s.balance_atto),
        clause_count: asNumber(s.clause_count),
      };
    },

    async getAllClauses(): Promise<Clause[]> {
      const raw = (await read("get_all_clauses")) as unknown[];
      if (!Array.isArray(raw)) return [];
      return raw.map((item) => {
        const c = toObj(item);
        return {
          id: asString(c.id),
          original_text: asString(c.original_text),
          beneficiary: asString(c.beneficiary),
          beneficiary_hint: asString(c.beneficiary_hint),
          asset_share_atto: asAtto(c.asset_share_atto),
          condition_type: asString(c.condition_type, "unconditional") as ConditionType,
          condition_description: asString(c.condition_description),
          data_sources_hint: asString(c.data_sources_hint) || "—",
          deadline_iso: asString(c.deadline_iso) || null,
          status: asString(c.status, "pending") as ClauseStatus,
          claimed_at_iso: asString(c.claimed_at_iso) || null,
          rejection_reason: asString(c.rejection_reason) || null,
        };
      });
    },

    async getDeathEvidence(): Promise<DeathEvidence | null> {
      const e = toObj(await read("get_death_evidence"));
      const verdict = asString(e.verdict);
      const submitted = asString(e.submitted_at_iso);
      if (!verdict && !submitted) return null;
      const urls = Array.isArray(e.evidence_urls)
        ? (e.evidence_urls as unknown[]).map((u) => asString(u))
        : [];
      return {
        submitted_at_iso: submitted,
        verdict,
        reasoning: asString(e.reasoning),
        evidence_urls: urls,
      };
    },

    // Deterministic writes → leaderOnly for fast confirmation.
    heartbeat() {
      return write("heartbeat", [], { leaderOnly: true });
    },

    depositFunds(genAmount: number) {
      const atto = BigInt(genToAtto(genAmount));
      return write("deposit_funds", [], { value: atto, leaderOnly: true });
    },

    async addClause(input: AddClauseInput): Promise<{ hash: string; clause: Clause }> {
      const { hash } = await write(
        "add_clause",
        [
          input.original_text,
          input.beneficiary,
          input.beneficiary_hint,
          BigInt(input.asset_share_atto),
          input.condition_type,
          input.condition_description,
          input.data_sources_hint,
          input.deadline_iso ?? "",
        ],
        { leaderOnly: true },
      );
      const clause: Clause = {
        id: `pending-${Date.now()}`,
        status: "pending",
        claimed_at_iso: null,
        rejection_reason: null,
        ...input,
      };
      return { hash, clause };
    },

    removeClause(clauseId: string) {
      return write("remove_clause", [BigInt(clauseId)], { leaderOnly: true });
    },

    // Non-deterministic writes (LLM + web) → full validator consensus.
    triggerDeathCheck(evidenceUrls: string[]) {
      if (evidenceUrls.length < 3) {
        return Promise.reject(new Error("At least 3 evidence URLs required"));
      }
      return write("trigger_death_check", [evidenceUrls], { leaderOnly: false });
    },

    claimClause(clauseId: string, evidenceUrl: string) {
      return write("claim_clause", [BigInt(clauseId), evidenceUrl || ""], {
        leaderOnly: false,
      });
    },
  };
}

/**
 * Deploy a fresh Smart Will from the connected wallet. The wallet signs the
 * deploy tx — no private key is handled here. Returns the new contract address.
 */
export async function deployWill(
  walletAddress: string,
  identityHint: string,
  cadenceDays: number,
): Promise<string> {
  if (!walletAddress) throw new Error("Wallet not connected");
  const identity = identityHint.trim() || `Owner of wallet ${walletAddress}`;
  const days = BigInt(Math.max(1, Math.floor(cadenceDays || 30)));

  const client = createClient({
    chain: testnetBradbury,
    account: walletAddress as `0x${string}`,
  });
  const code = new TextEncoder().encode(contractSource);

  const txHash = (await client.deployContract({
    code,
    args: [identity, days],
  } as never)) as string;

  const receipt = (await client.waitForTransactionReceipt({
    hash: txHash as never,
    status: "ACCEPTED" as never,
    interval: 5000,
    retries: 120,
  } as never)) as AnyRecord;

  const addr = extractContractAddress(receipt);
  if (!addr) {
    throw new Error(`Deploy sent but no contract address in receipt. Tx: ${txHash}`);
  }
  return addr;
}

function extractContractAddress(receipt: AnyRecord): string | null {
  const r = receipt as AnyRecord & {
    data?: AnyRecord;
    txDataDecoded?: AnyRecord;
    consensus_data?: { leader_receipt?: AnyRecord[] };
  };
  const candidates: unknown[] = [
    r?.data?.contract_address,
    r?.data?.contractAddress,
    r?.contract_address,
    r?.contractAddress,
    r?.txDataDecoded?.contractAddress,
    r?.consensus_data?.leader_receipt?.[0]?.contract_address,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && /^0x[0-9a-fA-F]{40}$/.test(c)) return c;
  }
  return null;
}
