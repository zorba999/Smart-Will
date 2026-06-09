"""
Direct-mode tests for SmartWill — exercise state transitions, validation,
LLM/web flow with mocks. Validator consensus is verified separately in
integration tests.
"""

from __future__ import annotations

import json
import pytest


GEN = 10**18  # 1 GEN in atto


def _hex(addr) -> str:
    """Normalize an address to lowercase hex with 0x prefix.

    Fixture resolution order is not guaranteed: `direct_owner` and friends may
    be bytes (resolved before genlayer SDK is loaded) or Address (after).
    """
    if hasattr(addr, "as_hex"):
        return addr.as_hex.lower()
    if isinstance(addr, bytes):
        return "0x" + addr.hex()
    return str(addr).lower()


# ----------------- Initial state & funding -----------------


def test_initial_state(deployed_will, direct_owner):
    s = deployed_will.get_status()
    assert s["status"] == "active"
    assert s["testator"].lower() == _hex(direct_owner)
    assert s["clause_count"] == 0
    assert s["total_deposited_atto"] == 0
    assert s["total_paid_out_atto"] == 0
    assert s["proof_of_life_cadence_seconds"] == 30 * 86400
    assert s["grace_period_seconds"] == 60 * 86400
    assert s["can_trigger_death_check"] is False


def test_deposit_funds_increments_total(deployed_will, direct_vm, direct_owner):
    direct_vm.sender = direct_owner
    direct_vm.value = 50 * GEN
    deployed_will.deposit_funds()
    direct_vm.value = 0
    s = deployed_will.get_status()
    assert s["total_deposited_atto"] == 50 * GEN


def test_deposit_zero_value_reverts(deployed_will, direct_vm, direct_owner):
    direct_vm.sender = direct_owner
    direct_vm.value = 0
    with direct_vm.expect_revert("Send positive value"):
        deployed_will.deposit_funds()


def test_deposit_only_testator(deployed_will, direct_vm, direct_bob):
    direct_vm.sender = direct_bob
    direct_vm.value = 10 * GEN
    with direct_vm.expect_revert("Only testator"):
        deployed_will.deposit_funds()


# ----------------- Heartbeat -----------------


def test_heartbeat_updates_last_alive(deployed_will, direct_vm, direct_owner):
    direct_vm.sender = direct_owner
    direct_vm.warp("2026-02-15T00:00:00Z")
    deployed_will.heartbeat()
    s = deployed_will.get_status()
    assert s["last_alive_signal"] == "2026-02-15T00:00:00Z"


def test_heartbeat_only_testator(deployed_will, direct_vm, direct_bob):
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Only testator"):
        deployed_will.heartbeat()


# ----------------- Clauses: add / remove / validate -----------------


def test_add_clause_unconditional(deployed_will, direct_vm, direct_owner, direct_bob):
    direct_vm.sender = direct_owner
    cid = deployed_will.add_clause(
        "Give 50 GEN to my brother Karim unconditionally.",
        _hex(direct_bob),
        "Karim Berrada, brother",
        50 * GEN,
        "unconditional",
        "",
        "",
        "",
    )
    assert cid == 0
    s = deployed_will.get_status()
    assert s["clause_count"] == 1

    c = deployed_will.get_clause(0)
    assert c["beneficiary"].lower() == _hex(direct_bob)
    assert c["asset_share_atto"] == 50 * GEN
    assert c["condition_type"] == "unconditional"
    assert c["status"] == "pending"


def test_add_clause_milestone(deployed_will, direct_vm, direct_owner, direct_charlie):
    direct_vm.sender = direct_owner
    cid = deployed_will.add_clause(
        "Give 30 GEN to Sarah if she finishes med school before 2035.",
        _hex(direct_charlie),
        "Sarah Hassan, daughter, born 2005-08-21",
        30 * GEN,
        "milestone",
        "Sarah Hassan graduated from an accredited medical school.",
        "University registries, official news, LinkedIn diploma",
        "2035-01-01T00:00:00Z",
    )
    c = deployed_will.get_clause(cid)
    assert c["condition_type"] == "milestone"
    assert c["deadline_iso"] == "2035-01-01T00:00:00Z"


def test_add_clause_invalid_condition_type(deployed_will, direct_vm, direct_owner, direct_bob):
    direct_vm.sender = direct_owner
    with direct_vm.expect_revert("Invalid condition_type"):
        deployed_will.add_clause(
            "x", _hex(direct_bob), "x", 10 * GEN,
            "magic",  # invalid
            "", "", "",
        )


def test_add_clause_zero_share_reverts(deployed_will, direct_vm, direct_owner, direct_bob):
    direct_vm.sender = direct_owner
    with direct_vm.expect_revert("asset_share_atto must be positive"):
        deployed_will.add_clause(
            "x", _hex(direct_bob), "x", 0,
            "unconditional", "", "", "",
        )


