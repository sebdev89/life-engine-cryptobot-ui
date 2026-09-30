/**
 * Demo Mode: the orchestration `scripts/demo/e2e-devnet.sh` does with curl, done by the
 * UI with the routes it already consumes. Nothing here is computed for show: every value on
 * screen is a field of an API answer, and every wait is one the service imposes (cooldown,
 * timelock, confirmation, anchor finality).
 *
 * Scenario A · RUN TRUSTED EXECUTION: wallet → intent (plan + simulation + 13 rules) → approve →
 * timelock → execute with an `operationId` → poll to EXECUTED → EXECUTION receipt + verify →
 * `POST /anchors?wait=true` → inclusion proof → `POST /anchors/{root}/verify` → VERIFIED.
 *
 * The runner is a plain class with its I/O injected (`DemoApi`, `DemoClock`) so the state machine is
 * tested without HTTP or real time; the component owns one instance.
 */
import { signal } from '@angular/core';
import {
  ActionProposal,
  AuditEvent,
  DeadLetter,
  PolicyDecision,
  PortfolioResponse,
  PortfolioSnapshot,
  WalletView,
  createRebalance,
  decideProposal,
  executeProposal,
  getProposal,
  listWallets,
  refreshPortfolio,
  registerWallet,
} from '../control-plane-api';
import { uiConfig } from '../config';
import {
  AnchorSweep,
  AnchorVerification,
  IntelligenceReceipt,
  ReceiptVerification,
  listProposalReceipts,
  sweepAnchors,
  verifyAnchor,
  verifyReceipt,
} from '../receipts-api';
import { ApiFailure, NO_PROOF, ProofInput, StepState, describeFailure, explorerTxUrlFor, newOperationId, parseInstant } from '../live/live-model';
import { loadProof } from '../live/proof-loader';
import {
  ChaosMode,
  ChaosView,
  DeadLetterPage,
  DeadLetterResolution,
  armChaos,
  disarmChaos,
  getChaos,
  listProposalDeadLetters,
  requeueDeadLetter,
} from '../reliability-api';

export type Scenario = 'success' | 'failure';
export type RunPhase = 'idle' | 'running' | 'verified' | 'failed' | 'cancelled';

export interface RunStep {
  id: string;
  label: string;
  state: StepState;
  /** One line from the API answer that closed (or broke) the step. */
  detail: string | null;
  startedAt: number | null;
  endedAt: number | null;
}

/** What the run is waiting on right now, and until when if the service told us (countdown). */
export interface Waiting {
  what: string;
  until: number | null;
}

export interface RunState {
  scenario: Scenario | null;
  phase: RunPhase;
  steps: RunStep[];
  waiting: Waiting | null;
  startedAt: number | null;
  finishedAt: number | null;
  wallet: WalletView | null;
  proposal: ActionProposal | null;
  audit: AuditEvent[];
  operationId: string | null;
  /** Scenario B: the signature of the first attempt (signed, lost to the fault) and what recovered it. */
  firstSignature: string | null;
  chaos: ChaosView | null;
  deadLetter: DeadLetter | null;
  requeue: DeadLetterResolution | null;
  /** The answer to the second requeue: the 409 that proves the retry cannot happen twice. */
  duplicate: ApiFailure | null;
  receiptKinds: string[];
  receipt: IntelligenceReceipt | null;
  receiptVerification: ReceiptVerification | null;
  sweep: AnchorSweep | null;
  anchorVerification: AnchorVerification | null;
  proof: ProofInput;
  error: ApiFailure | null;
  /** Every call the run made, in order: `POST /proposals/…/execute → 200 EXECUTING`. */
  trace: string[];
}

export interface DemoApi extends ChaosApi {
  listWallets(): Promise<WalletView[]>;
  registerWallet(address: string, cluster: string, label?: string): Promise<PortfolioResponse>;
  refreshPortfolio(walletId: string): Promise<PortfolioResponse>;
  createRebalance(
    walletId: string,
    targetWeights: Record<string, number>,
    reasoningSummary?: string,
  ): Promise<{ proposal: ActionProposal; audit: AuditEvent[] }>;
  getProposal(id: string): Promise<{ proposal: ActionProposal; audit: AuditEvent[] }>;
  decideProposal(id: string, decision: 'approve' | 'reject', note?: string): Promise<ActionProposal>;
  executeProposal(id: string, operationId?: string | null): Promise<ActionProposal>;
  listProposalReceipts(id: string): Promise<IntelligenceReceipt[]>;
  verifyReceipt(hash: string): Promise<ReceiptVerification>;
  sweepAnchors(wait?: boolean): Promise<AnchorSweep>;
  verifyAnchor(root: string): Promise<AnchorVerification>;
  loadProof(receipts: readonly IntelligenceReceipt[]): Promise<ProofInput>;
}

