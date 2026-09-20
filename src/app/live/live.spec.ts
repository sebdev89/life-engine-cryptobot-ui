/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { LiveOperation } from './live';
import { clearCryptobotSession } from '../session';

const SESSION_KEY = 'life-engine-cryptobot.session';
const PID = '4c422b00-2fd3-422e-8319-08888986f11e';
const SIG = '4qeaKhgU4Yob4biUsRBW61wJ7ar2HKDkHD5vQUsMiPgzvukSKC8d8vPLkgH3hiWHLuvy7uAYcnPHDRsCo4s12sbV';

function proposal(status = 'APPROVED', extra: Record<string, unknown> = {}) {
  return {
    id: PID,
    walletId: 'w1',
    walletAddress: 'G4bCRqj3yjQZyMrjxETKvrEhXeYhNzsGY97kipXr4exS',
    cluster: 'devnet',
    status,
    kind: 'REBALANCE',
    title: 't',
    reasoningSummary: null,
    requestedBy: 'demo@cryptobot.local',
    intent: { targetWeights: { SOL: 60 }, counterAsset: 'USDC' },
    plan: {
      legs: [{ action: 'SELL', symbol: 'SOL', mint: null, amount: 0.4, estimatedUsd: 43.8, weightPctBefore: 100, weightPctAfter: 60, counterAsset: 'USDC' }],
      totalUsd: 109,
      weightsBefore: { SOL: 100 },
      weightsAfter: { SOL: 60 },
      turnoverUsd: 43,
      summary: 'SELL 0.3999 SOL → SOL 100% → 60%',
    },
    riskBefore: null,
    riskAfter: null,
    policy: {
      allowed: true,
      executable: true,
      violations: [],
      executionViolations: [],
      rulesApplied: ['KILL_SWITCH', 'EXECUTION_CLUSTER'],
      evaluatedAt: '2026-09-20T17:27:00Z',
      authorization: {
        decision: 'ALLOW',
        escalation: 'NONE',
        tier: 'AUTONOMOUS',
        failedPredicates: [],
        evaluatedPredicates: ['ASSET_ALLOWED'],
        policyVersion: 'v1',
        policyHash: 'sha256:' + '1'.repeat(64),
        inputHash: 'sha256:' + '2'.repeat(64),
      },
    },
    simulation: { economic: null, onchain: { ok: true, error: null, unitsConsumed: 150, logs: [], cluster: 'devnet' } },
    transaction: null,
    approval: { decision: 'APPROVED', by: 'demo@cryptobot.local', at: '2026-09-20T17:27:20Z', note: null },
    execution: null,
    runtimeRunId: null,
    expiresAt: null,
    createdAt: '2026-09-20T17:27:10Z',
    updatedAt: '2026-09-20T17:27:20Z',
    operationId: null,
    ...extra,
  };
}

const AUDIT = ['PROPOSAL_CREATED', 'SIMULATED', 'POLICY_EVALUATED', 'AWAITING_APPROVAL', 'APPROVED'].map((eventType, i) => ({
  id: `e${i}`,
  walletId: 'w1',
  proposalId: PID,
  eventType,
  actor: 'demo@cryptobot.local',
  payload: eventType === 'POLICY_EVALUATED' ? { decision: 'ALLOW', tier: 'AUTONOMOUS' } : {},
  createdAt: `2026-09-20T17:27:1${i}Z`,
}));

type Route = { method?: string; path: RegExp; status?: number; body?: unknown };

/** A tiny fake of cryptobot-service: first matching route wins; anything else is a 404. */
function fakeFetch(routes: Route[]) {
  const calls: { url: string; init: RequestInit }[] = [];
  const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();
    calls.push({ url, init: init ?? {} });
    const r = routes.find((x) => (x.method ?? 'GET') === method && x.path.test(url));
    if (!r)
      return new Response(JSON.stringify({ code: 'NOT_FOUND', message: `no route ${method} ${url}` }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    return new Response(r.body === undefined ? '' : JSON.stringify(r.body), { status: r.status ?? 200, headers: { 'Content-Type': 'application/json' } });
  });
  return { spy, calls };
}

