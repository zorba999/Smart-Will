import { makeClient } from "../services/genlayer";
// Vite's `?raw` import: contracts/smart_will.py is read once at build time
// and bundled into the SPA as a plain string.
import smartWillSource from "../../../contracts/smart_will.py?raw";

const ACCEPTED = "ACCEPTED";

/**
 * Deploy a fresh SmartWill instance from the connected wallet.
 * The user signs the deploy tx in their wallet — no private key handling here.
 *
 * @param {string} walletAddress  0x… of the signer (becomes testator)
 * @param {string} identityHint   Human-readable identifier (used by validators in death verification)
 * @param {number|bigint} cadenceDays  Proof-of-life cadence in days
 * @returns {Promise<string>}  Deployed contract address
 */
export async function deployNewWill(walletAddress, identityHint, cadenceDays) {
  if (!walletAddress) throw new Error("Wallet not connected");
  if (!identityHint || !identityHint.trim()) {
    throw new Error("Identity hint is required");
  }
  const days = BigInt(cadenceDays);
  if (days <= 0n) throw new Error("Cadence must be positive");

  const client = makeClient(walletAddress);
  const code = new TextEncoder().encode(smartWillSource);

  const txHash = await client.deployContract({
    code,
    args: [identityHint.trim(), days],
  });

  // Use fullTransaction so we get the entire decoded structure — the simplified
  // receipt strips fields the network uses to encode the deployed address.
  const receipt = await client.waitForTransactionReceipt({
    hash: txHash,
    status: ACCEPTED,
    interval: 5000,
    retries: 60,
    fullTransaction: true,
  });

  // genlayer-js receipt layout has shifted over versions. Probe every known path.
  const addr = extractContractAddress(receipt);
  if (!addr) {
    // Log once so future runs can adjust the probe list without re-deploying.
    console.warn("[deploy] receipt with no contract address — full dump:", receipt);
    throw new Error(`Deploy succeeded but no contract_address found in receipt. TX: ${txHash}`);
  }
  return addr;
}

function extractContractAddress(receipt) {
  if (!receipt) return null;
  const candidates = [
    receipt?.data?.contract_address,
    receipt?.data?.contractAddress,
    receipt?.contract_address,
    receipt?.contractAddress,
    receipt?.txDataDecoded?.contractAddress,
    receipt?.consensus_data?.leader_receipt?.[0]?.contract_address,
    receipt?.consensus_data?.leader_receipt?.[0]?.contractAddress,
    receipt?.consensusData?.leaderReceipt?.[0]?.contract_address,
    receipt?.consensusData?.leaderReceipt?.[0]?.contractAddress,
    receipt?.lastRound?.executionResult?.contract_address,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && /^0x[0-9a-fA-F]{40}$/.test(c)) return c;
  }
  // Recipient is zeroAddress for deploys in the wire format, but in a few SDK
  // versions the receipt's `recipient` is replaced with the deployed address.
  const recipient = receipt?.recipient;
  if (
    typeof recipient === "string" &&
    /^0x[0-9a-fA-F]{40}$/.test(recipient) &&
    recipient !== "0x0000000000000000000000000000000000000000"
  ) {
    return recipient;
  }
  return null;
}

export default class SmartWill {
  constructor(contractAddress, walletAddress = null) {
    this.contractAddress = contractAddress;
    this.client = makeClient(walletAddress);
  }

  setWalletAddress(walletAddress) {
    this.client = makeClient(walletAddress);
  }

  // ----- Reads -----

  async getStatus() {
    return this.client.readContract({
      address: this.contractAddress,
      functionName: "get_status",
      args: [],
    });
  }

  async getAllClauses() {
    const result = await this.client.readContract({
      address: this.contractAddress,
      functionName: "get_all_clauses",
      args: [],
    });
    return result.map((c) =>
      c instanceof Map ? Object.fromEntries(c.entries()) : c,
    );
  }

  async getDeathEvidence() {
    const result = await this.client.readContract({
      address: this.contractAddress,
      functionName: "get_death_evidence",
      args: [],
    });
    return result instanceof Map ? Object.fromEntries(result.entries()) : result;
  }

  // ----- Writes -----

  /**
   * Submit a write transaction and return the tx hash immediately (after the
   * wallet signs and the tx is broadcast). Does NOT wait for consensus —
   * callers should track it with waitForReceipt() in the background so the UI
   * stays responsive (Bradbury consensus can take 1-3 minutes).
   *
   * `leaderOnly: true` skips full validator rotation — only the leader executes.
   * Use it for DETERMINISTIC writes (no LLM, no web), which dramatically cuts
   * confirmation latency. NEVER use it for methods that run exec_prompt /
   * web access, where independent validator agreement is the whole point.
   */
  async _submit(functionName, args, value, leaderOnly = false) {
    const params = {
      address: this.contractAddress,
      functionName,
      args,
      leaderOnly,
    };
    if (value !== undefined && value > 0n) {
      params.value = value;
    }
    return this.client.writeContract(params);
  }

  /** Wait for a previously submitted tx to reach ACCEPTED. */
  async waitForReceipt(txHash) {
    return this.client.waitForTransactionReceipt({
      hash: txHash,
      status: ACCEPTED,
      interval: 2500,
      retries: 120,
    });
  }

  // Deterministic writes (no LLM/web) → leaderOnly for fast confirmation.

  async heartbeat() {
    return this._submit("heartbeat", [], undefined, true);
  }

  async depositFunds(amountAtto) {
    return this._submit("deposit_funds", [], BigInt(amountAtto), true);
  }

  async addClause({
    originalText,
    beneficiary,
    beneficiaryHint,
    assetShareAtto,
    conditionType,
    conditionDescription,
    dataSourcesHint,
    deadlineIso,
  }) {
    return this._submit(
      "add_clause",
      [
        originalText,
        beneficiary,
        beneficiaryHint,
        BigInt(assetShareAtto),
        conditionType,
        conditionDescription,
        dataSourcesHint,
        deadlineIso,
      ],
      undefined,
      true, // deterministic — only stores clause data, no LLM
    );
  }

  async removeClause(clauseId) {
    return this._submit("remove_clause", [BigInt(clauseId)], undefined, true);
  }

  // Non-deterministic writes (run LLM + web) → MUST keep full validator
  // consensus. leaderOnly here would let a single leader decide subjective
  // AI judgments, defeating the security model.

  async triggerDeathCheck(evidenceUrls) {
    return this._submit("trigger_death_check", [evidenceUrls], undefined, false);
  }

  async claimClause(clauseId, evidenceUrl) {
    return this._submit("claim_clause", [BigInt(clauseId), evidenceUrl || ""], undefined, false);
  }
}

export function attoToGen(atto) {
  if (atto === undefined || atto === null) return "0";
  const b = typeof atto === "bigint" ? atto : BigInt(atto);
  const whole = b / 10n ** 18n;
  const fraction = b % 10n ** 18n;
  const fractionStr = fraction.toString().padStart(18, "0").slice(0, 4);
  return `${whole.toString()}.${fractionStr}`;
}

export function genToAtto(gen) {
  const [whole, fraction = ""] = String(gen).split(".");
  const fracPadded = (fraction + "000000000000000000").slice(0, 18);
  return BigInt(whole) * 10n ** 18n + BigInt(fracPadded || "0");
}

export function formatDuration(seconds) {
  const s = Number(seconds);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}
