# Smart Will — AI-validated inheritance on GenLayer

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/license/mit/)
[![Network](https://img.shields.io/badge/network-Bradbury%20Testnet-6366f1.svg)](https://explorer-bradbury.genlayer.com/)

A decentralized, AI-validated will. Write inheritance conditions in plain
language; **AI validators verify real-world events through GenLayer's optimistic
democracy consensus** and release funds automatically. No notaries, no courts,
no family disputes.

> Built on [GenLayer](https://genlayer.com) Intelligent Contracts — Python
> contracts that run LLM inference and live web access **inside** blockchain
> consensus.

## ✨ Why GenLayer

A regular smart contract is blind to the real world. Smart Will needs to answer
questions a deterministic contract can't:

- *"Did Sarah graduate from medical school before 2035?"*
- *"Has the testator actually passed away?"* (cross-referenced across obituaries, news, registries)
- *"Has a real-world condition been met?"*

GenLayer validators each run an LLM + fetch live web data, then reach consensus
on the answer. Disagreement triggers appeals and slashing — so no single party
decides a subjective outcome.

## 🧠 How it works

| Phase | What happens |
|-------|--------------|
| **Create** | Anyone connects a wallet and deploys their own will. They become the *testator*. |
| **Fund & write** | Deposit GEN, add clauses in natural language (beneficiary, share, condition). |
| **Proof of life** | Testator sends a periodic `heartbeat`. Missing it past the grace period opens death verification. |
| **Death verification** | Anyone submits ≥3 evidence URLs. Validators cross-reference them with an LLM and reach consensus (`DECEASED` / `ALIVE` / `UNCERTAIN`). |
| **Execution** | Once verified deceased, beneficiaries claim. Unconditional/date clauses pay out directly; milestone/world-event clauses are AI-verified against submitted evidence. |

### Consensus boundary

- **Deterministic writes** (`heartbeat`, `deposit_funds`, `add_clause`, `remove_clause`) run `leaderOnly` for fast confirmation.
- **Non-deterministic writes** (`trigger_death_check`, `claim_clause`) keep full validator consensus — independent LLM + web verification is the whole point.

## 📦 Project layout

```
contracts/smart_will.py     # The intelligent contract (Python / GenVM)
test/direct/                # Fast in-memory tests (25 passing)
deploy/deployScript.ts      # Deploy helper
app/                        # Vue 3 + Vite frontend (EVM wallet adapter)
deployments.json            # Deployed address on Bradbury
abi.json                    # Extracted contract ABI
```

## 🚀 Quick start

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

### Frontend

```bash
cd app
npm install
cp .env.example .env   # set VITE_CONTRACT_ADDRESS (or create wills in-app)
npm run dev            # http://localhost:5173
```

The frontend uses an **EVM wallet adapter** (MetaMask / Rabby) — no private keys
are ever held by the dApp. Connect your wallet, create your will in one click,
and you're the testator. Transactions use **optimistic UI** so the app feels
instant while Bradbury consensus confirms in the background.

## 🌐 Live deployment

- **Contract:** [`0xd4388aC3A5BBdE1c55125109bD521706eA1dA4d8`](https://explorer-bradbury.genlayer.com/address/0xd4388aC3A5BBdE1c55125109bD521706eA1dA4d8) (example will on Bradbury Testnet, chain 4221)

## 🛠️ Contract surface

| Method | Type | Notes |
|--------|------|-------|
| `add_clause` | write | Natural-language clause + condition |
| `remove_clause` | write | Testator only, while active |
| `heartbeat` | write | Renew proof-of-life |
| `deposit_funds` | write (payable) | Fund the will |
| `trigger_death_check` | write | AI death verification (≥3 evidence URLs) |
| `claim_clause` | write | Beneficiary claims; AI-verified if conditional |
| `get_status` / `get_clause` / `get_all_clauses` / `get_death_evidence` | view | Read state |

## 📜 License

MIT — see [LICENSE](LICENSE).