const baseRoutes = (status = 'APPROVED'): Route[] => [
  { path: /\/proposals\?limit=/, body: [proposal(status)] },
  { path: new RegExp(`/proposals/${PID}$`), body: { proposal: proposal(status), audit: AUDIT } },
  {
    path: new RegExp(`/proposals/${PID}/events$`),
    body: {
      proposalId: PID,
      status,
      operationId: null,
      events: [
        {
          id: 'o1',
          aggregateType: 'action_proposal',
          aggregateId: PID,
          eventType: 'trade.approved',
          payload: {},
          status: 'PUBLISHED',
          attempts: 1,
          nextAttemptAt: null,
          lastError: null,
          createdAt: '2026-09-20T17:27:20Z',
          publishedAt: '2026-09-20T17:27:21Z',
        },
      ],
      deadLetters: [],
    },
  },
  { path: new RegExp(`/proposals/${PID}/receipts$`), body: [] },
  {
    path: new RegExp(`/proposals/${PID}/lineage`),
    body: {
      roots: [],
      direction: 'BOTH',
      maxDepth: 16,
      truncated: false,
      lineageRoots: [],
      nodes: [],
      edges: [],
      summary: {
        nodes: 0,
        edges: 0,
        computeUnits: 0,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: null,
        priceTableVersion: null,
        anchored: 0,
        reused: 0,
        byLevel: {},
        byKind: {},
      },
    },
  },
  { path: /\/dead-letters\?/, body: { deadLetters: [], open: 0, limit: 20, offset: 0 } },
];

async function mount(): Promise<ComponentFixture<LiveOperation>> {
  await TestBed.configureTestingModule({ imports: [LiveOperation], providers: [provideRouter([])] }).compileComponents();
  const fixture = TestBed.createComponent(LiveOperation);
  fixture.componentRef.setInput('pollMs', 0);
  fixture.componentRef.setInput('proposalId', PID);
  fixture.detectChanges();
  await fixture.whenStable();
  // the lazy receipt-kinds load and the child panels settle on a second pass
  await new Promise((r) => setTimeout(r, 0));
  fixture.detectChanges();
  return fixture;
}

