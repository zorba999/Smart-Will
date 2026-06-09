<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <!-- Header -->
    <header class="bg-white border-b border-slate-200 shadow-sm">
      <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Smart Will</h1>
          <p class="text-xs text-slate-500 mt-1">
            <span v-if="contractAddress">
              Contract:
              <a :href="`https://explorer-bradbury.genlayer.com/address/${contractAddress}`" target="_blank" class="font-mono text-indigo-600 hover:underline">
                {{ shortAddr(contractAddress) }}
              </a>
              · Bradbury Testnet
            </span>
            <span v-else>Bradbury Testnet — no will loaded</span>
          </p>
        </div>
        <div class="flex items-center gap-3">
          <div v-if="userAddress" class="text-right text-sm flex items-center gap-3">
            <button @click="showCreate = true" class="text-xs bg-violet-600 hover:bg-violet-700 text-white font-medium px-3 py-1.5 rounded">+ New Will</button>
            <button @click="showLoadAddress = true" class="text-xs text-indigo-600 hover:text-indigo-800">Load by address</button>
            <div>
              <div class="text-slate-700">
                You: <span class="font-mono text-xs">{{ shortAddr(userAddress) }}</span>
                <span v-if="isTestator" class="ml-2 inline-block bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded">Testator</span>
                <span v-if="!chainOk" class="ml-2 inline-block bg-rose-100 text-rose-800 text-xs px-2 py-0.5 rounded">Wrong network</span>
              </div>
              <button @click="onDisconnect" class="text-xs text-slate-500 hover:text-rose-600 mt-1">Disconnect</button>
            </div>
          </div>
          <div v-else class="flex gap-2">
            <button
              v-if="walletAvailable"
              @click="onConnect"
              :disabled="connecting"
              class="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md"
            >
              {{ connecting ? "Connecting…" : "Connect Wallet" }}
            </button>
            <a
              v-else
              href="https://metamask.io/download/"
              target="_blank"
              class="bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-md"
            >
              Install MetaMask
            </a>
          </div>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <!-- Landing state — no will selected -->
      <section v-if="!contractAddress" class="bg-white rounded-xl border border-slate-200 shadow-sm p-10 text-center">
        <h2 class="text-3xl font-bold text-slate-900 mb-2">Create your will in one click.</h2>
        <p class="text-slate-600 max-w-2xl mx-auto mb-6">
          Connect your wallet, name your will, and you're the testator. Add conditions in plain language —
          AI validators verify real-world events. No notaries, no courts.
        </p>
        <div v-if="!userAddress" class="mb-4">
          <button
            v-if="walletAvailable"
            @click="onConnect"
            :disabled="connecting"
            class="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-lg"
          >
            {{ connecting ? "Connecting…" : "Connect Wallet to Begin" }}
          </button>
          <a v-else href="https://metamask.io/download/" target="_blank" class="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-6 py-3 rounded-lg inline-block">
            Install MetaMask
          </a>
        </div>
        <!-- One-click create — connected, no will yet -->
        <div v-else class="max-w-md mx-auto text-left">
          <label class="text-xs text-slate-700 font-medium">Your name <span class="text-slate-400">(optional — helps AI verify your identity later)</span></label>
          <input
            v-model="createForm.identityHint"
            placeholder="e.g. Karim Berrada, Casablanca"
            class="w-full px-3 py-2 border border-slate-300 rounded-md mb-3 text-sm"
            @keyup.enter="onCreateWill"
          />
          <button
            @click="onCreateWill"
            :disabled="busy"
            class="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-lg w-full"
          >
            {{ busy ? "Deploying your will… confirm in wallet" : "Create My Will" }}
          </button>

          <details class="mt-3">
            <summary class="text-xs text-slate-500 cursor-pointer hover:text-slate-700">Advanced settings</summary>
            <div class="mt-2">
              <label class="text-xs text-slate-700 font-medium">Proof-of-life cadence (days)</label>
              <input
                v-model.number="createForm.cadenceDays"
                type="number"
                min="1"
                max="365"
                class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
              <p class="text-xs text-slate-500 mt-1">
                Send a heartbeat every {{ createForm.cadenceDays }} days. After 2× without one, anyone can trigger AI death verification.
              </p>
            </div>
          </details>

          <div class="flex items-center justify-center gap-4 mt-5 text-xs">
            <button @click="showLoadAddress = true" class="text-indigo-600 hover:text-indigo-800">View someone else's will</button>
            <button v-if="EXAMPLE_WILL" @click="onLoadExample" class="text-slate-500 hover:text-slate-700">View example</button>
          </div>
          <p class="text-xs text-slate-400 text-center mt-4">
            Connected as <span class="font-mono">{{ shortAddr(userAddress) }}</span> — you'll be the testator.
          </p>
        </div>
      </section>

      <!-- Loading -->
      <div v-else-if="!status" class="text-center text-slate-500 py-20">Loading on-chain status…</div>

      <template v-else>
        <!-- Status Card -->
        <section class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div class="flex items-start justify-between mb-4">
            <div>
              <div class="text-xs uppercase tracking-wider text-slate-500 font-semibold">Testator</div>
              <div class="text-lg font-medium mt-1">{{ status.testator_identity_hint }}</div>
              <div class="text-xs text-slate-500 font-mono mt-1">{{ status.testator }}</div>
            </div>
            <div class="text-right">
              <span :class="statusBadgeClass(status.status)" class="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide">
                {{ status.status }}
              </span>
            </div>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <Stat label="Balance" :value="`${attoToGen(status.balance_atto)} GEN`" />
            <Stat label="Deposited" :value="`${attoToGen(status.total_deposited_atto)} GEN`" />
            <Stat label="Paid Out" :value="`${attoToGen(status.total_paid_out_atto)} GEN`" />
            <Stat label="Clauses" :value="String(status.clause_count)" />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 text-sm">
            <div>
              <div class="text-slate-500 text-xs uppercase tracking-wider">Last alive signal</div>
              <div class="mt-1 font-mono text-xs">{{ status.last_alive_signal }}</div>
            </div>
            <div>
              <div class="text-slate-500 text-xs uppercase tracking-wider">Proof-of-life cadence</div>
              <div class="mt-1">{{ formatDuration(status.proof_of_life_cadence_seconds) }}</div>
            </div>
            <div>
              <div class="text-slate-500 text-xs uppercase tracking-wider">Grace period</div>
              <div class="mt-1">{{ formatDuration(status.grace_period_seconds) }}</div>
            </div>
          </div>

          <div v-if="status.death_verified_at" class="mt-6 p-4 bg-rose-50 border border-rose-200 rounded-lg">
            <div class="text-sm font-semibold text-rose-900">Death verified</div>
            <div class="text-xs text-rose-700 mt-1">at {{ status.death_verified_at }}</div>
          </div>
        </section>

        <!-- Connected-as role card -->
        <section v-if="userAddress" class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div class="flex items-start gap-4">
            <div class="flex-1">
              <div class="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Your role</div>
              <div class="flex items-center gap-2 mb-2">
                <span :class="roleBadgeClass" class="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">{{ roleLabel }}</span>
                <span class="text-xs text-slate-500 font-mono">{{ userAddress }}</span>
              </div>
              <p class="text-sm text-slate-700">{{ roleDescription }}</p>
              <ul v-if="availableActions.length" class="mt-3 space-y-1">
                <li v-for="a in availableActions" :key="a" class="text-xs text-slate-600 flex items-start gap-2">
                  <span class="text-emerald-600">✓</span><span>{{ a }}</span>
                </li>
              </ul>
              <p v-if="!isTestator && status.status === 'active'" class="text-xs text-amber-700 mt-3 p-2 bg-amber-50 border border-amber-200 rounded">
                💡 <strong>Want to test as testator?</strong> Switch your wallet to <span class="font-mono">{{ shortAddr(status.testator) }}</span> in MetaMask (account dropdown → switch). That's the address that deployed this will.
              </p>
            </div>
          </div>
        </section>

        <!-- My pending clauses (when user is a beneficiary) -->
        <section v-if="myClauses.length" class="bg-emerald-50 rounded-xl border border-emerald-300 p-6">
          <h2 class="text-lg font-semibold text-emerald-900 mb-2">📬 You are a beneficiary in {{ myClauses.length }} clause(s)</h2>
          <ul class="text-sm text-emerald-800">
            <li v-for="c in myClauses" :key="c.id" class="mt-1">
              · Clause #{{ c.id }}: {{ attoToGen(c.asset_share_atto) }} GEN ({{ c.status }})
            </li>
          </ul>
          <p class="text-xs text-emerald-700 mt-2">
            <span v-if="status.status === 'executing'">You may claim your clauses below.</span>
            <span v-else>You'll be able to claim once the testator's death is verified.</span>
          </p>
        </section>

        <!-- Testator panel -->
        <section v-if="isTestator && status.status !== 'executed'" class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 class="text-lg font-semibold mb-4">Testator actions</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <button @click="onHeartbeat" :disabled="busy" class="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-3 rounded-md">
              ❤ Heartbeat (I'm alive)
            </button>
            <button @click="showDeposit = true" :disabled="busy" class="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-3 rounded-md">
              ＋ Deposit GEN
            </button>
            <button @click="showAddClause = true" :disabled="busy || status.status !== 'active'" class="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-3 rounded-md">
              📜 Add Clause
            </button>
          </div>
          <p v-if="status.status !== 'active'" class="text-xs text-amber-700">Will is no longer active — only heartbeat available.</p>
        </section>

        <!-- Public death trigger -->
        <section
          v-if="status.can_trigger_death_check && status.status !== 'executing' && status.status !== 'executed'"
          class="bg-amber-50 rounded-xl border border-amber-300 p-6"
        >
          <h2 class="text-lg font-semibold text-amber-900 mb-2">⚠ Grace period exceeded</h2>
          <p class="text-sm text-amber-800 mb-4">
            Last alive signal was {{ formatDuration(status.seconds_since_last_alive) }} ago.
            Anyone may submit at least 3 evidence URLs (obituaries, news, gov records) to trigger AI death verification.
          </p>
          <button @click="showDeathCheck = true" :disabled="busy" class="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md">
            Trigger Death Check
          </button>
        </section>

        <!-- Clauses -->
        <section class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold">Clauses ({{ clauses.length }})</h2>
            <button @click="refresh" :disabled="busy" class="text-sm text-indigo-600 hover:text-indigo-800">↻ Refresh</button>
          </div>
          <div v-if="!clauses.length" class="text-center text-slate-400 py-8">No clauses yet.</div>
          <div v-for="clause in clauses" :key="clause.id" :class="clause._pending ? 'border-violet-300 bg-violet-50/40' : 'border-slate-200'" class="border rounded-lg p-4 mb-3 last:mb-0">
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-xs text-slate-500">#{{ clause.id }}</span>
                  <span :class="clauseBadgeClass(clause.status)" class="text-xs px-2 py-0.5 rounded font-semibold uppercase">{{ clause.status }}</span>
                  <span class="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">{{ clause.condition_type }}</span>
                  <span v-if="clause._pending" class="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-violet-100 text-violet-700">
                    <span class="inline-block w-2.5 h-2.5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin"></span>
                    confirming
                  </span>
                </div>
                <div class="text-sm font-medium text-slate-900">"{{ clause.original_text }}"</div>
                <div class="text-xs text-slate-600 mt-2">
                  → <span class="font-mono">{{ shortAddr(clause.beneficiary) }}</span>
                  ({{ clause.beneficiary_hint }})
                </div>
                <div v-if="clause.condition_description" class="text-xs text-slate-600 mt-1">
                  <strong>Condition:</strong> {{ clause.condition_description }}
                </div>
                <div v-if="clause.deadline_iso" class="text-xs text-slate-600 mt-1">
                  <strong>Deadline:</strong> {{ clause.deadline_iso }}
                </div>
                <div v-if="clause.rejection_reason" class="text-xs text-rose-600 mt-1">
                  <strong>Rejected:</strong> {{ clause.rejection_reason }}
                </div>
              </div>
              <div class="text-right">
                <div class="text-lg font-semibold">{{ attoToGen(clause.asset_share_atto) }} GEN</div>
                <div class="mt-2 flex flex-col gap-1">
                  <button
                    v-if="canClaim(clause)"
                    @click="onClaimClick(clause)"
                    :disabled="busy"
                    class="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-medium px-3 py-1 rounded"
                  >
                    Claim
                  </button>
                  <button
                    v-if="isTestator && clause.status === 'pending' && status.status === 'active'"
                    @click="onRemove(clause.id)"
                    :disabled="busy"
                    class="text-xs text-rose-600 hover:text-rose-800"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Death evidence (if executing/executed) -->
        <section v-if="deathEvidence && deathEvidence.verdict" class="bg-rose-50 rounded-xl border border-rose-200 p-6">
          <h2 class="text-lg font-semibold text-rose-900 mb-3">Death verification evidence</h2>
          <div class="text-sm text-rose-800 mb-2"><strong>Verdict:</strong> {{ deathEvidence.verdict }}</div>
          <div class="text-sm text-rose-800 mb-3"><strong>Reasoning:</strong> {{ deathEvidence.reasoning }}</div>
          <div class="text-xs text-rose-700">Sources:</div>
          <ul class="text-xs text-rose-700 list-disc list-inside">
            <li v-for="(url, i) in deathEvidence.evidence_urls" :key="i">
              <a :href="url" target="_blank" class="underline">{{ url }}</a>
            </li>
          </ul>
        </section>
      </template>

      <!-- Tx feedback -->
      <div v-if="txStatus" class="fixed bottom-4 right-4 max-w-md bg-slate-900 text-white text-sm rounded-lg shadow-xl p-4">
        <div class="flex items-center gap-2 font-semibold">
          <span v-if="txStatus.pending" class="inline-block w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
          {{ txStatus.title }}
        </div>
        <div class="text-xs text-slate-300 mt-1">{{ txStatus.message }}</div>
        <a
          v-if="txStatus.txHash"
          :href="`https://explorer-bradbury.genlayer.com/tx/${txStatus.txHash}`"
          target="_blank"
          class="text-xs text-indigo-300 hover:text-indigo-200 underline mt-2 inline-block"
        >
          View on explorer ↗
        </a>
        <button @click="txStatus = null" class="text-xs text-slate-400 hover:text-white mt-2 block">dismiss</button>
      </div>
    </main>

    <!-- Modals -->
    <Modal v-if="showCreate" @close="showCreate = false" title="Create Your Smart Will">
      <p class="text-xs text-slate-600 mb-3">
        This deploys a fresh SmartWill contract on Bradbury. Your wallet signs the deploy tx — you become the testator.
      </p>
      <label class="text-xs text-slate-700 font-medium">Your name <span class="text-slate-400">(optional)</span></label>
      <input
        v-model="createForm.identityHint"
        placeholder="e.g. Karim Berrada, Casablanca"
        class="w-full px-3 py-2 border border-slate-300 rounded-md mb-3 text-sm"
      />
      <label class="text-xs text-slate-700 font-medium">Proof-of-life cadence (days)</label>
      <input
        v-model.number="createForm.cadenceDays"
        type="number"
        min="1"
        max="365"
        class="w-full px-3 py-2 border border-slate-300 rounded-md mb-2 text-sm"
      />
      <p class="text-xs text-slate-500 mb-4">
        You must send a heartbeat every {{ createForm.cadenceDays }} days. After 2× this without a heartbeat,
        anyone can trigger AI death verification.
      </p>
      <button @click="onCreateWill" :disabled="busy" class="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md w-full">
        {{ busy ? "Deploying…" : "Deploy My Will" }}
      </button>
    </Modal>

    <Modal v-if="showLoadAddress" @close="showLoadAddress = false" title="Load a Will by Address">
      <p class="text-xs text-slate-600 mb-3">
        Paste a SmartWill contract address (0x… 40 hex chars) to view it as observer / beneficiary.
      </p>
      <input
        v-model="loadAddressInput"
        placeholder="0x…"
        class="w-full px-3 py-2 border border-slate-300 rounded-md mb-3 text-sm font-mono"
      />
      <button @click="onLoadByAddress" class="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-md w-full">Load</button>
    </Modal>

    <Modal v-if="showDeposit" @close="showDeposit = false" title="Deposit GEN">
      <p class="text-xs text-slate-600 mb-2">Amount in GEN (will be converted to atto-GEN).</p>
      <input v-model="depositGen" type="number" step="0.01" placeholder="10" class="w-full px-3 py-2 border border-slate-300 rounded-md mb-3 text-sm" />
      <button @click="onDeposit" :disabled="busy" class="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md w-full">
        {{ busy ? "Sending…" : "Deposit" }}
      </button>
    </Modal>

    <Modal v-if="showAddClause" @close="showAddClause = false" title="Add Clause">
      <textarea v-model="clauseForm.originalText" placeholder='Original clause text, e.g. "Give 30 GEN to Sarah if she finishes med school before 2035"' class="w-full px-3 py-2 border border-slate-300 rounded-md mb-2 text-sm" rows="3"></textarea>
      <input v-model="clauseForm.beneficiary" placeholder="Beneficiary address 0x..." class="w-full px-3 py-2 border border-slate-300 rounded-md mb-2 text-sm font-mono" />
      <input v-model="clauseForm.beneficiaryHint" placeholder="Beneficiary identifier (name, DOB, etc.)" class="w-full px-3 py-2 border border-slate-300 rounded-md mb-2 text-sm" />
      <input v-model="clauseForm.assetShareGen" type="number" step="0.01" placeholder="Share in GEN (e.g. 30)" class="w-full px-3 py-2 border border-slate-300 rounded-md mb-2 text-sm" />
      <select v-model="clauseForm.conditionType" class="w-full px-3 py-2 border border-slate-300 rounded-md mb-2 text-sm">
        <option value="unconditional">Unconditional</option>
        <option value="date">Date</option>
        <option value="milestone">Milestone (LLM verified)</option>
        <option value="world_event">World event (LLM verified)</option>
      </select>
      <textarea v-model="clauseForm.conditionDescription" placeholder="Condition description (for AI validators)" class="w-full px-3 py-2 border border-slate-300 rounded-md mb-2 text-sm" rows="2"></textarea>
      <input v-model="clauseForm.dataSourcesHint" placeholder="Suggested data sources (e.g. university registry, news)" class="w-full px-3 py-2 border border-slate-300 rounded-md mb-2 text-sm" />
      <input v-model="clauseForm.deadlineIso" placeholder="Deadline ISO 8601 (optional, e.g. 2035-01-01T00:00:00Z)" class="w-full px-3 py-2 border border-slate-300 rounded-md mb-3 text-sm font-mono" />
      <button @click="onAddClause" :disabled="busy" class="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md w-full">
        {{ busy ? "Sending…" : "Add Clause" }}
      </button>
    </Modal>

    <Modal v-if="showDeathCheck" @close="showDeathCheck = false" title="Trigger Death Check">
      <p class="text-xs text-slate-600 mb-2">Submit at least 3 independent evidence URLs (obituaries, news, gov records).</p>
      <div v-for="(_, i) in deathUrls" :key="i" class="mb-2">
        <input v-model="deathUrls[i]" :placeholder="`Evidence URL #${i + 1}`" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm" />
      </div>
      <button @click="deathUrls.push('')" class="text-xs text-indigo-600 hover:text-indigo-800 mb-3">+ Add another URL</button>
      <button @click="onTriggerDeath" :disabled="busy || deathUrls.filter(u => u.trim()).length < 3" class="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md w-full">
        {{ busy ? "Verifying via AI consensus…" : "Trigger Verification" }}
      </button>
    </Modal>

    <Modal v-if="claimClause" @close="claimClause = null" title="Claim clause">
      <div class="text-sm mb-3">
        <div><strong>Clause #{{ claimClause.id }}</strong></div>
        <div class="text-xs text-slate-600 mt-1">"{{ claimClause.original_text }}"</div>
      </div>
      <div v-if="claimClause.condition_type === 'milestone' || claimClause.condition_type === 'world_event'" class="mb-3">
        <input v-model="claimEvidenceUrl" placeholder="Evidence URL proving condition met" class="w-full px-3 py-2 border border-slate-300 rounded-md text-sm" />
        <p class="text-xs text-slate-500 mt-1">AI validators will fetch this URL and verify against the condition.</p>
      </div>
      <button @click="onClaim" :disabled="busy" class="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md w-full">
        {{ busy ? "Claiming…" : "Claim" }}
      </button>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, reactive, watch } from "vue";
