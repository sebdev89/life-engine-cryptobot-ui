import { describe, expect, it, vi } from 'vitest';
import { ActionProposal, AuditEvent, PortfolioResponse, WalletView } from '../control-plane-api';
import { AnchorVerification, IntelligenceReceipt, ReceiptVerification } from '../receipts-api';
import { NO_PROOF } from '../live/live-model';
import { DemoApi, DemoClock, DemoRunner, cooldownRemaining, targetSolWeight } from './demo-runner';

const WALLET: WalletView = {
  id: 'w-1111-2222',
  address: 'G4bCRqj3yjQZyMrjxETKvrEhXeYhNzsGY97kipXr4exS',
  cluster: 'devnet',
  label: 'demo',
  explorerUrl: 'https://explorer.solana.com/address/G4b?cluster=devnet',
  createdAt: '2026-09-29T20:00:00Z',
};
const SIG = '4qeaKhgU4Yob4biUsRBW61wJ7ar2HKDkHD5vQUsMiPgzvukSKC8d8vPLkgH3hiWHLuvy7uAYcnPHDRsCo4s12sbV';
const ROOT = 'sha256:' + 'a'.repeat(64);
const RH = 'sha256:' + 'b'.repeat(64);

function portfolio(amount = 3, weight = 100): PortfolioResponse {
  return {
    wallet: WALLET,
    snapshot: {
      id: 's1',
      walletId: WALLET.id,
      capturedAt: '2026-09-29T20:00:00Z',
      totalUsd: 450,
      positions: [
        {
          mint: 'So1',
          symbol: 'SOL',
          amount,
          decimals: 9,
          priceUsd: 150,
          valueUsd: amount * 150,
          weightPct: weight,
          stable: false,
          nativeSol: true,
          priceSource: 'x',
        },
      ],
      priceSource: 'x',
      recentTxCount: 0,
    },
    risk: {
      findings: [],
      overall: 'LOW',
      score: 0,
      evaluatedAt: '2026-09-29T20:00:00Z',
    },
    changes: null,
  };
}

function proposal(status: string, extra: Partial<ActionProposal> = {}): ActionProposal {
  return {
    id: 'p-0000-1111-2222',
    walletId: WALLET.id,
    walletAddress: WALLET.address,
    cluster: 'devnet',
    status,
    kind: 'REBALANCE',
    title: 't',
    reasoningSummary: null,
    requestedBy: 'demo',
    intent: { targetWeights: { SOL: 83 }, counterAsset: 'USDC' },
    plan: {
      legs: [],
      totalUsd: 450,
      weightsBefore: {},
      weightsAfter: {},
      turnoverUsd: 75,
      summary: 'SELL 0.5 SOL → SOL 100% → 83%',
    },
    riskBefore: null,
    riskAfter: null,
    policy: {
      allowed: true,
      executable: true,
      violations: [],
      executionViolations: [],
      rulesApplied: [],
      evaluatedAt: '2026-09-29T20:00:00Z',
      authorization: null,
    },
    simulation: null,
    transaction: null,
    approval: null,
    execution: null,
    runtimeRunId: null,
    expiresAt: null,
    createdAt: '2026-09-29T20:00:00Z',
    updatedAt: '2026-09-29T20:00:00Z',
    ...extra,
  } as ActionProposal;
}

const EXECUTED = () =>
  proposal('EXECUTED', {
    execution: {
      status: 'EXECUTED',
      signature: SIG,
      explorerUrl: `https://explorer.solana.com/tx/${SIG}?cluster=devnet`,
      signerPublicKey: null,
      submittedAt: null,
      confirmedAt: null,
      confirmationStatus: 'finalized',
      error: null,
    },
  });