export interface ChaosApi {
  getChaos(): Promise<ChaosView | null>;
  armChaos(mode: ChaosMode, shots?: number): Promise<ChaosView>;
  disarmChaos(): Promise<ChaosView>;
  listProposalDeadLetters(proposalId: string): Promise<DeadLetterPage>;
  requeueDeadLetter(id: string, note?: string | null): Promise<DeadLetterResolution>;
}

export interface DemoClock {
  now(): number;
  sleep(ms: number): Promise<void>;
}

export interface DemoOptions {
  /** SOL the SELL leg aims at; clamped to 21–40 % of the position like the script (rules: ≤ 2 SOL, ≤ 50 %, SOL ≤ 80 % after). */
  sellSol: number;
  demoWallet: string | null;
  pollMs: number;
  /** Execute → EXECUTED (confirmation + a possible reconciliation pass). */
  finalizeTimeoutMs: number;
  receiptTries: number;
  anchorTries: number;
  anchorRetryMs: number;
  /** Cooldown waits accepted before giving up on creating the intent. */
  cooldownRetries: number;
  /** Uncertain → dead letter: max attempts × (interval + grace) of the reconciler; 270 s like the script. */
  deadLetterTimeoutMs: number;
}

export const DEFAULT_OPTIONS: DemoOptions = {
  sellSol: 0.5,
  demoWallet: null,
  pollMs: 2000,
  finalizeTimeoutMs: 180_000,
  receiptTries: 10,
  anchorTries: 15,
  anchorRetryMs: 6000,
  cooldownRetries: 2,
  deadLetterTimeoutMs: 270_000,
};

export const LIVE_API: DemoApi = {
  listWallets,
  registerWallet,
  refreshPortfolio,
  createRebalance: (w, t, r) => createRebalance(w, t, r),
  getProposal,
  decideProposal,
  executeProposal,
  listProposalReceipts,
  verifyReceipt,
  sweepAnchors,
  verifyAnchor,
  loadProof,
  getChaos,
  armChaos,
  disarmChaos,
  listProposalDeadLetters,
  requeueDeadLetter,
};

export const REAL_CLOCK: DemoClock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
};

export const SCENARIO_A_STEPS: readonly { id: string; label: string }[] = [
  { id: 'wallet', label: 'Wallet · fresh portfolio snapshot' },
  {
    id: 'intent',
    label: 'Intent · plan, simulation on the exact bytes, 13 rules',
  },
  { id: 'approve', label: 'Human approval' },
  { id: 'timelock', label: 'Timelock' },
  {
    id: 'execute',
    label: 'Execute · operationId → validator → signer → Solana',
  },
  { id: 'finalize', label: 'Finalized on chain · EXECUTED' },
  { id: 'receipt', label: 'Signed EXECUTION receipt · verify' },
  { id: 'anchor', label: 'Merkle anchor on Solana · inclusion proof' },
  { id: 'verified', label: 'Anchor verified · VERIFIED' },
];

/**
 * Scenario B, the order of `e2e-devnet.sh --chaos rpc-down`: the fault is armed right
 * before the execute (the simulation and the policy run against a healthy RPC), then the recovery
 * is watched, not scripted: the reconciler dead-letters, a human requeues, the retry lands.
 */
export const SCENARIO_B_STEPS: readonly { id: string; label: string }[] = [
  { id: 'wallet', label: 'Wallet · fresh portfolio snapshot' },
  { id: 'intent', label: 'Intent · plan, simulation, 13 rules' },
  { id: 'approve', label: 'Human approval' },
  { id: 'timelock', label: 'Timelock' },
  { id: 'chaos', label: 'Fault injected · Solana RPC down' },
  { id: 'execute', label: 'Execute · operationId, signed, broadcast lost' },
  { id: 'failed', label: 'FAILED · broadcast uncertain' },
  { id: 'deadletter', label: 'DEAD LETTER · the reconciler refuses to guess' },
  { id: 'restore', label: 'RPC restored (fault disarmed)' },
  { id: 'retry', label: 'RETRY · human requeues the dead letter' },
  { id: 'idempotency', label: 'IDEMPOTENCY CHECK · second requeue' },
  { id: 'recovered', label: 'RECOVERED · retry under the same operationId' },
  { id: 'finalize', label: 'FINALIZED · EXECUTED on chain' },
  { id: 'receipt', label: 'Signed EXECUTION receipt · verify' },
  { id: 'anchor', label: 'Merkle anchor on Solana · inclusion proof' },
  { id: 'verified', label: 'PROOF · anchor verified' },
];