import SmartWill, { deployNewWill, attoToGen, genToAtto, formatDuration } from "../logic/SmartWill";
import {
  connectWallet,
  silentReconnect,
  hasInjectedWallet,
  onAccountsChanged,
  onChainChanged,
  isCorrectChain,
} from "../services/wallet";
import {
  saveWill,
  getWillsForWallet,
  getActiveWill,
  setActiveWill,
  removeWill,
  setViewingWill,
  getViewingWill,
} from "../services/willsRegistry";
import Modal from "./Modal.vue";
import Stat from "./Stat.vue";

const EXAMPLE_WILL = import.meta.env.VITE_CONTRACT_ADDRESS || null;

const walletAvailable = ref(hasInjectedWallet());
const userAddress = ref(null);
const chainOk = ref(true);
const connecting = ref(false);

// Currently active contract — can be null (landing), set by user, or fall back to example.
const contractAddress = ref(null);
const myWills = ref([]);

const will = ref(null);  // SmartWill instance bound to contractAddress

const status = ref(null);
const clauses = ref([]);
const deathEvidence = ref(null);
const busy = ref(false);
const txStatus = ref(null);

const showDeposit = ref(false);
const depositGen = ref("");
const showAddClause = ref(false);
const showDeathCheck = ref(false);
const deathUrls = ref(["", "", ""]);
const claimClause = ref(null);
const claimEvidenceUrl = ref("");