function receipt(kind: string): IntelligenceReceipt {
  return {
    receiptHash: kind === 'EXECUTION' ? RH : 'sha256:' + 'c'.repeat(64),
    body: {
      kind,
      agentId: 'a',
      reproducibility: 'r',
      parents: [],
      model: null,
      engine: null,
      runtime: null,
      output: { hash: 'h', schema: null },
      completedAt: '2026-09-29T20:01:00Z',
    },
    signature: { alg: 'Ed25519', keyId: 'demo' },
    anchor: null,
    createdAt: '2026-09-29T20:01:00Z',
  };
}

function verification(anchorStatus: string | null, proofValid: boolean | null): ReceiptVerification {
  return {
    receiptHash: RH,
    valid: true,
    hashMatchesCanonical: true,
    bodyMatchesCanonical: true,
    signatureValid: true,
    parentsPresent: true,
    keyId: 'demo',
    level: 'L2',
    reproduced: null,
    anchor: {
      anchored: anchorStatus !== null,
      status: anchorStatus,
      chain: 'solana-devnet',
      tx: anchorStatus ? 'memoTx111' : null,
      slot: anchorStatus ? 42 : null,
      root: anchorStatus ? ROOT : null,
      proof: anchorStatus ? ['L:sha256:' + 'd'.repeat(64)] : [],
      proofValid,
      explorerUrl: anchorStatus ? 'https://explorer.solana.com/tx/memoTx111?cluster=devnet' : null,
    },
  };
}

const ANCHOR_OK: AnchorVerification = {
  root: ROOT,
  status: 'FINALIZED',
  receiptCount: 2,
  memberCount: 2,
  recomputedRoot: ROOT,
  rootMatches: true,
  countMatches: true,
  proofsValid: true,
  memoMatches: true,
  memo: 'le:anchor',
  tx: 'memoTx111',
  slot: 42,
  explorerUrl: null,
  onChain: {
    checked: true,
    found: true,
    failed: false,
    memoMatches: true,
    slot: 42,
    error: null,
  },
  valid: true,
};

function httpError(status: number, message: string): Error {
  return Object.assign(new Error(message), { apiError: { status, message } });
}

/** Virtual time: `sleep` advances `now` instantly. */
function clock(start = Date.parse('2026-09-29T20:00:00Z')): DemoClock & { t: number; slept: number[] } {
  const c = {
    t: start,
    slept: [] as number[],
    now: () => c.t,
    sleep: async (ms: number) => {
      c.slept.push(ms);
      c.t += ms;
    },
  };
  return c;
}

const CHAOS_OFF = { broadcast: null, shotsLeft: 0, armed: false, faults: [] as { at: string; mode: string; method: string; detail: string }[] };

function happyApi(c: { t: number }, over: Partial<DemoApi> = {}): DemoApi {
  let polls = 0;
  const audit: AuditEvent[] = [];
  return {
    listWallets: vi.fn(async () => [WALLET]),
    registerWallet: vi.fn(async () => portfolio()),
    refreshPortfolio: vi.fn(async () => portfolio()),
    createRebalance: vi.fn(async () => ({
      proposal: proposal('AWAITING_APPROVAL'),
      audit,
    })),
    decideProposal: vi.fn(async () =>
      proposal('APPROVED', {
        approval: {
          decision: 'APPROVED',
          by: 'demo',
          at: '2026-09-29T20:00:00Z',
          note: null,
          executableAt: new Date(c.t + 20_000).toISOString(),
        },
      }),
    ),
    getProposal: vi.fn(async () => {
      polls++;
      return {
        proposal: polls < 3 ? proposal('SUBMITTED') : EXECUTED(),
        audit,
      };
    }),
    executeProposal: vi.fn(async () =>
      proposal('SUBMITTED', {
        execution: {
          status: 'SUBMITTED',
          signature: SIG,
          explorerUrl: null,
          signerPublicKey: null,
          submittedAt: null,
          confirmedAt: null,
          confirmationStatus: null,
          error: null,
        },
      }),
    ),
    listProposalReceipts: vi.fn(async () => [receipt('STRATEGY'), receipt('EXECUTION')]),
    verifyReceipt: vi
      .fn()
      .mockResolvedValueOnce(verification(null, null))
      .mockResolvedValueOnce(verification('SUBMITTED', null))
      .mockResolvedValue(verification('FINALIZED', true)),
    sweepAnchors: vi.fn(async () => ({
      settled: [],
      anchored: null,
      pending: 0,
    })),
    verifyAnchor: vi.fn(async () => ANCHOR_OK),
    loadProof: vi.fn(async () => ({ ...NO_PROOF, inclusion: true })),
    getChaos: vi.fn(async () => CHAOS_OFF),
    armChaos: vi.fn(async () => ({ ...CHAOS_OFF, broadcast: 'rpc-down', armed: true, shotsLeft: -1 })),
    disarmChaos: vi.fn(async () => CHAOS_OFF),
    listProposalDeadLetters: vi.fn(async () => ({ deadLetters: [], open: 0, limit: 50, offset: 0 })),
    requeueDeadLetter: vi.fn(async () => {
      throw httpError(409, 'already resolved');
    }),
    ...over,
  };
}