/** A failure the runner detected itself (not an HTTP error): shown as-is. */
export class DemoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DemoError';
  }
}

class Cancelled extends Error {
  constructor() {
    super('cancelled');
    this.name = 'Cancelled';
  }
}

export function initialState(): RunState {
  return {
    scenario: null,
    phase: 'idle',
    steps: [],
    waiting: null,
    startedAt: null,
    finishedAt: null,
    wallet: null,
    proposal: null,
    audit: [],
    operationId: null,
    receiptKinds: [],
    receipt: null,
    receiptVerification: null,
    sweep: null,
    anchorVerification: null,
    proof: NO_PROOF,
    error: null,
    trace: [],
    firstSignature: null,
    chaos: null,
    deadLetter: null,
    requeue: null,
    duplicate: null,
  };
}

// ---- pure helpers (tested) -------------------------------------------------------------------

/**
 * The SOL target weight of the intent, exactly as `e2e-devnet.sh` computes it: sell `sellSol`,
 * clamped to [21 %, 40 %] of the SOL held, so every rule holds whatever the balance.
 */
export function targetSolWeight(snapshot: Pick<PortfolioSnapshot, 'positions'>, sellSol: number): { target: number; sell: number; amount: number } {
  const sol = snapshot.positions.find((p) => p.symbol === 'SOL' && p.priceUsd !== null);
  if (!sol || !sol.amount || sol.weightPct === null) {
    throw new DemoError('the demo wallet holds no priced SOL: fund it (local validator airdrop or wallet-devnet.sh)');
  }
  const sell = Math.max(0.21 * sol.amount, Math.min(sellSol, 0.4 * sol.amount));
  if (sell > 2) {
    throw new DemoError(`wallet holds ${sol.amount.toFixed(2)} SOL: 21 % of it is over the 2 SOL per-tx cap; keep the demo wallet between 0.5 and 9 SOL`);
  }
  return {
    target: Math.floor(sol.weightPct * (1 - sell / sol.amount)),
    sell,
    amount: sol.amount,
  };
}

/**
 * Seconds left of the policy's COOLDOWN, read from the violation the service wrote
 * ("This wallet executed a trade 12s ago; cooldown is 60s"); null when the rule did not block.
 */
export function cooldownRemaining(policy: Pick<PolicyDecision, 'violations'> | null | undefined): number | null {
  const v = policy?.violations?.find((x) => x.rule === 'COOLDOWN');
  if (!v) return null;
  const m = /(\d+)s ago; cooldown is (\d+)s/.exec(v.message);
  if (!m) return null;
  return Math.max(0, Number(m[2]) - Number(m[1]));
}

export function isTimelockConflict(f: ApiFailure): boolean {
  return f.status === 409 && /timelock/i.test(f.message);
}

// ---- the runner --------------------------------------------------------------------------------

export class DemoRunner {
  readonly state = signal<RunState>(initialState());
  private cancelled = false;
  private readonly opts: DemoOptions;

  constructor(
    private readonly api: DemoApi = LIVE_API,
    private readonly clock: DemoClock = REAL_CLOCK,
    opts: Partial<DemoOptions> = {},
  ) {
    this.opts = {
      ...DEFAULT_OPTIONS,
      demoWallet: uiConfig().demoWallet ?? null,
      ...opts,
    };
  }

  running(): boolean {
    return this.state().phase === 'running';
  }

  cancel(): void {
    if (this.running()) this.cancelled = true;
  }

  /** Where Demo Mode will run: the operator's registered devnet wallet (config's demoWallet first), or null. */
  async findWallet(): Promise<WalletView | null> {
    const wallets = await this.api.listWallets();
    const want = this.opts.demoWallet;
    return (want ? wallets.find((w) => w.address === want) : null) ?? wallets.find((w) => w.cluster === 'devnet') ?? null;
  }

  /** The address to register when the operator has no wallet yet (typed on the page, or config.js). */
  setDemoWallet(address: string | null): void {
    this.opts.demoWallet = address?.trim() || null;
  }

  /** Scenario A. Resolves when the run ends (verified, failed or cancelled); never throws. */
  async runTrustedExecution(): Promise<RunState> {
    if (this.running()) return this.state();
    this.begin('success', SCENARIO_A_STEPS);
    try {
      const walletId = await this.step('wallet', () => this.pickWallet());
      const id = await this.step('intent', () => this.createIntent(walletId));
      await this.step('approve', () => this.approve(id));
      await this.step('timelock', () => this.waitTimelock());
      await this.step('execute', () => this.execute(id));
      await this.step('finalize', () => this.waitExecuted(id));
      await this.step('receipt', () => this.receiptAndVerify(id));
      await this.step('anchor', () => this.anchor());
      await this.step('verified', () => this.verifyBatch(id));
      this.patch({
        phase: 'verified',
        finishedAt: this.clock.now(),
        waiting: null,
      });
    } catch (e) {
      this.fail(e);
    }
    return this.state();
  }