describe('LiveOperation', () => {
  beforeEach(() => {
    clearCryptobotSession(); // also wipes localStorage, so the token goes in afterwards
    localStorage.setItem(SESSION_KEY, JSON.stringify({ accessToken: 'demo-token-'.padEnd(40, 'x') }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearCryptobotSession();
    localStorage.removeItem(SESSION_KEY);
    TestBed.resetTestingModule();
  });

  it('renders the 12 steps of the demo path from the audit trail, with the policy verdict and the outbox', async () => {
    fakeFetch(baseRoutes());
    const fixture = await mount();
    const el: HTMLElement = fixture.nativeElement;
    const steps = el.querySelectorAll('.step');
    expect(steps.length).toBe(12);
    expect(el.querySelectorAll('.step--done').length).toBe(4); // intent, simulation, policy, approval
    expect(el.querySelector('.step--active strong')?.textContent).toContain('Timelock');
    expect(el.textContent).toContain('ALLOW');
    expect(el.textContent).toContain('tier AUTONOMOUS');
    expect(el.textContent).toContain('EXECUTION_CLUSTER');
    expect(el.textContent).toContain('trade.approved');
    expect(el.textContent).toContain('polling 2 s');
  });

  it('hides the chaos control when the backend does not expose /demo/chaos (404) and shows it on a 200', async () => {
    fakeFetch(baseRoutes());
    let fixture = await mount();
    expect(fixture.nativeElement.querySelector('.panel--chaos')).toBeNull();
    fixture.destroy();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();

    fakeFetch([
      ...baseRoutes(),
      {
        path: /\/demo\/chaos$/,
        body: {
          broadcast: 'rpc-down',
          shotsLeft: -1,
          armed: true,
          faults: [{ at: '2026-09-20T17:28:30Z', mode: 'RPC_DOWN', method: 'sendTransaction', detail: 'chaos: rpc down' }],
        },
      },
    ]);
    fixture = await mount();
    const chaos = fixture.nativeElement.querySelector('.panel--chaos') as HTMLElement;
    expect(chaos).not.toBeNull();
    expect(chaos.textContent).toContain('armed · rpc-down');
    expect(chaos.textContent).toContain('sendTransaction');
    expect(chaos.textContent).toContain('DEMO ONLY');
  });

  it('says so when the token is not RUNTIME_ADMIN (403 on the DLQ) instead of failing the page', async () => {
    fakeFetch([
      ...baseRoutes().filter((r) => !r.path.test('/dead-letters?')),
      { path: /\/dead-letters\?/, status: 403, body: { code: 'FORBIDDEN', message: 'nope' } },
    ]);
    const fixture = await mount();
    expect(fixture.componentInstance.dlqForbidden()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('RUNTIME_ADMIN');
    expect(fixture.nativeElement.querySelectorAll('.step').length).toBe(12);
  });

  it('lists open dead letters with Requeue/Resolve behind a confirmation, and posts the note', async () => {
    const dl = {
      id: '3a88532c-70e1-40d0-8b84-205162ad23fb',
      source: 'RECONCILIATION',
      refId: PID,
      proposalId: PID,
      ownerUserId: 'u',
      reason: 'No verdict after 3 reconciliation attempts',
      payload: { kind: 'ambiguous' },
      createdAt: '2026-09-20T17:29:00Z',
      resolvedAt: null,
      resolvedBy: null,
      resolution: null,
      outcome: null,
    };
    const { calls } = fakeFetch([
      ...baseRoutes('EXECUTING').filter((r) => !r.path.test('/dead-letters?')),
      { path: /\/dead-letters\?/, body: { deadLetters: [dl], open: 1, limit: 20, offset: 0 } },
      {
        method: 'POST',
        path: /\/dead-letters\/3a88532c-70e1-40d0-8b84-205162ad23fb\/requeue$/,
        body: {
          deadLetter: { ...dl, resolvedAt: '2026-09-20T17:29:34Z', resolvedBy: 'demo@cryptobot.local', outcome: 'REQUEUED' },
          proposal: proposal('EXECUTED'),
          reconciliation: 'RETRIED',
          event: null,
        },
      },
    ]);
    const fixture = await mount();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('1 open');
    expect(el.textContent).toContain('ambiguous');
    expect(calls.some((c) => (c.init.method ?? 'GET') === 'POST')).toBe(false);

    (el.querySelector('.dlq__item button.mini') as HTMLButtonElement).click(); // Requeue → confirmation
    fixture.detectChanges();
    expect(el.querySelector('.confirm')).not.toBeNull();
    expect(el.textContent).toContain('Requeue 3a88532c?');
    const note = el.querySelector('.confirm input') as HTMLInputElement;
    note.value = 'RPC is back';
    note.dispatchEvent(new Event('input'));
    (el.querySelector('.confirm .ok-btn') as HTMLButtonElement).click();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();

    const post = calls.find((c) => c.init.method === 'POST' && /requeue$/.test(c.url))!;
    expect(post).toBeDefined();
    expect(JSON.parse(post.init.body as string)).toEqual({ note: 'RPC is back' });
    expect((post.init.headers as Record<string, string>)['Authorization']).toMatch(/^Bearer /);
    expect(fixture.componentInstance.dlqLast()?.resolution.reconciliation).toBe('RETRIED');
    expect(el.textContent).toContain('REQUEUED');
  });

  it('execute sends the same operationId on every click and shows the 409 the control plane answers', async () => {
    const { calls } = fakeFetch([
      ...baseRoutes(),
      {
        method: 'POST',
        path: new RegExp(`/proposals/${PID}/execute$`),
        status: 409,
        body: { code: 'MAINNET_DISABLED', message: 'Execution on mainnet-beta is disabled (fail-closed)' },
      },
    ]);
    const fixture = await mount();
    const el: HTMLElement = fixture.nativeElement;
    const exec = el.querySelector('button.exec-btn') as HTMLButtonElement;
    expect(exec.disabled).toBe(false); // APPROVED ⇒ the click is allowed; the backend decides

    exec.click();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();
    exec.click();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r, 0));
    fixture.detectChanges();

    const posts = calls.filter((c) => c.init.method === 'POST' && /execute$/.test(c.url));
    expect(posts.length).toBe(2);
    const first = JSON.parse(posts[0].init.body as string) as { operationId: string };
    const second = JSON.parse(posts[1].init.body as string) as { operationId: string };
    expect(first.operationId).toMatch(/^[0-9a-f-]{36}$/);
    expect(second.operationId).toBe(first.operationId);
    expect(el.textContent).toContain('HTTP 409');
    expect(el.textContent).toContain('MAINNET_DISABLED');
    expect(el.textContent).toContain(first.operationId);
  });

  it('shows the signature with its devnet explorer link once the service has one', async () => {
    const executed = proposal('EXECUTED', {
      execution: {
        status: 'EXECUTED',
        signature: SIG,
        explorerUrl: `https://explorer.solana.com/tx/${SIG}?cluster=devnet`,
        signerPublicKey: 'G4bCRqj3',
        submittedAt: '2026-09-20T17:27:30Z',
        confirmedAt: '2026-09-20T17:27:33Z',
        confirmationStatus: 'confirmed',
        error: null,
        retries: 0,
        previousSignature: null,
      },
    });
    fakeFetch([
      { path: /\/proposals\?limit=/, body: [executed] },
      { path: new RegExp(`/proposals/${PID}$`), body: { proposal: executed, audit: AUDIT } },
      ...baseRoutes().slice(2),
    ]);
    const fixture = await mount();
    const link = fixture.nativeElement.querySelector(`a[href="https://explorer.solana.com/tx/${SIG}?cluster=devnet"]`);
    expect(link).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('confirmed');
  });

  it('sends the operator back to the login when there is no session', async () => {
    localStorage.removeItem(SESSION_KEY);
    clearCryptobotSession();
    const { calls } = fakeFetch(baseRoutes());
    await TestBed.configureTestingModule({ imports: [LiveOperation], providers: [provideRouter([])] }).compileComponents();
    const router = TestBed.inject(Router);
    const nav = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(LiveOperation);
    fixture.componentRef.setInput('pollMs', 0);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(nav).toHaveBeenCalledWith('/');
    expect(calls.length).toBe(0);
  });
});