// Create-Will form
const showCreate = ref(false);
const createForm = reactive({
  identityHint: "",
  cadenceDays: 30,
});

// Load-by-address modal
const showLoadAddress = ref(false);
const loadAddressInput = ref("");

const clauseForm = reactive({
  originalText: "",
  beneficiary: "",
  beneficiaryHint: "",
  assetShareGen: "",
  conditionType: "unconditional",
  conditionDescription: "",
  dataSourcesHint: "",
  deadlineIso: "",
});

const isTestator = computed(() => {
  if (!userAddress.value || !status.value) return false;
  return userAddress.value.toLowerCase() === status.value.testator.toLowerCase();
});

const myClauses = computed(() => {
  if (!userAddress.value) return [];
  const me = userAddress.value.toLowerCase();
  return clauses.value.filter((c) => c.beneficiary?.toLowerCase() === me);
});

const roleLabel = computed(() => {
  if (isTestator.value) return "Testator";
  if (myClauses.value.length) return "Beneficiary";
  return "Observer";
});

const roleBadgeClass = computed(() => {
  return {
    Testator: "bg-amber-100 text-amber-800",
    Beneficiary: "bg-emerald-100 text-emerald-800",
    Observer: "bg-slate-200 text-slate-700",
  }[roleLabel.value];
});

