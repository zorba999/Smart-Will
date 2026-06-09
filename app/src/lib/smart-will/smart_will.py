# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import json
from dataclasses import dataclass
from datetime import datetime
from genlayer import *


ERROR_EXPECTED = "[EXPECTED]"
ERROR_EXTERNAL = "[EXTERNAL]"
ERROR_TRANSIENT = "[TRANSIENT]"
ERROR_LLM = "[LLM_ERROR]"

STATUS_ACTIVE = "active"
STATUS_PENDING_DEATH = "pending_death"
STATUS_EXECUTING = "executing"
STATUS_EXECUTED = "executed"

CLAUSE_PENDING = "pending"
CLAUSE_CLAIMED = "claimed"
CLAUSE_REJECTED = "rejected"
CLAUSE_EXPIRED = "expired"

COND_UNCONDITIONAL = "unconditional"
COND_DATE = "date"
COND_MILESTONE = "milestone"
COND_WORLD_EVENT = "world_event"

_VALID_CONDITIONS = (
    COND_UNCONDITIONAL,
    COND_DATE,
    COND_MILESTONE,
    COND_WORLD_EVENT,
)


@allow_storage
@dataclass
class Clause:
    id: u256
    original_text: str
    beneficiary: Address
    beneficiary_hint: str
    asset_share_atto: u256
    condition_type: str
    condition_description: str
    data_sources_hint: str
    deadline_iso: str
    status: str
    claimed_at_iso: str
    rejection_reason: str