def test_add_clause_empty_text_reverts(deployed_will, direct_vm, direct_owner, direct_bob):
    direct_vm.sender = direct_owner
    with direct_vm.expect_revert("original_text required"):
        deployed_will.add_clause(
            "", _hex(direct_bob), "x", 10 * GEN,
            "unconditional", "", "", "",
        )


def test_add_clause_only_testator(deployed_will, direct_vm, direct_bob):
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Only testator"):
        deployed_will.add_clause(
            "x", _hex(direct_bob), "x", 10 * GEN,
            "unconditional", "", "", "",
        )


def test_remove_clause(deployed_will, direct_vm, direct_owner, direct_bob):
    direct_vm.sender = direct_owner
    cid = deployed_will.add_clause(
        "x", _hex(direct_bob), "x", 10 * GEN,
        "unconditional", "", "", "",
    )
    deployed_will.remove_clause(cid)
    with direct_vm.expect_revert("Clause not found"):
        deployed_will.get_clause(cid)


def test_remove_unknown_clause_reverts(deployed_will, direct_vm, direct_owner):
    direct_vm.sender = direct_owner
    with direct_vm.expect_revert("Clause not found"):
        deployed_will.remove_clause(999)


# ----------------- Death verification -----------------


def test_death_check_before_grace_period_reverts(
    deployed_will, direct_vm, direct_bob
):
    direct_vm.sender = direct_bob
    direct_vm.warp("2026-01-15T00:00:00Z")
    with direct_vm.expect_revert("Grace period not exceeded"):
        deployed_will.trigger_death_check(
            ["https://news1.com", "https://news2.com", "https://news3.com"]
        )


def test_death_check_needs_3_urls(deployed_will, direct_vm, direct_bob):
    direct_vm.sender = direct_bob
    direct_vm.warp("2026-12-01T00:00:00Z")  # well past grace
    with direct_vm.expect_revert("At least 3 evidence URLs required"):
        deployed_will.trigger_death_check(
            ["https://news1.com", "https://news2.com"]
        )


def test_death_check_deceased_flow(deployed_will, direct_vm, direct_bob):
    # Past grace period
    direct_vm.warp("2026-12-01T00:00:00Z")
    direct_vm.sender = direct_bob

    # Mock all 3 URLs as obituaries
    direct_vm.mock_web(
        r"https://news[0-9]+\.com.*",
        {"status": 200, "body": "Obituary: Hassan Berrada (DOB 1980-05-12) passed away peacefully on 2026-11-20 in Casablanca."},
    )
    # Mock LLM to return DECEASED
    direct_vm.mock_llm(
        r"death verification validator",
        json.dumps({"decision": "DECEASED", "reasoning": "Three independent obituaries confirm Hassan Berrada's death."}),
    )

    result = deployed_will.trigger_death_check([
        "https://news1.com/x",
        "https://news2.com/y",
        "https://news3.com/z",
    ])
    assert result == "deceased"

    s = deployed_will.get_status()
    assert s["status"] == "executing"
    assert s["death_verified_at"] == "2026-12-01T00:00:00Z"

    ev = deployed_will.get_death_evidence()
    assert ev["verdict"] == "deceased"
    assert len(ev["evidence_urls"]) == 3


def test_death_check_alive_returns_pending(deployed_will, direct_vm, direct_bob):
    direct_vm.warp("2026-12-01T00:00:00Z")
    direct_vm.sender = direct_bob
    direct_vm.mock_web(
        r"https://.*",
        {"status": 200, "body": "Random news article unrelated to subject."},
    )
    direct_vm.mock_llm(
        r"death verification validator",
        json.dumps({"decision": "ALIVE", "reasoning": "No evidence of death in any source."}),
    )
    result = deployed_will.trigger_death_check([
        "https://news1.com", "https://news2.com", "https://news3.com"
    ])
    assert result == "ALIVE"
    assert deployed_will.get_status()["status"] == "pending_death"


def test_heartbeat_revives_from_pending_death(
    deployed_will, direct_vm, direct_owner, direct_bob
):
    direct_vm.warp("2026-12-01T00:00:00Z")
    direct_vm.sender = direct_bob
    direct_vm.mock_web(r"https://.*", {"status": 200, "body": "unrelated"})
    direct_vm.mock_llm(
        r"death verification validator",
        json.dumps({"decision": "UNCERTAIN", "reasoning": "ambiguous"}),
    )
    deployed_will.trigger_death_check(
        ["https://a.com", "https://b.com", "https://c.com"]
    )
    assert deployed_will.get_status()["status"] == "pending_death"

    # Testator wakes up and heartbeats
    direct_vm.sender = direct_owner
    direct_vm.warp("2026-12-02T00:00:00Z")
    deployed_will.heartbeat()
    assert deployed_will.get_status()["status"] == "active"


# ----------------- Claim flows -----------------