describe('targetSolWeight', () => {
  it('sells sellSol clamped to 21–40 % of the SOL held, like e2e-devnet.sh', () => {
    expect(targetSolWeight(portfolio(3, 100).snapshot, 0.5)).toEqual({
      target: 79,
      sell: 0.63,
      amount: 3,
    });
    expect(targetSolWeight(portfolio(1, 100).snapshot, 0.5).target).toBe(60); // 0.4 cap
  });
  it('refuses a wallet whose 21 % is over the 2 SOL cap, or with no SOL', () => {
    expect(() => targetSolWeight(portfolio(12, 100).snapshot, 0.5)).toThrow(/2 SOL/);
    expect(() => targetSolWeight({ positions: [] }, 0.5)).toThrow(/no priced SOL/);
  });
});

describe('cooldownRemaining', () => {
  it('reads the seconds left from the COOLDOWN violation the service wrote', () => {
    expect(
      cooldownRemaining({
        violations: [
          {
            rule: 'COOLDOWN',
            message: 'This wallet executed a trade 12s ago; cooldown is 60s',
          },
        ],
      }),
    ).toBe(48);
    expect(
      cooldownRemaining({
        violations: [{ rule: 'MAX_TRADE_USD', message: 'x' }],
      }),
    ).toBeNull();
    expect(cooldownRemaining(null)).toBeNull();
  });
});