class SmartWill(gl.Contract):
    testator: Address
    testator_identity_hint: str
    proof_of_life_cadence_seconds: u256
    grace_period_seconds: u256

    status: str
    created_at_iso: str
    last_alive_signal_iso: str
    death_verified_at_iso: str

    total_deposited_atto: u256
    total_paid_out_atto: u256

    clauses: TreeMap[u256, Clause]
    next_clause_id: u256

    # Flattened death evidence (DynArray cannot live inside a user-constructed
    # dataclass, so we keep its fields directly on the contract).
    death_evidence_submitted_at_iso: str
    death_evidence_verdict: str
    death_evidence_reasoning: str
    death_evidence_urls: DynArray[str]

    def __init__(
        self,
        testator_identity_hint: str,
        proof_of_life_cadence_days: u256,
    ):
        self.testator = gl.message.sender_address
        self.testator_identity_hint = testator_identity_hint
        self.proof_of_life_cadence_seconds = proof_of_life_cadence_days * u256(86400)
        self.grace_period_seconds = self.proof_of_life_cadence_seconds * u256(2)
        self.status = STATUS_ACTIVE
        now = self._now()
        self.created_at_iso = now
        self.last_alive_signal_iso = now
        self.death_verified_at_iso = ""
        self.total_deposited_atto = u256(0)
        self.total_paid_out_atto = u256(0)
        self.next_clause_id = u256(0)
        self.death_evidence_submitted_at_iso = ""
        self.death_evidence_verdict = ""
        self.death_evidence_reasoning = ""

    # ----- Helpers -----

    def _now(self) -> str:
        return str(gl.message_raw["datetime"])

    def _iso_to_unix(self, iso: str) -> int:
        if not iso:
            return 0
        try:
            normalized = iso.replace("Z", "+00:00")
            dt = datetime.fromisoformat(normalized)
            return int(dt.timestamp())
        except Exception:
            return 0

    def _seconds_since_last_alive(self) -> int:
        now_u = self._iso_to_unix(self._now())
        last_u = self._iso_to_unix(self.last_alive_signal_iso)
        delta = now_u - last_u
        if delta < 0:
            return 0
        return delta

    def _require_testator(self) -> None:
        if gl.message.sender_address != self.testator:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Only testator")

    def _require_active(self) -> None:
        if self.status != STATUS_ACTIVE:
            raise gl.vm.UserError(
                f"{ERROR_EXPECTED} Will not active (status={self.status})"
            )

    # ----- Heartbeat & Funding -----

    @gl.public.write
    def heartbeat(self) -> None:
        self._require_testator()
        if self.status == STATUS_EXECUTED:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Will already executed")
        if self.status == STATUS_EXECUTING:
            raise gl.vm.UserError(
                f"{ERROR_EXPECTED} Will in execution phase — appeal death verification instead"
            )
        self.last_alive_signal_iso = self._now()
        if self.status == STATUS_PENDING_DEATH:
            self.status = STATUS_ACTIVE

    @gl.public.write.payable
    def deposit_funds(self) -> None:
        self._require_testator()
        self._require_active()
        v = gl.message.value
        if v == u256(0):
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Send positive value")
        self.total_deposited_atto = self.total_deposited_atto + v

    # ----- Clause Management -----

    @gl.public.write
    def add_clause(
        self,
        original_text: str,
        beneficiary: str,
        beneficiary_hint: str,
        asset_share_atto: u256,
        condition_type: str,
        condition_description: str,
        data_sources_hint: str,
        deadline_iso: str,
    ) -> u256:
        self._require_testator()
        self._require_active()

        if condition_type not in _VALID_CONDITIONS:
            raise gl.vm.UserError(
                f"{ERROR_EXPECTED} Invalid condition_type: {condition_type}"
            )
        if asset_share_atto == u256(0):
            raise gl.vm.UserError(
                f"{ERROR_EXPECTED} asset_share_atto must be positive"
            )
        if not original_text:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} original_text required")

        clause_id = self.next_clause_id
        clause = Clause(
            id=clause_id,
            original_text=original_text,
            beneficiary=Address(beneficiary),
            beneficiary_hint=beneficiary_hint,
            asset_share_atto=asset_share_atto,
            condition_type=condition_type,
            condition_description=condition_description,
            data_sources_hint=data_sources_hint,
            deadline_iso=deadline_iso,
            status=CLAUSE_PENDING,
            claimed_at_iso="",
            rejection_reason="",
        )
        self.clauses[clause_id] = clause
        self.next_clause_id = self.next_clause_id + u256(1)
        return clause_id

    @gl.public.write
    def remove_clause(self, clause_id: u256) -> None:
        self._require_testator()
        self._require_active()
        if clause_id not in self.clauses:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Clause not found")
        del self.clauses[clause_id]

    # ----- Death Verification -----

    @gl.public.write
    def trigger_death_check(self, evidence_urls: DynArray[str]) -> str:
        if self.status == STATUS_EXECUTED:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Will already executed")
        if self.status == STATUS_EXECUTING:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Death already verified")

        cadence = int(self.proof_of_life_cadence_seconds)
        grace = int(self.grace_period_seconds)
        elapsed = self._seconds_since_last_alive()
        if elapsed < cadence + grace:
            raise gl.vm.UserError(
                f"{ERROR_EXPECTED} Grace period not exceeded "
                f"(elapsed={elapsed}s, required={cadence + grace}s)"
            )

        if len(evidence_urls) < 3:
            raise gl.vm.UserError(
                f"{ERROR_EXPECTED} At least 3 evidence URLs required"
            )

        url_list = [str(u) for u in evidence_urls]
        verdict = self._verify_death(url_list)

        if verdict["decision"] == "DECEASED":
            self.status = STATUS_EXECUTING
            self.death_verified_at_iso = self._now()
            self.death_evidence_submitted_at_iso = self._now()
            self.death_evidence_verdict = "deceased"
            self.death_evidence_reasoning = verdict["reasoning"][:500]
            for u in url_list:
                self.death_evidence_urls.append(u)
            return "deceased"
        else:
            self.status = STATUS_PENDING_DEATH
            return verdict["decision"]

    def _verify_death(self, evidence_urls: list) -> dict:
        testator_hint = self.testator_identity_hint

        def leader_fn():
            evidence_summaries = []
            for url in evidence_urls[:5]:
                try:
                    page = gl.nondet.web.get_webpage(url, mode="text")
                    page_str = page if isinstance(page, str) else str(page)
                    evidence_summaries.append(
                        {"url": url, "content": page_str[:2000]}
                    )
                except Exception:
                    evidence_summaries.append(
                        {"url": url, "content": "[fetch failed]"}
                    )

            prompt = (
                "You are a death verification validator for a smart will.\n\n"
                f"Subject identity hint: {testator_hint}\n\n"
                "Evidence pages (excerpts):\n"
                f"{json.dumps(evidence_summaries, indent=2)[:6000]}\n\n"
                "Task: Determine if the subject has died.\n"
                "Requirements:\n"
                "1. Cross-reference at least 3 independent sources (different domains).\n"
                "2. Sources must mention the subject by name or unambiguous identifier.\n"
                "3. Prefer reputable sources (news, obituaries, government registries).\n"
                "4. Beware of fake obituaries, AI-generated content, scams.\n\n"
                "Respond ONLY with JSON, no other text:\n"
                '{"decision": "DECEASED" | "ALIVE" | "UNCERTAIN", '
                '"reasoning": "<2-3 sentences>"}'
            )

            raw = gl.nondet.exec_prompt(prompt, response_format="json")
            return _parse_death_verdict(raw)

        def validator_fn(leader_res: gl.vm.Result) -> bool:
            if not isinstance(leader_res, gl.vm.Return):
                return _handle_leader_error(leader_res, leader_fn)
            try:
                validator_result = leader_fn()
            except gl.vm.UserError:
                return False
            leader_decision = ""
            try:
                leader_decision = str(leader_res.calldata.get("decision", ""))
            except Exception:
                return False
            return leader_decision == validator_result["decision"]

        return gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

    # ----- Clause Claiming -----

    @gl.public.write
    def claim_clause(self, clause_id: u256, evidence_url: str) -> str:
        if self.status != STATUS_EXECUTING:
            raise gl.vm.UserError(
                f"{ERROR_EXPECTED} Will not in execution phase"
            )
        if clause_id not in self.clauses:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Clause not found")

        clause = self.clauses[clause_id]
        if clause.status != CLAUSE_PENDING:
            raise gl.vm.UserError(
                f"{ERROR_EXPECTED} Clause not pending (status={clause.status})"
            )
        if gl.message.sender_address != clause.beneficiary:
            raise gl.vm.UserError(
                f"{ERROR_EXPECTED} Only beneficiary can claim"
            )

        if clause.deadline_iso:
            now = self._now()
            if now > clause.deadline_iso:
                clause.status = CLAUSE_EXPIRED
                clause.rejection_reason = "deadline passed"
                self.clauses[clause_id] = clause
                raise gl.vm.UserError(
                    f"{ERROR_EXPECTED} Clause deadline passed"
                )

        if clause.condition_type == COND_UNCONDITIONAL:
            return self._execute_clause(clause_id, "Unconditional clause")

        if clause.condition_type == COND_DATE:
            return self._execute_clause(clause_id, "Date condition satisfied")

        verdict = self._verify_clause_condition(clause, evidence_url)
        if verdict["decision"] == "VERIFIED":
            return self._execute_clause(clause_id, verdict["reasoning"][:200])
        else:
            clause.status = CLAUSE_REJECTED
            clause.rejection_reason = verdict["reasoning"][:300]
            self.clauses[clause_id] = clause
            return f"rejected: {verdict['decision']}"

    def _verify_clause_condition(self, clause: Clause, evidence_url: str) -> dict:
        clause_text = clause.original_text
        condition_desc = clause.condition_description
        data_sources_hint = clause.data_sources_hint
        beneficiary_hint = clause.beneficiary_hint

        def leader_fn():
            try:
                page = gl.nondet.web.get_webpage(evidence_url, mode="text")
                page_text = page if isinstance(page, str) else str(page)
                page_text = page_text[:3000]
            except Exception:
                page_text = "[fetch failed]"

            prompt = (
                "You are a will-clause verification validator.\n\n"
                f"Clause text: {clause_text}\n"
                f"Condition to verify: {condition_desc}\n"
                f"Beneficiary: {beneficiary_hint}\n"
                f"Suggested data sources: {data_sources_hint}\n\n"
                f"Evidence URL submitted: {evidence_url}\n"
                "Page content (excerpt):\n"
                f"{page_text}\n\n"
                "Task: Verify whether the condition has been met.\n"
                "Requirements:\n"
                "1. The evidence URL should come from a reputable source matching"
                " the suggested data sources.\n"
                "2. The page must explicitly confirm the condition for the named"
                " beneficiary.\n"
                "3. Beware of fake/forged pages, ambiguous claims, or insufficient"
                " evidence.\n\n"
                "Respond ONLY with JSON:\n"
                '{"decision": "VERIFIED" | "REJECTED" | "INSUFFICIENT_EVIDENCE",'
                ' "reasoning": "<2-3 sentences>"}'
            )

            raw = gl.nondet.exec_prompt(prompt, response_format="json")
            return _parse_clause_verdict(raw)

        def validator_fn(leader_res: gl.vm.Result) -> bool:
            if not isinstance(leader_res, gl.vm.Return):
                return _handle_leader_error(leader_res, leader_fn)
            try:
                validator_result = leader_fn()
            except gl.vm.UserError:
                return False
            try:
                leader_decision = str(leader_res.calldata.get("decision", ""))
            except Exception:
                return False
            return leader_decision == validator_result["decision"]

        return gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

    def _execute_clause(self, clause_id: u256, reasoning: str) -> str:
        clause = self.clauses[clause_id]
        amount = clause.asset_share_atto

        if amount > self.balance:
            raise gl.vm.UserError(
                f"{ERROR_EXPECTED} Insufficient contract balance "
                f"(need={int(amount)}, have={int(self.balance)})"
            )

        clause.status = CLAUSE_CLAIMED
        clause.claimed_at_iso = self._now()
        self.clauses[clause_id] = clause
        self.total_paid_out_atto = self.total_paid_out_atto + amount

        gl.get_contract_at(clause.beneficiary).emit_transfer(value=amount)

        # Check if every clause has been resolved → terminal state
        all_done = True
        for _, c in self.clauses.items():
            if c.status == CLAUSE_PENDING:
                all_done = False
                break
        if all_done:
            self.status = STATUS_EXECUTED

        return f"claimed: {reasoning}"

    # ----- View Methods -----

    @gl.public.view
    def get_status(self) -> dict:
        elapsed = self._seconds_since_last_alive()
        cadence = int(self.proof_of_life_cadence_seconds)
        grace = int(self.grace_period_seconds)
        return {
            "status": self.status,
            "testator": self.testator.as_hex,
            "testator_identity_hint": self.testator_identity_hint,
            "created_at": self.created_at_iso,
            "last_alive_signal": self.last_alive_signal_iso,
            "death_verified_at": self.death_verified_at_iso,
            "proof_of_life_cadence_seconds": cadence,
            "grace_period_seconds": grace,
            "seconds_since_last_alive": elapsed,
            "can_trigger_death_check": elapsed >= cadence + grace,
            "total_deposited_atto": int(self.total_deposited_atto),
            "total_paid_out_atto": int(self.total_paid_out_atto),
            "balance_atto": int(self.balance),
            "clause_count": int(self.next_clause_id),
        }

    @gl.public.view
    def get_clause(self, clause_id: u256) -> dict:
        if clause_id not in self.clauses:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Clause not found")
        return _clause_to_dict(self.clauses[clause_id])

    @gl.public.view
    def get_all_clauses(self) -> list:
        result = []
        for _, c in self.clauses.items():
            result.append(_clause_to_dict(c))
        return result

    @gl.public.view
    def get_death_evidence(self) -> dict:
        return {
            "submitted_at_iso": self.death_evidence_submitted_at_iso,
            "verdict": self.death_evidence_verdict,
            "reasoning": self.death_evidence_reasoning,
            "evidence_urls": [str(u) for u in self.death_evidence_urls],
        }