def test_claim_blocked_while_active(funded_will, direct_vm, direct_owner, direct_bob):
    direct_vm.sender = direct_owner
    funded_will.add_clause(
        "Give 10 GEN to Bob unconditionally",
        _hex(direct_bob), "Bob", 10 * GEN,
        "unconditional", "", "", "",
    )
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Will not in execution phase"):
        funded_will.claim_clause(0, "")


def _execute_will(funded_will, direct_vm):
    """Helper: warp past grace, trigger death = DECEASED."""
    direct_vm.warp("2026-12-01T00:00:00Z")
    direct_vm.mock_web(
        r"https://.*", {"status": 200, "body": "Obituary..."}
    )
    direct_vm.mock_llm(
        r"death verification validator",
        json.dumps({"decision": "DECEASED", "reasoning": "ok"}),
    )
    funded_will.trigger_death_check(
        ["https://a.com", "https://b.com", "https://c.com"]
    )
    direct_vm.clear_mocks()


def test_claim_unconditional_after_death(
    funded_will, direct_vm, direct_owner, direct_bob
):
    direct_vm.sender = direct_owner
    cid = funded_will.add_clause(
        "Give 25 GEN to Bob unconditionally",
        _hex(direct_bob), "Bob", 25 * GEN,
        "unconditional", "", "", "",
    )
    _execute_will(funded_will, direct_vm)

    direct_vm.sender = direct_bob
    result = funded_will.claim_clause(cid, "")
    assert "claimed" in result

    c = funded_will.get_clause(cid)
    assert c["status"] == "claimed"
    assert funded_will.get_status()["total_paid_out_atto"] == 25 * GEN


def test_claim_wrong_beneficiary_reverts(
    funded_will, direct_vm, direct_owner, direct_bob, direct_charlie
):
    direct_vm.sender = direct_owner
    cid = funded_will.add_clause(
        "Give to Bob",
        _hex(direct_bob), "Bob", 10 * GEN,
        "unconditional", "", "", "",
    )
    _execute_will(funded_will, direct_vm)

    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("Only beneficiary can claim"):
        funded_will.claim_clause(cid, "")


def test_claim_milestone_verified(
    funded_will, direct_vm, direct_owner, direct_charlie
):
    direct_vm.sender = direct_owner
    cid = funded_will.add_clause(
        "Give 30 GEN to Sarah if she finishes med school.",
        _hex(direct_charlie), "Sarah Hassan, daughter", 30 * GEN,
        "milestone",
        "Sarah Hassan graduated from an accredited medical school.",
        "University registries, official press releases",
        "",
    )
    _execute_will(funded_will, direct_vm)

    # Evidence: a university registry page
    direct_vm.mock_web(
        r"https://medschool\.example\.edu.*",
        {"status": 200, "body": "Class of 2030 — Sarah Hassan, M.D., graduated."},
    )
    direct_vm.mock_llm(
        r"will-clause verification validator",
        json.dumps({"decision": "VERIFIED", "reasoning": "registry confirms graduation"}),
    )

    direct_vm.sender = direct_charlie
    result = funded_will.claim_clause(cid, "https://medschool.example.edu/2030/grads")
    assert "claimed" in result
    assert funded_will.get_clause(cid)["status"] == "claimed"


def test_claim_milestone_rejected(
    funded_will, direct_vm, direct_owner, direct_charlie
):
    direct_vm.sender = direct_owner
    cid = funded_will.add_clause(
        "Give 30 GEN to Sarah if she finishes med school.",
        _hex(direct_charlie), "Sarah Hassan", 30 * GEN,
        "milestone",
        "Sarah Hassan graduated medical school.",
        "University registries",
        "",
    )
    _execute_will(funded_will, direct_vm)

    direct_vm.mock_web(
        r"https://.*", {"status": 200, "body": "Unrelated page."}
    )
    direct_vm.mock_llm(
        r"will-clause verification validator",
        json.dumps({"decision": "REJECTED", "reasoning": "no evidence of graduation"}),
    )

    direct_vm.sender = direct_charlie
    result = funded_will.claim_clause(cid, "https://random.example.com")
    assert "rejected" in result

    c = funded_will.get_clause(cid)
    assert c["status"] == "rejected"
    assert "no evidence" in c["rejection_reason"]


def test_get_all_clauses(deployed_will, direct_vm, direct_owner, direct_bob, direct_charlie):
    direct_vm.sender = direct_owner
    deployed_will.add_clause(
        "c1", _hex(direct_bob), "Bob", 10 * GEN, "unconditional", "", "", "",
    )
    deployed_will.add_clause(
        "c2", _hex(direct_charlie), "Charlie", 20 * GEN, "unconditional", "", "", "",
    )
    all_clauses = deployed_will.get_all_clauses()
    assert len(all_clauses) == 2
    assert all_clauses[0]["original_text"] == "c1"
    assert all_clauses[1]["original_text"] == "c2"