  /** Scenario B. Always disarms the fault it armed, whatever happens. Never throws. */
  async runSimulateFailure(): Promise<RunState> {
    if (this.running()) return this.state();
    this.begin('failure', SCENARIO_B_STEPS);
    let armed = false;
    try {
      const chaos = await this.call(
        'GET /demo/chaos',
        () => this.api.getChaos(),
        (c) => (c ? `exposed · armed=${c.armed}` : 'not exposed'),
      );
      if (!chaos) {
        throw new DemoError('fault injection is not exposed here: it needs cryptobot.chaos.enabled=true (demo stack) and a RUNTIME_ADMIN token');
      }
      const walletId = await this.step('wallet', () => this.pickWallet());
      const id = await this.step('intent', () => this.createIntent(walletId));
      await this.step('approve', () => this.approve(id));
      await this.step('timelock', () => this.waitTimelock());
      await this.step('chaos', async () => {
        armed = true;
        const c = await this.call(
          'PUT /demo/chaos {"broadcast":"rpc-down","shots":-1}',
          () => this.api.armChaos('rpc-down', -1),
          (x) => `armed=${x.armed} ${x.broadcast}`,
        );
        this.patch({ chaos: c });
        return [undefined, `mode ${c.broadcast} · until disarmed · nothing reaches the chain`];
      });
      await this.step('execute', () => this.execute(id));
      await this.step('failed', () => this.waitUncertain(id));
      const dl = await this.step('deadletter', () => this.waitDeadLetter(id));
      await this.step('restore', async () => {
        const c = await this.call(
          'DELETE /demo/chaos',
          () => this.api.disarmChaos(),
          (x) => `armed=${x.armed}`,
        );
        armed = false;
        this.patch({ chaos: c });
        return [undefined, `fault disarmed · ${c.faults.length} faulted RPC call(s) recorded`];
      });
      await this.step('retry', () => this.requeue(dl));
      await this.step('idempotency', () => this.requeueAgain(dl));
      await this.step('recovered', () => this.waitRetried(id));
      await this.step('finalize', () => this.waitExecuted(id));
      await this.step('receipt', () => this.receiptAndVerify(id));
      await this.step('anchor', () => this.anchor());
      await this.step('verified', () => this.verifyBatch(id));
      this.patch({
        phase: 'verified',
        finishedAt: this.clock.now(),
        waiting: null,
      });
    } catch (e) {
      this.fail(e);
    } finally {
      if (armed) {
        // Never leave the demo stack with its RPC "down": best effort, traced.
        await this.api
          .disarmChaos()
          .then((c) => this.addTrace(`DELETE /demo/chaos (cleanup) → armed=${c.armed}`, false))
          .catch((e) => this.addTrace(`DELETE /demo/chaos (cleanup) → ${describeFailure(e).message}`, false));
      }
    }
    return this.state();
  }

  // ---- scenario B steps -------------------------------------------------------------------------

  private async waitUncertain(id: string): Promise<[void, string]> {
    const first = this.state().proposal?.execution?.signature ?? null;
    this.patch({ firstSignature: first });
    const deadline = this.clock.now() + 60_000;
    for (;;) {
      const p = await this.refresh(id);
      const unc = [...this.state().audit].reverse().find((e) => e.eventType === 'EXECUTION_BROADCAST_UNCERTAIN');
      if (unc) {
        const err = typeof unc.payload?.['error'] === 'string' ? (unc.payload['error'] as string) : 'no answer from the RPC';
        return [undefined, `${p.status} + ${p.execution?.status ?? '—'} · signature ${shortSig(first)} persisted before the broadcast · ${err}`];
      }
      if (p.status === 'EXECUTED') throw new DemoError('the execution landed despite the fault: chaos was not applied (is it armed on this instance?)');
      if (p.status === 'FAILED') throw new DemoError(`execution FAILED instead of uncertain: ${p.execution?.error ?? '—'}`);
      if (this.clock.now() >= deadline) throw new DemoError(`no EXECUTION_BROADCAST_UNCERTAIN after 60 s (status ${p.status})`);
      await this.sleep(this.opts.pollMs);
    }
  }