# ----- Module-level pure helpers (no `self`) -----

def _parse_death_verdict(raw) -> dict:
    if not isinstance(raw, dict):
        raise gl.vm.UserError(f"{ERROR_LLM} LLM returned non-dict")
    decision = str(raw.get("decision", "")).upper()
    if decision not in ("DECEASED", "ALIVE", "UNCERTAIN"):
        raise gl.vm.UserError(f"{ERROR_LLM} Invalid decision: {decision}")
    return {"decision": decision, "reasoning": str(raw.get("reasoning", ""))}


def _parse_clause_verdict(raw) -> dict:
    if not isinstance(raw, dict):
        raise gl.vm.UserError(f"{ERROR_LLM} LLM returned non-dict")
    decision = str(raw.get("decision", "")).upper()
    if decision not in ("VERIFIED", "REJECTED", "INSUFFICIENT_EVIDENCE"):
        raise gl.vm.UserError(f"{ERROR_LLM} Invalid decision: {decision}")
    return {"decision": decision, "reasoning": str(raw.get("reasoning", ""))}


def _handle_leader_error(leader_res, leader_fn) -> bool:
    leader_msg = leader_res.message if hasattr(leader_res, "message") else ""
    try:
        leader_fn()
        return False
    except gl.vm.UserError as e:
        validator_msg = e.message if hasattr(e, "message") else str(e)
        if validator_msg.startswith(ERROR_EXPECTED) or validator_msg.startswith(
            ERROR_EXTERNAL
        ):
            return validator_msg == leader_msg
        if validator_msg.startswith(ERROR_TRANSIENT) and leader_msg.startswith(
            ERROR_TRANSIENT
        ):
            return True
        return False
    except Exception:
        return False


def _clause_to_dict(c: Clause) -> dict:
    return {
        "id": int(c.id),
        "original_text": c.original_text,
        "beneficiary": c.beneficiary.as_hex,
        "beneficiary_hint": c.beneficiary_hint,
        "asset_share_atto": int(c.asset_share_atto),
        "condition_type": c.condition_type,
        "condition_description": c.condition_description,
        "data_sources_hint": c.data_sources_hint,
        "deadline_iso": c.deadline_iso,
        "status": c.status,
        "claimed_at_iso": c.claimed_at_iso,
        "rejection_reason": c.rejection_reason,
    }