const roleDescription = computed(() => {
  if (isTestator.value)
    return "You deployed this will. You can heartbeat, deposit funds, add and remove clauses while the will is active.";
  if (myClauses.value.length)
    return "Your address is listed as a beneficiary in one or more clauses. You can claim your share once the testator's death is verified by AI consensus.";
  return "You're viewing this will as a public observer. Anyone can read the on-chain state. If the testator misses their proof-of-life signal past the grace period, anyone (including you) may submit evidence to trigger AI-validated death verification.";
});

const availableActions = computed(() => {
  const s = status.value;
  if (!s) return [];
  const actions = [];
  if (isTestator.value && s.status === "active") {
    actions.push("Send heartbeat to renew your proof-of-life signal");
    actions.push("Deposit GEN into the will");
    actions.push("Add or remove clauses");
  } else if (isTestator.value && s.status === "pending_death") {
    actions.push("Send heartbeat to revert to active state (false-positive recovery)");
  }
  if (myClauses.value.some((c) => c.status === "pending") && s.status === "executing") {
    actions.push("Claim your beneficiary clauses (see below)");
  }
  if (s.can_trigger_death_check && s.status !== "executing" && s.status !== "executed") {
    actions.push("Submit ≥3 evidence URLs to trigger AI death verification");
  }
  if (!actions.length) {
    actions.push("Nothing actionable right now — the will is healthy and you're not the testator.");
  }
  return actions;
});