  private async waitDeadLetter(id: string): Promise<[DeadLetter, string]> {
    const deadline = this.clock.now() + this.opts.deadLetterTimeoutMs;
    for (;;) {
      const page = await this.call(
        `GET /dead-letters?proposalId=${short(id)}`,
        () => this.api.listProposalDeadLetters(id),
        (x) => `${x.deadLetters.length} open`,
        true,
      );
      const dl = page.deadLetters.find((d) => d.proposalId === id && !d.resolvedAt) ?? null;
      if (dl) {
        this.patch({ deadLetter: dl, waiting: null });
        await this.refresh(id);
        const kind = typeof dl.payload?.['kind'] === 'string' ? dl.payload['kind'] : dl.source.toLowerCase();
        return [dl, `${short(dl.id)} · ${kind} · ${dl.reason}`];
      }
      const p = await this.refresh(id);
      const attempts = p.execution?.reconciliationAttempts ?? 0;
      this.patch({
        waiting: {
          what: `reconciler · asks the chain, gets no verdict (attempt ${attempts}) → dead letter`,
          until: null,
        },
      });
      if (this.clock.now() >= deadline) {
        throw new DemoError(
          `no dead letter after ${Math.round(this.opts.deadLetterTimeoutMs / 1000)} s (status ${p.status}, ${attempts} reconciliation attempts)`,
        );
      }
      await this.sleep(3000);
    }
  }

  private async requeue(dl: DeadLetter): Promise<[void, string]> {
    const r = await this.call(
      `POST /dead-letters/${short(dl.id)}/requeue`,
      () => this.api.requeueDeadLetter(dl.id, 'demo mode: RPC is back, let the reconciler try again'),
      (x) => `${x.deadLetter.outcome} · ${x.reconciliation ?? '—'}`,
    );
    this.patch({ requeue: r, deadLetter: r.deadLetter });
    if (r.deadLetter.outcome !== 'REQUEUED') throw new DemoError(`requeue answered outcome ${r.deadLetter.outcome}`);
    return [
      undefined,
      `outcome REQUEUED by ${r.deadLetter.resolvedBy ?? '—'} · reconciliation ${r.reconciliation ?? '—'} · proposal ${r.proposal?.status ?? '—'}`,
    ];
  }

  private async requeueAgain(dl: DeadLetter): Promise<[void, string]> {
    try {
      await this.call(
        `POST /dead-letters/${short(dl.id)}/requeue (again)`,
        () => this.api.requeueDeadLetter(dl.id, 'demo mode: double click'),
        () => '200',
      );
    } catch (e) {
      const f = describeFailure(e);
      if (f.status === 409) {
        this.patch({ duplicate: f });
        return [undefined, `409 · duplicate prevented · ${f.message}`];
      }
      throw e;
    }
    throw new DemoError('the second requeue was accepted (200): duplicate NOT prevented');
  }

  private async waitRetried(id: string): Promise<[void, string]> {
    const deadline = this.clock.now() + this.opts.finalizeTimeoutMs;
    this.patch({
      waiting: {
        what: 'retry · the reconciler re-signs under the same operationId',
        until: null,
      },
    });
    for (;;) {
      const p = await this.refresh(id);
      const retried = this.state().audit.some((e) => e.eventType === 'EXECUTION_RETRIED');
      if (retried || p.status === 'EXECUTED') {
        this.patch({ waiting: null });
        const x = p.execution;
        const same = !!p.operationId && p.operationId === this.state().operationId;
        return [
          undefined,
          `retries=${x?.retries ?? 0} · new signature ${shortSig(x?.signature)} · previous ${shortSig(x?.previousSignature)} · operationId ${same ? 'unchanged' : p.operationId}`,
        ];
      }
      if (p.status === 'FAILED') throw new DemoError(`proposal FAILED after the requeue: ${p.execution?.error ?? '—'}`);
      if (this.clock.now() >= deadline) throw new DemoError(`no retry after ${Math.round(this.opts.finalizeTimeoutMs / 1000)} s (status ${p.status})`);
      await this.sleep(this.opts.pollMs);
    }
  }

  private begin(scenario: Scenario, steps: readonly { id: string; label: string }[]): void {
    this.cancelled = false;
    this.executableAt = null;
    this.state.set({
      ...initialState(),
      scenario,
      phase: 'running',
      startedAt: this.clock.now(),
      steps: steps.map((s) => ({
        ...s,
        state: 'pending',
        detail: null,
        startedAt: null,
        endedAt: null,
      })),
    });
  }

  // ---- steps ----------------------------------------------------------------------------------