describe('DemoRunner · scenario A', () => {
  it('runs every step in order to VERIFIED, waiting the timelock and re-sweeping the anchor', async () => {
    const c = clock();
    const api = happyApi(c);
    const r = new DemoRunner(api, c, { demoWallet: WALLET.address });
    const s = await r.runTrustedExecution();

    expect(s.phase).toBe('verified');
    expect(s.error).toBeNull();
    expect(s.steps.map((x) => x.state)).toEqual(Array(9).fill('done'));
    expect(api.createRebalance).toHaveBeenCalledWith(WALLET.id, { SOL: 79 }, expect.any(String));
    // operationId travels in the body and is the one the run shows
    const op = (api.executeProposal as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(op).toMatch(/^[0-9a-f-]{36}$/);
    expect(s.operationId).toBe(op);
    // timelock: waited until executableAt (+1 s), not a fixed sleep
    expect(c.slept).toContain(21_000);
    // anchor: receipt verify had no anchor; after the sweep SUBMITTED → sweep again → FINALIZED+proofValid
    expect(api.sweepAnchors).toHaveBeenCalledTimes(2);
    expect(api.verifyAnchor).toHaveBeenCalledWith(ROOT);
    expect(s.receipt?.receiptHash).toBe(RH);
    expect(s.proposal?.status).toBe('EXECUTED');
    expect(s.trace.some((t) => t.startsWith('POST /anchors?wait=true'))).toBe(true);
    expect(s.finishedAt! - s.startedAt!).toBeGreaterThan(20_000);
  });

  it('registers the configured wallet when the operator has none', async () => {
    const c = clock();
    const api = happyApi(c, { listWallets: vi.fn(async () => []) });
    const s = await new DemoRunner(api, c, {
      demoWallet: WALLET.address,
    }).runTrustedExecution();
    expect(api.registerWallet).toHaveBeenCalledWith(WALLET.address, 'devnet', 'Demo Mode');
    expect(s.phase).toBe('verified');
  });

  it('waits out the policy cooldown with a countdown and creates the intent again', async () => {
    const c = clock();
    const blocked = proposal('BLOCKED_BY_POLICY', {
      policy: {
        allowed: false,
        executable: false,
        violations: [
          {
            rule: 'COOLDOWN',
            message: 'This wallet executed a trade 22s ago; cooldown is 60s',
          },
        ],
        executionViolations: [],
        rulesApplied: [],
        evaluatedAt: '',
      },
    });
    const create = vi
      .fn()
      .mockResolvedValueOnce({ proposal: blocked, audit: [] })
      .mockResolvedValue({
        proposal: proposal('AWAITING_APPROVAL'),
        audit: [],
      });
    const api = happyApi(c, { createRebalance: create });
    const r = new DemoRunner(api, c, { demoWallet: WALLET.address });
    const seen: (string | undefined)[] = [];
    const orig = api.createRebalance;
    api.createRebalance = async (...a) => {
      seen.push(r.state().waiting?.what);
      return orig(...a);
    };
    const s = await r.runTrustedExecution();
    expect(create).toHaveBeenCalledTimes(2);
    expect(c.slept).toContain(40_000); // 60 − 22 + 2
    expect(s.phase).toBe('verified');
  });

  it('fails honestly on a policy block that is not a cooldown', async () => {
    const c = clock();
    const blocked = proposal('BLOCKED_BY_POLICY', {
      policy: {
        allowed: false,
        executable: false,
        violations: [{ rule: 'MAX_TRADE_USD', message: 'over $500' }],
        executionViolations: [],
        rulesApplied: [],
        evaluatedAt: '',
      },
    });
    const api = happyApi(c, {
      createRebalance: vi.fn(async () => ({ proposal: blocked, audit: [] })),
    });
    const s = await new DemoRunner(api, c, {
      demoWallet: WALLET.address,
    }).runTrustedExecution();
    expect(s.phase).toBe('failed');
    expect(s.error?.message).toContain('MAX_TRADE_USD: over $500');
    expect(s.steps.find((x) => x.id === 'intent')?.state).toBe('failed');
    expect(s.steps.find((x) => x.id === 'approve')?.state).toBe('pending');
    expect(api.decideProposal).not.toHaveBeenCalled();
  });

  it('retries an execute that lands a second early in the timelock (409), then proceeds', async () => {
    const c = clock();
    const exec = vi.fn().mockRejectedValueOnce(httpError(409, 'Timelock: executable at 20:00:21Z')).mockResolvedValue(proposal('SUBMITTED'));
    const api = happyApi(c, { executeProposal: exec });
    const s = await new DemoRunner(api, c, {
      demoWallet: WALLET.address,
    }).runTrustedExecution();
    expect(exec).toHaveBeenCalledTimes(2);
    expect(exec.mock.calls[0][1]).toBe(exec.mock.calls[1][1]); // same operationId on the retry
    expect(s.phase).toBe('verified');
  });

  it('surfaces any other 409 with its status and stops', async () => {
    const c = clock();
    const api = happyApi(c, {
      executeProposal: vi.fn().mockRejectedValue(httpError(409, 'Proposal is not approved')),
    });
    const s = await new DemoRunner(api, c, {
      demoWallet: WALLET.address,
    }).runTrustedExecution();
    expect(s.phase).toBe('failed');
    expect(s.error).toMatchObject({
      status: 409,
      conflict: true,
      message: 'Proposal is not approved',
    });
    expect(s.steps.find((x) => x.id === 'execute')?.state).toBe('failed');
    expect(s.trace.at(-1)).toContain('→ 409 Proposal is not approved');
  });

  it('polls until EXECUTED and gives up with a timeout message, never a fake success', async () => {
    const c = clock();
    const api = happyApi(c, {
      getProposal: vi.fn(async () => ({
        proposal: proposal('SUBMITTED'),
        audit: [],
      })),
    });
    const s = await new DemoRunner(api, c, {
      demoWallet: WALLET.address,
      finalizeTimeoutMs: 10_000,
      pollMs: 2000,
    }).runTrustedExecution();
    expect(s.phase).toBe('failed');
    expect(s.error?.message).toMatch(/still SUBMITTED after 10 s/);
    expect((api.getProposal as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(6);
    // repeated polls collapse into one trace line
    expect(s.trace.filter((t) => t.startsWith('GET /proposals/p-0000-1… →')).length).toBeLessThanOrEqual(2);
  });

  it('stops on a FAILED execution with the service error', async () => {
    const c = clock();
    const failed = proposal('FAILED', {
      execution: {
        status: 'FAILED',
        signature: null,
        explorerUrl: null,
        signerPublicKey: null,
        submittedAt: null,
        confirmedAt: null,
        confirmationStatus: null,
        error: 'insufficient funds',
      },
    });
    const api = happyApi(c, {
      getProposal: vi.fn(async () => ({ proposal: failed, audit: [] })),
    });
    const s = await new DemoRunner(api, c, {
      demoWallet: WALLET.address,
    }).runTrustedExecution();
    expect(s.phase).toBe('failed');
    expect(s.error?.message).toContain('insufficient funds');
  });

  it('fails when the anchor never finalizes within the tries', async () => {
    const c = clock();
    const api = happyApi(c, {
      verifyReceipt: vi.fn(async () => verification('SUBMITTED', null)),
    });
    const s = await new DemoRunner(api, c, {
      demoWallet: WALLET.address,
      anchorTries: 3,
    }).runTrustedExecution();
    expect(s.phase).toBe('failed');
    expect(s.error?.message).toMatch(/not in a finalized anchor/);
    expect(s.steps.find((x) => x.id === 'anchor')?.state).toBe('failed');
  });

  it('does not call it VERIFIED when the batch verification says invalid', async () => {
    const c = clock();
    const api = happyApi(c, {
      verifyAnchor: vi.fn(async () => ({
        ...ANCHOR_OK,
        valid: false,
        memoMatches: false,
      })),
    });
    const s = await new DemoRunner(api, c, {
      demoWallet: WALLET.address,
    }).runTrustedExecution();
    expect(s.phase).toBe('failed');
    expect(s.error?.message).toContain('memoMatches=false');
  });

  it('can be cancelled mid-run (timelock) and ignores a second start while running', async () => {
    const c = clock();
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const slow: DemoClock = {
      now: c.now,
      sleep: async (ms) => {
        c.t += ms;
        await gate;
      },
    };
    const api = happyApi(c);
    const r = new DemoRunner(api, slow, { demoWallet: WALLET.address });
    const p = r.runTrustedExecution();
    await vi.waitFor(() => expect(r.state().waiting?.what).toContain('timelock'));
    expect(r.state().waiting?.until).toBeGreaterThan(c.t - 21_000);
    await r.runTrustedExecution(); // no-op
    expect(api.listWallets).toHaveBeenCalledTimes(1);
    r.cancel();
    release();
    const s = await p;
    expect(s.phase).toBe('cancelled');
    expect(api.executeProposal).not.toHaveBeenCalled();
    expect(s.steps.find((x) => x.id === 'timelock')?.state).toBe('skipped');
  });
});

// ---- scenario B ----------------------------------------------------------------------------------

const SIG1 = '5Wr1stAttemptSignedNeverBroadcastXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
const DL = {
  id: 'dl-3333-4444',
  source: 'RECONCILIATION' as const,
  refId: 'p-0000-1111-2222',
  proposalId: 'p-0000-1111-2222',
  ownerUserId: 'u',
  reason: 'no verdict from the chain after 3 attempts',
  payload: { kind: 'ambiguous' },
  createdAt: '2026-09-29T20:02:00Z',
  resolvedAt: null,
  resolvedBy: null,
  resolution: null,
  outcome: null,
};

function ev(eventType: string, payload: Record<string, unknown> = {}): AuditEvent {
  return { id: eventType, walletId: null, proposalId: 'p-0000-1111-2222', eventType, actor: 'x', payload, createdAt: '2026-09-29T20:01:00Z' };
}

/** A stack where the fault works: uncertain → dead letter on the 2nd poll → requeue once → retry lands. */
function failureApi(c: { t: number }, over: Partial<DemoApi> = {}) {
  let stage: 'approved' | 'uncertain' | 'requeued' = 'approved';
  let dlPolls = 0;
  let requeues = 0;
  let op: string | null = null;
  const exec = (status: string, signature: string, extra = {}) => ({
    status,
    signature,
    explorerUrl: null,
    signerPublicKey: null,
    submittedAt: null,
    confirmedAt: null,
    confirmationStatus: status === 'EXECUTED' ? 'confirmed' : null,
    error: null,
    ...extra,
  });
  const api = happyApi(c, {
    executeProposal: vi.fn(async (_id: string, operationId?: string | null) => {
      op = operationId ?? null;
      stage = 'uncertain';
      return proposal('EXECUTING', { operationId: op, execution: exec('SIGNED', SIG1) });
    }),
    getProposal: vi.fn(async () => {
      if (stage === 'uncertain') {
        return {
          proposal: proposal('EXECUTING', { operationId: op, execution: exec('SIGNED', SIG1, { reconciliationAttempts: dlPolls }) }),
          audit: [ev('EXECUTION_STARTED'), ev('EXECUTION_BROADCAST_UNCERTAIN', { error: 'chaos: rpc-down' })],
        };
      }
      if (stage === 'requeued') {
        return {
          proposal: proposal('EXECUTED', { operationId: op, execution: exec('EXECUTED', SIG, { retries: 1, previousSignature: SIG1 }) }),
          audit: [
            ev('EXECUTION_BROADCAST_UNCERTAIN'),
            ev('RECONCILIATION_AMBIGUOUS'),
            ev('DEAD_LETTER_REQUEUED'),
            ev('EXECUTION_RETRIED', { operationId: op }),
            ev('EXECUTED'),
          ],
        };
      }
      return { proposal: proposal('APPROVED'), audit: [] };
    }),
    listProposalDeadLetters: vi.fn(async () => ({ deadLetters: ++dlPolls >= 2 ? [DL] : [], open: dlPolls >= 2 ? 1 : 0, limit: 50, offset: 0 })),
    requeueDeadLetter: vi.fn(async () => {
      if (++requeues > 1) throw httpError(409, 'Dead letter dl-3333 is already resolved (REQUEUED)');
      stage = 'requeued';
      return {
        deadLetter: { ...DL, resolvedAt: 'now', resolvedBy: 'demo@cryptobot.local', outcome: 'REQUEUED' as const },
        proposal: null,
        reconciliation: 'RETRIED' as const,
        event: null,
      };
    }),
    ...over,
  });
  return api;
}

describe('DemoRunner · scenario B', () => {
  it('fault → uncertain → dead letter → disarm → requeue → 409 on the duplicate → retried → EXECUTED → proof', async () => {
    const c = clock();
    const api = failureApi(c);
    const s = await new DemoRunner(api, c, { demoWallet: WALLET.address }).runSimulateFailure();

    expect(s.error).toBeNull();
    expect(s.phase).toBe('verified');
    expect(s.scenario).toBe('failure');
    expect(s.steps.every((x) => x.state === 'done')).toBe(true);
    expect(api.armChaos).toHaveBeenCalledWith('rpc-down', -1);
    expect(api.disarmChaos).toHaveBeenCalledTimes(1); // restored once, no cleanup needed
    // armed after the timelock, right before the execute (like the script)
    const order = s.trace.map((t) => t.split(' ')[0] + ' ' + t.split(' ')[1]);
    expect(order.indexOf('PUT /demo/chaos')).toBeLessThan(order.findIndex((t) => t.includes('/execute')));
    expect(api.requeueDeadLetter).toHaveBeenCalledTimes(2);
    expect(s.duplicate).toMatchObject({ status: 409, conflict: true });
    expect(s.steps.find((x) => x.id === 'idempotency')?.detail).toContain('duplicate prevented');
    expect(s.firstSignature).toBe(SIG1);
    expect(s.proposal?.execution?.previousSignature).toBe(SIG1);
    expect(s.proposal?.execution?.signature).toBe(SIG);
    expect(s.proposal?.operationId).toBe(s.operationId); // the same key before and after
    expect(s.deadLetter?.outcome).toBe('REQUEUED');
    expect(s.steps.find((x) => x.id === 'recovered')?.detail).toContain('operationId unchanged');
  });

  it('refuses to run where the fault injection is not exposed (no chaos bean or no admin)', async () => {
    const c = clock();
    const api = failureApi(c, { getChaos: vi.fn(async () => null) });
    const s = await new DemoRunner(api, c, { demoWallet: WALLET.address }).runSimulateFailure();
    expect(s.phase).toBe('failed');
    expect(s.error?.message).toMatch(/not exposed/);
    expect(api.createRebalance).not.toHaveBeenCalled();
    expect(api.armChaos).not.toHaveBeenCalled();
  });

  it('fails loudly if the second requeue is accepted, and still disarms the fault', async () => {
    const c = clock();
    const ok = {
      deadLetter: { ...DL, outcome: 'REQUEUED' as const, resolvedAt: 'now', resolvedBy: 'x' },
      proposal: null,
      reconciliation: 'RETRIED' as const,
      event: null,
    };
    const api = failureApi(c, { requeueDeadLetter: vi.fn(async () => ok) });
    const s = await new DemoRunner(api, c, { demoWallet: WALLET.address }).runSimulateFailure();
    expect(s.phase).toBe('failed');
    expect(s.error?.message).toContain('duplicate NOT prevented');
    expect(s.steps.find((x) => x.id === 'idempotency')?.state).toBe('failed');
  });

  it('disarms the fault on the way out when the run breaks while it is armed', async () => {
    const c = clock();
    const api = failureApi(c, { listProposalDeadLetters: vi.fn(async () => ({ deadLetters: [], open: 0, limit: 50, offset: 0 })) });
    const s = await new DemoRunner(api, c, { demoWallet: WALLET.address, deadLetterTimeoutMs: 9000 }).runSimulateFailure();
    expect(s.phase).toBe('failed');
    expect(s.error?.message).toMatch(/no dead letter after 9 s/);
    expect(api.disarmChaos).toHaveBeenCalledTimes(1);
    expect(s.trace.at(-1)).toContain('DELETE /demo/chaos (cleanup) → armed=false');
  });

  it('flags an execution that landed despite the fault instead of calling it a recovery', async () => {
    const c = clock();
    const api = failureApi(c, { getProposal: vi.fn(async () => ({ proposal: EXECUTED(), audit: [] })) });
    const s = await new DemoRunner(api, c, { demoWallet: WALLET.address }).runSimulateFailure();
    expect(s.phase).toBe('failed');
    expect(s.error?.message).toMatch(/landed despite the fault/);
  });
});