function shortAddr(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function statusBadgeClass(s) {
  return {
    active: "bg-emerald-100 text-emerald-800",
    pending_death: "bg-amber-100 text-amber-800",
    executing: "bg-rose-100 text-rose-800",
    executed: "bg-slate-200 text-slate-700",
  }[s] || "bg-slate-100 text-slate-700";
}

function clauseBadgeClass(s) {
  return {
    pending: "bg-blue-100 text-blue-800",
    claimed: "bg-emerald-100 text-emerald-800",
    rejected: "bg-rose-100 text-rose-800",
    expired: "bg-slate-200 text-slate-700",
  }[s] || "bg-slate-100 text-slate-700";
}

function canClaim(clause) {
  if (!userAddress.value || !status.value) return false;
  if (status.value.status !== "executing") return false;
  if (clause.status !== "pending") return false;
  return userAddress.value.toLowerCase() === clause.beneficiary.toLowerCase();
}

function rebuildWill() {
  if (!contractAddress.value) {
    will.value = null;
    status.value = null;
    clauses.value = [];
    deathEvidence.value = null;
    return;
  }
  will.value = new SmartWill(contractAddress.value, userAddress.value);
}

async function refresh() {
  if (!will.value) return;
  try {
    const s = await will.value.getStatus();
    status.value = s instanceof Map ? Object.fromEntries(s.entries()) : s;
    clauses.value = await will.value.getAllClauses();
    if (status.value.death_verified_at) {
      deathEvidence.value = await will.value.getDeathEvidence();
    } else {
      deathEvidence.value = null;
    }
  } catch (e) {
    console.error("refresh failed:", e);
    txStatus.value = { title: "Read failed", message: String(e.message || e) };
  }
}

function refreshMyWills() {
  myWills.value = userAddress.value ? getWillsForWallet(userAddress.value) : [];
}

async function selectWill(addr) {
  contractAddress.value = addr || null;
  rebuildWill();
  if (addr) {
    if (userAddress.value) {
      setActiveWill(userAddress.value, addr);
    } else {
      setViewingWill(addr);
    }
    await refresh();
  }
}

/**
 * Submit a write and track it without blocking the UI.
 *
 * @param label      Human label for toasts.
 * @param fn         () => Promise<txHash>  — submits the tx.
 * @param optimistic optional () => revertFn — applies a local UI change
 *                   immediately (so the app feels instant on slow Bradbury
 *                   consensus) and returns a function that undoes it if the
 *                   submission fails.
 */
async function run(label, fn, optimistic) {
  if (!will.value) {
    txStatus.value = { title: "No will loaded", message: "Create or load a will first." };
    return;
  }
  const willRef = will.value;

  // Apply optimistic change up-front — the UI reflects the action instantly.
  let revert = null;
  if (optimistic) {
    try {
      revert = optimistic();
    } catch (e) {
      console.error(`${label} optimistic apply`, e);
    }
  }

  busy.value = true;
  txStatus.value = { title: label, message: "Confirm in your wallet…" };

  let txHash;
  try {
    // fn() submits the tx and resolves with the tx hash once the wallet signs
    // and broadcasts — this is fast. Consensus is awaited separately below.
    txHash = await fn();
  } catch (e) {
    console.error(label, e);
    if (revert) revert(); // roll back the optimistic change — tx never went out
    txStatus.value = { title: label + " ✗", message: String(e.shortMessage || e.message || e) };
    busy.value = false;
    return;
  }

  // Tx is out — unblock the UI immediately so the user isn't stuck on a spinner
  // while Bradbury consensus runs (can take minutes).
  busy.value = false;
  txStatus.value = {
    title: `${label} — pending`,
    message: "Done locally — confirming on-chain in the background…",
    txHash,
    pending: true,
  };

  // Track confirmation in the background, then reconcile with real chain state.
  willRef
    .waitForReceipt(txHash)
    .then(async () => {
      txStatus.value = { title: `${label} ✓`, message: "Confirmed on-chain.", txHash };
      await refresh(); // replaces optimistic state with authoritative data
    })
    .catch((e) => {
      console.error(`${label} receipt`, e);
      txStatus.value = {
        title: `${label} — still confirming`,
        message: "Your change is shown locally and the tx is live. Final confirmation is taking longer than usual — check the explorer.",
        txHash,
      };
    });
}

async function onConnect() {
  connecting.value = true;
  try {
    const addr = await connectWallet();
    userAddress.value = addr;
    chainOk.value = true;
    refreshMyWills();
    // Auto-load this wallet's active will, else viewing, else nothing.
    const active = getActiveWill(addr) || getViewingWill();
    await selectWill(active);
  } catch (e) {
    console.error("connect failed:", e);
    txStatus.value = { title: "Connect failed", message: String(e.message || e) };
  } finally {
    connecting.value = false;
  }
}

function onDisconnect() {
  userAddress.value = null;
  myWills.value = [];
  selectWill(null);
}

async function onCreateWill() {
  if (!userAddress.value) {
    txStatus.value = { title: "Connect first", message: "Connect a wallet before creating a will." };
    return;
  }
  // Name is optional — default to a wallet-derived identity if left blank.
  const identity =
    createForm.identityHint.trim() || `Owner of wallet ${userAddress.value}`;
  busy.value = true;
  txStatus.value = { title: "Deploying your will…", message: "Confirm in your wallet, then wait for consensus." };
  try {
    const addr = await deployNewWill(
      userAddress.value,
      identity,
      createForm.cadenceDays,
    );
    saveWill(userAddress.value, addr);
    refreshMyWills();
    await selectWill(addr);
    showCreate.value = false;
    createForm.identityHint = "";
    createForm.cadenceDays = 30;
    txStatus.value = { title: "Will deployed ✓", message: `New will at ${addr.slice(0, 10)}…` };
  } catch (e) {
    console.error("deploy failed:", e);
    txStatus.value = { title: "Deploy failed ✗", message: String(e.shortMessage || e.message || e) };
  } finally {
    busy.value = false;
  }
}

async function onLoadByAddress() {
  const raw = loadAddressInput.value.trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(raw)) {
    txStatus.value = { title: "Invalid address", message: "Expected 0x + 40 hex chars." };
    return;
  }
  await selectWill(raw);
  // If the loaded will turns out to be ours (testator == connected wallet),
  // remember it under our wallet so it shows up in the switcher next time.
  if (
    userAddress.value &&
    status.value?.testator &&
    status.value.testator.toLowerCase() === userAddress.value.toLowerCase()
  ) {
    saveWill(userAddress.value, raw);
    refreshMyWills();
  }
  showLoadAddress.value = false;
  loadAddressInput.value = "";
}