  private async pickWallet(): Promise<[string, string]> {
    const want = this.opts.demoWallet;
    const found = await this.call(
      'GET /wallets',
      () => this.findWallet(),
      (w) => (w ? `reuse ${w.address.slice(0, 4)}…` : 'none registered'),
    );
    let portfolio: PortfolioResponse;
    if (found) {
      portfolio = await this.call(
        `POST /wallets/${short(found.id)}/refresh`,
        () => this.api.refreshPortfolio(found.id),
        (p) => `$${p.snapshot.totalUsd.toFixed(2)}`,
      );
    } else if (want) {
      portfolio = await this.call(
        'POST /wallets',
        () => this.api.registerWallet(want, 'devnet', 'Demo Mode'),
        (p) => `registered · $${p.snapshot.totalUsd.toFixed(2)}`,
      );
    } else {
      throw new DemoError('no devnet wallet registered for this operator: enter the demo wallet address (the one the signer controls)');
    }
    this.patch({ wallet: portfolio.wallet });
    const t = targetSolWeight(portfolio.snapshot, this.opts.sellSol);
    this.pendingTarget = t.target;
    const addr = portfolio.wallet.address;
    return [
      portfolio.wallet.id,
      `${addr.slice(0, 4)}…${addr.slice(-4)} · ${portfolio.snapshot.totalUsd.toFixed(2)} USD · SOL ${t.amount.toFixed(3)} → target ${t.target} % (sell ≈ ${t.sell.toFixed(3)})`,
    ];
  }

  private pendingTarget = 0;
  /** From the approve answer itself (the timelock the service set), not from a later read. */
  private executableAt: string | null = null;

  private async createIntent(walletId: string): Promise<[string, string]> {
    for (let attempt = 0; ; attempt++) {
      const res = await this.call(
        `POST /wallets/${short(walletId)}/proposals`,
        () => this.api.createRebalance(walletId, { SOL: this.pendingTarget }, 'demo mode: reduce SOL concentration'),
        (r) => r.proposal.status,
      );
      this.patch({ proposal: res.proposal, audit: res.audit });
      const p = res.proposal;
      if (p.status === 'AWAITING_APPROVAL' && p.policy?.executable !== false) {
        const a = p.policy?.authorization;
        return [p.id, `${p.plan.summary} · verdict ${a?.decision ?? '—'}/${a?.tier ?? '—'} · simulation ok=${p.simulation?.onchain?.ok ?? '—'}`];
      }
      const cd = cooldownRemaining(p.policy);
      if (cd !== null && attempt < this.opts.cooldownRetries) {
        await this.waitFor(`cooldown · ${p.policy!.violations.find((v) => v.rule === 'COOLDOWN')!.message}`, (cd + 2) * 1000);
        continue;
      }
      const why = [...(p.policy?.violations ?? []), ...(p.policy?.executionViolations ?? [])].map((v) => `${v.rule}: ${v.message}`).join(' · ');
      throw new DemoError(`intent ${p.status}${why ? ' — ' + why : ''}`);
    }
  }

  private async approve(id: string): Promise<[void, string]> {
    const p = await this.call(
      `POST /proposals/${short(id)}/approve`,
      () => this.api.decideProposal(id, 'approve', 'demo mode: approved by the operator'),
      (x) => x.status,
    );
    this.executableAt = p.approval?.executableAt ?? null;
    this.patch({ proposal: p });
    await this.refresh(id);
    return [undefined, `${p.status} by ${p.approval?.by ?? '—'} · executableAt ${p.approval?.executableAt ?? '—'}`];
  }

  private async waitTimelock(): Promise<[void, string]> {
    const at = parseInstant(this.executableAt ?? this.state().proposal?.approval?.executableAt ?? null);
    const left = at === null ? 0 : at - this.clock.now();
    if (left <= 0) {
      return [undefined, 'no timelock for this verdict (executableAt already reached)'];
    }
    await this.waitFor('timelock · executableAt', left + 1000);
    return [undefined, `waited ${Math.ceil(left / 1000)} s (escalated verdict)`];
  }

  private async execute(id: string): Promise<[void, string]> {
    const op = newOperationId();
    this.patch({ operationId: op });
    for (let attempt = 0; ; attempt++) {
      try {
        const p = await this.call(
          `POST /proposals/${short(id)}/execute {operationId}`,
          () => this.api.executeProposal(id, op),
          (x) => `${x.status} ${x.execution?.status ?? ''}`.trim(),
        );
        this.patch({ proposal: p });
        if (p.status === 'FAILED') throw new DemoError(`execution FAILED: ${p.execution?.error ?? 'no error recorded'}`);
        return [undefined, `operationId ${op} · ${p.status}${p.execution?.signature ? ' · signature ' + shortSig(p.execution.signature) : ''}`];
      } catch (e) {
        const f = describeFailure(e);
        // The server clock decides the lock: a second of skew is a 409 we wait out, not a failure.
        if (isTimelockConflict(f) && attempt < 5) {
          await this.waitFor(`timelock · ${f.message}`, 2000);
          continue;
        }
        throw e;
      }
    }
  }

