<div align="center">

# Smart Will

### Legacy, written in code.

An AI-validated digital inheritance protocol on **GenLayer**. Write your will in
plain language — AI validators verify real-world events through blockchain
consensus and release funds automatically. No notaries, no courts, no disputes.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/license/mit/)
[![Network](https://img.shields.io/badge/network-Bradbury%20Testnet-7C5CFF.svg)](https://explorer-bradbury.genlayer.com/)
[![Contract](https://img.shields.io/badge/contract-0xd4388…A4d8-E8C77E.svg)](https://explorer-bradbury.genlayer.com/address/0xd4388aC3A5BBdE1c55125109bD521706eA1dA4d8)

</div>

---

## Why GenLayer

A regular smart contract is blind to the real world. Smart Will needs to answer
questions deterministic code cannot:

- *"Has the testator actually passed away?"* — cross-referenced across obituaries, news, and registries.
- *"Did Sarah graduate from medical school before 2035?"*
- *"Does the recipient institution still exist and accept the gift?"*

[GenLayer](https://genlayer.com)'s **Intelligent Contracts** are Python contracts
that run **LLM inference and live web access inside blockchain consensus**. Each
validator independently fetches evidence, reasons over it, and votes.
Disagreement triggers appeals and slashing — so no single party decides a
subjective outcome.

## How it works

| Phase | What happens |
|-------|--------------|
| **Create** | Anyone connects a wallet and deploys their own will in one click. They become the *testator*. |
| **Fund & write** | Deposit GEN; add clauses in natural language (beneficiary, share, condition). |
| **Proof of life** | The testator sends a periodic `heartbeat`. Missing it past the grace period opens death verification. |
| **Death verification** | Anyone submits ≥3 evidence URLs. Validators cross-reference them with an LLM and reach consensus (`DECEASED` / `ALIVE` / `UNCERTAIN`). |
| **Execution** | Once verified deceased, beneficiaries claim. Unconditional/date clauses pay out directly; milestone / world-event clauses are AI-verified against submitted evidence. |

### Consensus boundary

- **Deterministic writes** (`heartbeat`, `deposit_funds`, `add_clause`, `remove_clause`) run `leaderOnly` for fast confirmation.
- **Non-deterministic writes** (`trigger_death_check`, `claim_clause`) keep full validator consensus — independent LLM + web verification is the whole point.

## The app

A cinematic, motion-driven dApp built with **React 19 + TanStack Start + GSAP**:

- One-click will creation, signed by your own EVM wallet (no private keys held by the dApp).
- A living **proof-of-life** ring and EKG heartbeat line — the core metaphor, animated.
- Natural-language clause cards, role-aware panels (testator / beneficiary / observer), and a dramatic death-verification flow.
- Non-blocking transactions: changes show instantly, on-chain consensus reconciles in the background.

## Project layout

```
contracts/smart_will.py      # The intelligent contract (Python / GenVM)
test/direct/                 # Fast in-memory tests (25 passing)
deploy/deployScript.ts       # Deploy helper
deployments.json             # Deployed address on Bradbury
abi.json                     # Extracted contract ABI
app/                         # React 19 + TanStack Start frontend
  src/routes/                #   index.tsx (landing) · app.tsx (dApp)
  src/lib/smart-will/        #   genlayer-js integration layer
    client.ts                #     contract reads/writes + deployWill()
    wallet.ts                #     EVM wallet adapter (window.ethereum)
    hooks.ts · types.ts      #     TanStack Query hooks · typed surface
  src/components/            #   ekg-line, particle-field, magnetic-button, …
```

## Quick start

### Contract — lint & test

```bash
pip install -r requirements.txt
genvm-lint check contracts/smart_will.py
pytest test/direct/ -v
```

### Deploy to Bradbury

```bash
npm install -g genlayer
genlayer network set testnet-bradbury
genlayer deploy --contract contracts/smart_will.py \
  --args "Your name (DOB, residence)" 30
```

Fund your account first via the [faucet](https://testnet-faucet.genlayer.foundation/).
(You can also deploy straight from the app — your wallet signs the deploy.)

### Frontend

> **Requires Node ≥ 22.12** (TanStack Start + Vite 7).

```bash
cd app
npm install
npm run dev        # → http://localhost:8080
```

Connect an injected EVM wallet (MetaMask / Rabby). The app adds the GenLayer
Bradbury network automatically. Load the example contract, or create your own.

## Live deployment

- **Network:** GenLayer Bradbury Testnet · chain `4221` · RPC `https://rpc-bradbury.genlayer.com`
- **Example contract:** [`0xd4388aC3A5BBdE1c55125109bD521706eA1dA4d8`](https://explorer-bradbury.genlayer.com/address/0xd4388aC3A5BBdE1c55125109bD521706eA1dA4d8)

## Contract surface

| Method | Type | Notes |
|--------|------|-------|
| `add_clause` | write | Natural-language clause + condition |
| `remove_clause` | write | Testator only, while active |
| `heartbeat` | write | Renew proof-of-life |
| `deposit_funds` | write (payable) | Fund the will |
| `trigger_death_check` | write | AI death verification (≥3 evidence URLs) |
| `claim_clause` | write | Beneficiary claims; AI-verified if conditional |
| `get_status` · `get_clause` · `get_all_clauses` · `get_death_evidence` | view | Read state |

## Tech

Python / GenVM · genlayer-js · React 19 · TanStack Start · Vite 7 · Tailwind 4 ·
shadcn/ui · GSAP · Lenis.

## License

MIT — see [LICENSE](LICENSE).