async function onLoadExample() {
  if (EXAMPLE_WILL) await selectWill(EXAMPLE_WILL);
}

let unsubAccounts = () => {};
let unsubChain = () => {};

async function onHeartbeat() {
  await run(
    "Heartbeat",
    () => will.value.heartbeat(),
    () => {
      // Optimistically reset the alive timer.
      const prev = { ...status.value };
      status.value = {
        ...status.value,
        last_alive_signal: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
        seconds_since_last_alive: 0,
        can_trigger_death_check: false,
        status: status.value.status === "pending_death" ? "active" : status.value.status,
      };
      return () => { status.value = prev; };
    },
  );
}

async function onDeposit() {
  if (!depositGen.value) return;
  const atto = genToAtto(depositGen.value);
  await run(
    "Deposit",
    () => will.value.depositFunds(atto),
    () => {
      const prevBal = BigInt(status.value.balance_atto || 0);
      const prevDep = BigInt(status.value.total_deposited_atto || 0);
      status.value = {
        ...status.value,
        balance_atto: (prevBal + atto).toString(),
        total_deposited_atto: (prevDep + atto).toString(),
      };
      return () => {
        status.value = {
          ...status.value,
          balance_atto: prevBal.toString(),
          total_deposited_atto: prevDep.toString(),
        };
      };
    },
  );
  showDeposit.value = false;
  depositGen.value = "";
}

