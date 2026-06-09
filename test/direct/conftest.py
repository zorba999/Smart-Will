"""
Direct-mode test helpers for SmartWill.

Patches applied:
1. VMContext.warp also updates gl.message_raw['datetime'] (so the contract's
   gl.message_raw["datetime"] reads see the warped timestamp). The stock warp()
   only updates the VM internal _datetime and patches datetime.now().
2. _inject_message_to_fd0 is wrapped to defer os.unlink on Windows, where
   you cannot unlink a file while a dup'd fd still references it.
"""

from __future__ import annotations

import os
import sys
import pytest
from gltest.direct.vm import VMContext
import gltest.direct.loader as _loader


# --- Patch 1: warp() should also update gl.message_raw['datetime'] ---

_original_warp = VMContext.warp


def _patched_warp(self, timestamp: str) -> None:
    _original_warp(self, timestamp)
    if "genlayer.gl" in sys.modules:
        gl = sys.modules["genlayer.gl"]
        if hasattr(gl, "message_raw") and gl.message_raw is not None:
            gl.message_raw["datetime"] = timestamp


VMContext.warp = _patched_warp


# --- Patch 2: Windows-friendly message injection (skip os.unlink on PermissionError) ---

_orig_inject = _loader._inject_message_to_fd0


def _patched_inject(vm):
    import tempfile
    from genlayer.py import calldata
    from genlayer.py.types import Address

    sender_addr = vm.sender
    if isinstance(sender_addr, bytes):
        sender_addr = Address(sender_addr)
    contract_addr = vm._contract_address
    if isinstance(contract_addr, bytes):
        contract_addr = Address(contract_addr)
    origin_addr = vm.origin
    if isinstance(origin_addr, bytes):
        origin_addr = Address(origin_addr)

    message_data = {
        "contract_address": contract_addr,
        "sender_address": sender_addr,
        "origin_address": origin_addr,
        "stack": [],
        "value": vm._value,
        "datetime": vm._datetime,
        "is_init": False,
        "chain_id": vm._chain_id,
        "entry_kind": 0,
        "entry_data": b"",
        "entry_stage_data": None,
    }
    encoded = calldata.encode(message_data)

    fd, path = tempfile.mkstemp()
    try:
        os.write(fd, encoded)
        os.lseek(fd, 0, os.SEEK_SET)
        original_stdin = os.dup(0)
        vm._original_stdin_fd = original_stdin
        os.dup2(fd, 0)
    finally:
        os.close(fd)
        try:
            os.unlink(path)
        except PermissionError:
            # Windows: file still referenced by fd 0; cleanup happens on process exit
            pass


_loader._inject_message_to_fd0 = _patched_inject


@pytest.fixture
def deployed_will(direct_vm, direct_deploy, direct_owner):
    """Deploy a fresh SmartWill instance owned by direct_owner."""
    direct_vm.sender = direct_owner
    direct_vm.warp("2026-01-01T00:00:00Z")
    contract = direct_deploy(
        "contracts/smart_will.py",
        "Hassan Berrada (DOB 1980-05-12, last residence Casablanca MA)",
        30,  # 30-day proof-of-life cadence
    )
    return contract


@pytest.fixture
def funded_will(direct_vm, deployed_will, direct_owner):
    """Will deployed + funded with 100 GEN, balance set on contract address."""
    direct_vm.sender = direct_owner
    direct_vm.value = 100 * 10**18
    deployed_will.deposit_funds()
    direct_vm.value = 0
    # Mirror the deposit into the VM balance map so emit_transfer sees funds
    direct_vm.deal(direct_vm._contract_address, 100 * 10**18)
    return deployed_will
