export type WillStatus = "active" | "pending_death" | "executing" | "executed";
export type ConditionType = "unconditional" | "date" | "milestone" | "world_event";
export type ClauseStatus = "pending" | "claimed" | "rejected" | "expired";
export type UserRole = "testator" | "beneficiary" | "observer";

export interface WillStatusData {
  status: WillStatus;
  testator: string;
  testator_identity_hint: string;
  created_at: string;
  last_alive_signal: string;
  death_verified_at: string | null;
  proof_of_life_cadence_seconds: number;
  grace_period_seconds: number;
  seconds_since_last_alive: number;
  can_trigger_death_check: boolean;
  total_deposited_atto: string;
  total_paid_out_atto: string;
  balance_atto: string;
  clause_count: number;
}

export interface Clause {
  id: string;
  original_text: string;
  beneficiary: string;
  beneficiary_hint: string;
  asset_share_atto: string;
  condition_type: ConditionType;
  condition_description: string;
  data_sources_hint: string;
  deadline_iso: string | null;
  status: ClauseStatus;
  claimed_at_iso: string | null;
  rejection_reason: string | null;
}

export interface DeathEvidence {
  submitted_at_iso: string;
  verdict: string;
  reasoning: string;
  evidence_urls: string[];
}

export interface AddClauseInput {
  original_text: string;
  beneficiary: string;
  beneficiary_hint: string;
  asset_share_atto: string;
  condition_type: ConditionType;
  condition_description: string;
  data_sources_hint: string;
  deadline_iso: string | null;
}