  private async waitExecuted(id: string): Promise<[void, string]> {
    const deadline = this.clock.now() + this.opts.finalizeTimeoutMs;
    this.patch({
      waiting: {
        what: 'confirmation · polling GET /proposals/{id}',
        until: null,
      },
    });
    for (;;) {
      const p = await this.refresh(id);
      if (p.status === 'EXECUTED') {
        this.patch({ waiting: null });
        return [undefined, `EXECUTED · ${p.execution?.confirmationStatus ?? '—'} · ${shortSig(p.execution?.signature)}`];
      }
      if (p.status === 'FAILED' || p.status === 'EXPIRED' || p.status === 'REJECTED') {
        throw new DemoError(`proposal ${p.status}: ${p.execution?.error ?? 'see the audit trail'}`);
      }
      if (this.clock.now() >= deadline) {
        throw new DemoError(`still ${p.status} after ${Math.round(this.opts.finalizeTimeoutMs / 1000)} s; the reconciler may still close it (see /live)`);
      }
      await this.sleep(this.opts.pollMs);
    }
  }

  private async receiptAndVerify(id: string): Promise<[void, string]> {
    let receipts: IntelligenceReceipt[] = [];
    for (let i = 0; i < this.opts.receiptTries; i++) {
      receipts = await this.call(
        `GET /proposals/${short(id)}/receipts`,
        () => this.api.listProposalReceipts(id),
        (r) => `${r.length} receipt(s)`,
      );
      this.patch({ receiptKinds: receipts.map((r) => r.body.kind) });
      if (receipts.some((r) => r.body.kind === 'EXECUTION')) break;
      await this.sleep(this.opts.pollMs);
    }
    const receipt = receipts.filter((r) => r.body.kind === 'EXECUTION').pop();
    if (!receipt) throw new DemoError(`no EXECUTION receipt among: ${receipts.map((r) => r.body.kind).join(' → ') || 'none'}`);
    this.patch({ receipt });
    const v = await this.call(
      `POST /receipts/${shortHash(receipt.receiptHash)}/verify`,
      () => this.api.verifyReceipt(receipt.receiptHash),
      (x) => `valid=${x.valid}`,
    );
    this.patch({ receiptVerification: v });
    if (!v.valid || !v.signatureValid) throw new DemoError(`receipt does not verify: valid=${v.valid} signatureValid=${v.signatureValid}`);
    return [undefined, `${shortHash(receipt.receiptHash)} · hash + body canonical · signature valid (key ${v.keyId ?? '—'}) · level ${v.level}`];
  }

  private async anchor(): Promise<[void, string]> {
    const hash = this.state().receipt!.receiptHash;
    this.patch({
      waiting: {
        what: 'anchor · POST /anchors?wait=true (memo tx, finality)',
        until: null,
      },
    });
    const sweep = await this.call(
      'POST /anchors?wait=true',
      () => this.api.sweepAnchors(true),
      (s) => `${s.anchored?.status ?? 'nothing new'} · pending ${s.pending}`,
    );
    this.patch({ sweep });
    for (let i = 0; ; i++) {
      const v = await this.call(
        `POST /receipts/${shortHash(hash)}/verify`,
        () => this.api.verifyReceipt(hash),
        (x) => `anchor ${x.anchor.status ?? 'none'} proofValid=${x.anchor.proofValid}`,
      );
      this.patch({ receiptVerification: v });
      if (v.anchor.status === 'FINALIZED' && v.anchor.proofValid === true) {
        this.patch({ waiting: null });
        return [undefined, `root ${shortHash(v.anchor.root)} · ${v.anchor.proof.length} siblings · proofValid · slot ${v.anchor.slot ?? '—'}`];
      }
      if (i + 1 >= this.opts.anchorTries) {
        throw new DemoError(`the EXECUTION receipt is not in a finalized anchor yet (status ${v.anchor.status ?? 'none'}, proofValid ${v.anchor.proofValid})`);
      }
      await this.waitFor(`anchor · ${v.anchor.status ?? 'not batched yet'}, sweeping again (${i + 1}/${this.opts.anchorTries})`, this.opts.anchorRetryMs);
      await this.call(
        'POST /anchors?wait=true',
        () => this.api.sweepAnchors(true),
        (s) => `${s.anchored?.status ?? 'nothing new'} · pending ${s.pending}`,
      );
    }
  }