async function onAddClause() {
  if (!clauseForm.originalText || !clauseForm.beneficiary || !clauseForm.assetShareGen) {
    txStatus.value = { title: "Missing fields", message: "Fill text, beneficiary, share." };
    return;
  }
  const atto = genToAtto(clauseForm.assetShareGen);
  const snapshot = { ...clauseForm };
  await run(
    "Add clause",
    () =>
      will.value.addClause({
        originalText: snapshot.originalText,
        beneficiary: snapshot.beneficiary,
        beneficiaryHint: snapshot.beneficiaryHint,
        assetShareAtto: atto,
        conditionType: snapshot.conditionType,
        conditionDescription: snapshot.conditionDescription,
        dataSourcesHint: snapshot.dataSourcesHint,
        deadlineIso: snapshot.deadlineIso,
      }),
    () => {
      // Optimistically show the new clause with a "confirming" marker.
      const optimisticClause = {
        id: clauses.value.length,
        original_text: snapshot.originalText,
        beneficiary: snapshot.beneficiary,
        beneficiary_hint: snapshot.beneficiaryHint,
        asset_share_atto: atto.toString(),
        condition_type: snapshot.conditionType,
        condition_description: snapshot.conditionDescription,
        data_sources_hint: snapshot.dataSourcesHint,
        deadline_iso: snapshot.deadlineIso,
        status: "pending",
        claimed_at_iso: "",
        rejection_reason: "",
        _pending: true,
      };
      clauses.value = [...clauses.value, optimisticClause];
      return () => {
        clauses.value = clauses.value.filter((c) => c !== optimisticClause);
      };
    },
  );
  showAddClause.value = false;
  Object.assign(clauseForm, {
    originalText: "",
    beneficiary: "",
    beneficiaryHint: "",
    assetShareGen: "",
    conditionType: "unconditional",
    conditionDescription: "",
    dataSourcesHint: "",
    deadlineIso: "",
  });
}