  private async verifyBatch(id: string): Promise<[void, string]> {
    const root = this.state().receiptVerification!.anchor.root!;
    const av = await this.call(
      `POST /anchors/${shortHash(root)}/verify`,
      () => this.api.verifyAnchor(root),
      (x) => `valid=${x.valid}`,
    );
    this.patch({ anchorVerification: av });
    const receipts = await this.call(
      `GET /proposals/${short(id)}/receipts`,
      () => this.api.listProposalReceipts(id),
      (r) => `${r.length} receipt(s)`,
    );
    const proof = await this.api.loadProof(receipts);
    this.patch({ proof, receiptKinds: receipts.map((r) => r.body.kind) });
    await this.refresh(id);
    if (!av.valid) {
      throw new DemoError(
        `anchor verify: valid=false (rootMatches=${av.rootMatches} proofsValid=${av.proofsValid} memoMatches=${av.memoMatches} onChain.found=${av.onChain?.found})`,
      );
    }
    return [undefined, `root recomputed · ${av.memberCount}/${av.receiptCount} proofs · memo matches · on chain slot ${av.onChain?.slot ?? av.slot ?? '—'}`];
  }

  // ---- plumbing -------------------------------------------------------------------------------

  private async refresh(id: string): Promise<ActionProposal> {
    const r = await this.call(
      `GET /proposals/${short(id)}`,
      () => this.api.getProposal(id),
      (x) => x.proposal.status,
      true,
    );
    this.patch({ proposal: r.proposal, audit: r.audit });
    return r.proposal;
  }

  /** Runs one step: active → done with its detail line, or rethrows (the step is marked failed by `fail`). */
  private async step<T>(id: string, fn: () => Promise<[T, string]>): Promise<T> {
    this.check();
    this.setStep(id, { state: 'active', startedAt: this.clock.now() });
    const [value, detail] = await fn();
    this.setStep(id, { state: 'done', detail, endedAt: this.clock.now() });
    return value;
  }

  /** One API call, traced. Polls (`quiet`) collapse into the previous line when it is the same call. */
  private async call<T>(label: string, fn: () => Promise<T>, describe: (t: T) => string, quiet = false): Promise<T> {
    this.check();
    try {
      const out = await fn();
      this.addTrace(`${label} → ${describe(out)}`, quiet);
      this.check();
      return out;
    } catch (e) {
      if (e instanceof Cancelled) throw e;
      const f = describeFailure(e);
      this.addTrace(`${label} → ${f.status ?? 'error'} ${f.message}`, false);
      throw e;
    }
  }

  private addTrace(line: string, quiet: boolean): void {
    const trace = [...this.state().trace];
    const prefix = line.split(' → ')[0];
    if (quiet && trace.length && trace[trace.length - 1].startsWith(prefix + ' → ')) {
      trace[trace.length - 1] = line;
    } else {
      trace.push(line);
    }
    this.patch({ trace });
  }

  private async waitFor(what: string, ms: number): Promise<void> {
    this.patch({ waiting: { what, until: this.clock.now() + ms } });
    await this.sleep(ms);
    this.patch({ waiting: null });
  }

  private async sleep(ms: number): Promise<void> {
    this.check();
    await this.clock.sleep(ms);
    this.check();
  }

  private check(): void {
    if (this.cancelled) throw new Cancelled();
  }

  private fail(e: unknown): void {
    const cancelled = e instanceof Cancelled;
    const steps = this.state().steps.map((s) =>
      s.state === 'active'
        ? {
            ...s,
            state: (cancelled ? 'skipped' : 'failed') as StepState,
            endedAt: this.clock.now(),
          }
        : s,
    );
    this.patch({
      phase: cancelled ? 'cancelled' : 'failed',
      steps,
      waiting: null,
      finishedAt: this.clock.now(),
      error: cancelled ? null : describeFailure(e),
    });
  }

  private setStep(id: string, patch: Partial<RunStep>): void {
    this.patch({
      steps: this.state().steps.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    });
  }

  private patch(p: Partial<RunState>): void {
    this.state.update((s) => ({ ...s, ...p }));
  }
}

/** Explorer link of the run's transaction (the URL the service stored, else the cluster rule). */
export function runExplorerUrl(s: Pick<RunState, 'proposal'>): string | null {
  const p = s.proposal;
  return p ? explorerTxUrlFor(p.cluster, p.execution?.signature, p.execution?.explorerUrl) : null;
}

function short(id: string): string {
  return `${id.slice(0, 8)}…`;
}

function shortHash(h: string | null | undefined): string {
  if (!h) return '—';
  const hex = h.startsWith('sha256:') ? h.slice(7) : h;
  return `${h.startsWith('sha256:') ? 'sha256:' : ''}${hex.slice(0, 8)}…${hex.slice(-4)}`;
}

function shortSig(s: string | null | undefined): string {
  return s ? `${s.slice(0, 8)}…${s.slice(-6)}` : '—';
}