async function onRemove(clauseId) {
  if (!confirm(`Remove clause #${clauseId}?`)) return;
  await run(
    "Remove clause",
    () => will.value.removeClause(clauseId),
    () => {
      const prev = clauses.value;
      clauses.value = clauses.value.filter((c) => c.id !== clauseId);
      return () => { clauses.value = prev; };
    },
  );
}

async function onTriggerDeath() {
  const urls = deathUrls.value.map((u) => u.trim()).filter((u) => u);
  if (urls.length < 3) return;
  await run("Death check (AI consensus)", () => will.value.triggerDeathCheck(urls));
  showDeathCheck.value = false;
  deathUrls.value = ["", "", ""];
}

function onClaimClick(clause) {
  claimClause.value = clause;
  claimEvidenceUrl.value = "";
}

async function onClaim() {
  const clause = claimClause.value;
  if (!clause) return;
  await run("Claim clause", () => will.value.claimClause(clause.id, claimEvidenceUrl.value));
  claimClause.value = null;
  claimEvidenceUrl.value = "";
}

onMounted(async () => {
  // Auto-reconnect if the wallet was already authorized for this site.
  const addr = await silentReconnect();
  if (addr) {
    userAddress.value = addr;
    refreshMyWills();
    const active = getActiveWill(addr) || getViewingWill();
    if (active) await selectWill(active);
  } else {
    // No wallet yet — try to load whatever was being viewed previously.
    const viewing = getViewingWill();
    if (viewing) await selectWill(viewing);
  }
  unsubAccounts = onAccountsChanged(async (newAddr) => {
    userAddress.value = newAddr;
    refreshMyWills();
    if (newAddr) {
      const a = getActiveWill(newAddr) || getViewingWill();
      await selectWill(a);
    } else {
      await selectWill(null);
    }
  });
  unsubChain = onChainChanged((chainIdHex) => {
    chainOk.value = isCorrectChain(chainIdHex);
  });
});

// Whenever the active will or wallet changes, rebuild the client wrapper
// so writes are signed by the current wallet.
watch([contractAddress, userAddress], () => {
  if (contractAddress.value) rebuildWill();
});

onUnmounted(() => {
  unsubAccounts();
  unsubChain();
});
</script>
