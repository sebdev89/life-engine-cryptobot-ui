/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ValueList } from './value-list';
import { ValueDetail } from './value-detail';
import { ValueEvent, IdentityProfile as Prof } from '../value-events-api';
import { IdentityList } from './identity-list';
import { IdentityProfilePage } from './identity-profile';
import { Ledger } from './ledger';
import { UNITS_DISCLAIMER } from './value-model';
import { clearCryptobotSession } from '../session';

const SESSION_KEY = 'life-engine-cryptobot.session';
const EXPLORER = 'https://explorer.solana.com/tx/5abc?cluster=devnet';

function event(over: Partial<ValueEvent> = {}): ValueEvent {
  return {
    id: 've-1',
    receiptHash: 'sha256:' + 'aa'.repeat(32),
    artifactHash: 'sha256:' + 'bb'.repeat(32),
    acceptanceHash: 'sha256:' + 'cc'.repeat(32),
    status: 'ANCHORED',
    anchor: { root: 'sha256:' + 'dd'.repeat(32), txSignature: '5abc', slot: 4228, explorerUrl: EXPLORER },
    distributionPolicy: 'pov/equal-split/v1',
    totalUnits: 100,
    contributions: [
      { identityId: 'i1', displayName: 'Sebas', kind: 'HUMAN', role: 'reviewer', units: 50 },
      { identityId: 'i2', displayName: 'dev-agent', kind: 'AGENT', role: 'implementer', units: 50 },
    ],
    artifact: { commitSha: 'abc1234', prUrl: 'https://github.com/sebdev89/x/pull/7', imageDigest: 'sha256:' + 'ee'.repeat(32) },
    acceptance: {
      source: 'uat-k8s',
      environment: 'k8s-uat',
      stages: { MERGED: true, BUILT: true, DEPLOYED: true, RUNNING: true, ACCEPTED: true },
      evidenceRef: 'ledger#1',
      acceptedAt: '2026-09-30T10:00:00Z',
    },
    projectId: 'p1',
    taskId: 'KAN-100',
    title: 'Fix login redirect',
    acceptedAt: '2026-09-30T10:00:00Z',
    createdAt: '2026-09-30T10:00:05Z',
    ...over,
  };
}

function route(handlers: Record<string, () => Response>) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    for (const [frag, h] of Object.entries(handlers)) if (url.includes(frag)) return h();
    return new Response('{}', { status: 404 });
  });
}
const json = (b: unknown, status = 200) => () => new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } });

async function settle(fixture: { detectChanges(): void; whenStable(): Promise<unknown> }) {
  fixture.detectChanges();
  await fixture.whenStable();
  await new Promise((r) => setTimeout(r, 0));
  fixture.detectChanges();
}

beforeEach(() => {
  clearCryptobotSession();
  localStorage.setItem(SESSION_KEY, JSON.stringify({ accessToken: 'demo-token-'.padEnd(40, 'x') }));
});
afterEach(() => {
  vi.restoreAllMocks();
  clearCryptobotSession();
  localStorage.removeItem(SESSION_KEY);
  TestBed.resetTestingModule();
});

async function mountList() {
  await TestBed.configureTestingModule({ imports: [ValueList], providers: [provideRouter([])] }).compileComponents();
  const f = TestBed.createComponent(ValueList);
  await settle(f);
  return f;
}

describe('ValueList (/value)', () => {
  it('states the thesis and shows loading before data arrives', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => undefined));
    await TestBed.configureTestingModule({ imports: [ValueList], providers: [provideRouter([])] }).compileComponents();
    const f = TestBed.createComponent(ValueList);
    f.detectChanges();
    const t = f.nativeElement.textContent as string;
    expect(t).toContain('AI can create value. Proof of Value makes sure we remember who created it.');
    expect(f.nativeElement.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('renders the events with status, explorer link and contributor chips', async () => {
    route({ '/value-events': json([event(), event({ id: 've-2', status: 'RECORDED', anchor: null, title: 'Second' })]) });
    const f = await mountList();
    const el: HTMLElement = f.nativeElement;
    expect(el.querySelectorAll('tbody tr').length).toBe(2);
    expect(el.textContent).toContain('Fix login redirect');
    expect(el.textContent).toContain('KAN-100');
    expect(el.querySelectorAll('.chip--human').length).toBe(2);
    expect(el.querySelectorAll('.chip--agent').length).toBe(2);
    const link = el.querySelector(`a[href="${EXPLORER}"]`) as HTMLAnchorElement;
    expect(link.target).toBe('_blank');
    expect(el.querySelectorAll('.st--done').length).toBe(1);
    expect(el.querySelectorAll('.st--active').length).toBe(1);
  });

  it('says plainly when nothing has been recorded', async () => {
    route({ '/value-events': json([]) });
    const f = await mountList();
    expect(f.nativeElement.textContent).toContain('No accepted outcomes recorded yet');
  });

  it('shows the error and no data when the API fails', async () => {
    route({ '/value-events': json({ code: 'BOOM', message: 'backend down' }, 500) });
    const f = await mountList();
    const alert = f.nativeElement.querySelector('[role="alert"]') as HTMLElement;
    expect(alert.textContent).toContain('backend down');
    expect(f.nativeElement.querySelector('table')).toBeNull();
  });

  it('asks for a token when there is no session', async () => {
    clearCryptobotSession();
    localStorage.removeItem(SESSION_KEY);
    const spy = vi.spyOn(globalThis, 'fetch');
    const f = await mountList();
    expect(f.nativeElement.querySelector('app-token-gate')).not.toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });
});

async function mountDetail(id = 've-1') {
  await TestBed.configureTestingModule({ imports: [ValueDetail], providers: [provideRouter([])] }).compileComponents();
  const f = TestBed.createComponent(ValueDetail);
  f.componentRef.setInput('id', id);
  await settle(f);
  await settle(f);
  return f;
}

describe('ValueDetail (/value/:id)', () => {
  it('shows the five acceptance stages, the explorer link and the server verdict', async () => {
    route({
      '/value-events/ve-1/proof': json({ receiptHash: 'h', root: 'r', txSignature: '5abc', verified: true }),
      '/value-events/ve-1': json(event()),
    });
    const f = await mountDetail();
    const el: HTMLElement = f.nativeElement;
    expect(el.querySelectorAll('[data-section="acceptance"] .stage').length).toBe(5);
    expect(el.querySelectorAll('[data-section="acceptance"] .stage--fail').length).toBe(0);
    expect(el.querySelectorAll('[data-section="acceptance"] .stage--unknown').length).toBe(0);
    expect(el.querySelector('[data-section="acceptance"]')?.textContent).toContain('uat-k8s');
    expect(el.querySelector('[data-section="acceptance"]')?.textContent).toContain('k8s-uat');
    const pr = el.querySelector('[data-section="evidence"] a') as HTMLAnchorElement;
    expect(pr.href).toBe('https://github.com/sebdev89/x/pull/7');
    expect(pr.target).toBe('_blank');
    expect(el.querySelector('[data-section="evidence"]')?.textContent).toContain('abc1234');
    const btn = el.querySelector(`[data-section="solana"] a[href="${EXPLORER}"]`) as HTMLAnchorElement;
    expect(btn.textContent).toContain('Open in explorer');
    expect(btn.target).toBe('_blank');
    expect(el.querySelector('[data-testid="proof"]')?.textContent).toContain('verified');
    expect(el.querySelector('[data-testid="proof"]')?.textContent).not.toContain('NOT');
    expect(el.querySelectorAll('[data-section="contributors"] tbody tr').length).toBe(2);
  });

  it('says what V1 does not cover instead of inventing it', async () => {
    route({ '/value-events/ve-1/proof': json({ receiptHash: 'h', root: null, txSignature: null, verified: false }), '/value-events/ve-1': json(event()) });
    const t = (await mountDetail()).nativeElement.textContent as string;
    expect(t).toContain('No knowledge assets attributed');
    expect(t).toContain('No compute receipts attached');
    expect(t).toContain('Compute cost is recorded separately from economic value.');
    expect(t).toContain('Not yet — V5');
    expect(t).toContain('Contribution Units: 100 — V6');
    expect(t).toContain('NOT verified');
  });

  it('shows failed and unknown stages, never a check that was not reported', async () => {
    route({
      '/value-events/ve-1/proof': json({ receiptHash: 'h', root: null, txSignature: null, verified: false }),
      '/value-events/ve-1': json(event({ acceptance: { source: 'x', environment: 'y', stages: { MERGED: true, BUILT: false } } })),
    });
    const el: HTMLElement = (await mountDetail()).nativeElement;
    expect(el.querySelectorAll('[data-section="acceptance"] .stage--fail').length).toBe(1);
    expect(el.querySelectorAll('[data-section="acceptance"] .stage--unknown').length).toBe(3);
  });

  it('with no acceptance object every stage reads unknown', async () => {
    route({ '/value-events/ve-1': json(event({ status: 'RECORDED', anchor: null, acceptance: null, artifact: null })) });
    const el: HTMLElement = (await mountDetail()).nativeElement;
    expect(el.querySelectorAll('[data-section="acceptance"] .stage--unknown').length).toBe(5);
    expect(el.querySelector('[data-section="acceptance"]')?.textContent).not.toContain('✓');
  });

  it('a recorded event has no explorer link and does not ask for a proof', async () => {
    const spy = vi.fn(json(event({ status: 'RECORDED', anchor: null })));
    route({ '/value-events/ve-1': spy });
    const f = await mountDetail();
    expect(f.nativeElement.querySelector('[data-section="solana"] a')).toBeNull();
    expect(f.nativeElement.textContent).toContain('not anchored on Solana yet');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('renders real knowledge assets and compute receipts, linked to profiles, cost in USD', async () => {
    route({
      '/value-events/ve-1': json(
        event({
          status: 'RECORDED',
          anchor: null,
          knowledgeAssets: [{ id: 'ka-1', version: 1, kind: 'RULESET', title: 'production-acceptance-model', creatorId: 'sebas', contentHash: 'sha256:' + 'ab'.repeat(32) }],
          computeReceipts: [
            { id: 'cr-1', providerId: 'compute-node-8', providerDisplayName: 'Compute Node 8', node: 'gpu-1', model: 'llama', inputTokens: 1200, outputTokens: 300, gpuSeconds: 12.5, estimatedCostMicroUsd: 4200, providerWallet: 'W' },
          ],
        }),
      ),
    });
    const el: HTMLElement = (await mountDetail()).nativeElement;
    const k = el.querySelector('[data-testid="knowledge"]') as HTMLElement;
    expect(k.textContent).toContain('production-acceptance-model');
    expect(k.textContent).toContain('RULESET');
    expect(k.textContent).toContain('sha256:abababab…ababab');
    expect((k.querySelector('a') as HTMLAnchorElement).getAttribute('href')).toBe('/value/identities/sebas');
    const c = el.querySelector('[data-testid="compute"]') as HTMLElement;
    expect(c.textContent).toContain('Compute Node 8');
    expect(c.textContent).toContain('gpu-1');
    expect(c.textContent).toContain('1200');
    expect(c.textContent).toContain('$0.004200');
    expect(el.textContent).not.toContain('No knowledge assets attributed');
    expect(el.textContent).toContain('Compute cost is recorded separately from economic value.');
    // contributors link to their profile
    expect(el.querySelector('[data-section="contributors"] a[href="/value/identities/i1"]')).not.toBeNull();
  });

  it('shows a not-found message', async () => {
    route({ '/value-events/nope': json({ code: 'NOT_FOUND', message: 'x' }, 404) });
    const f = await mountDetail('nope');
    expect(f.nativeElement.textContent).toContain('No value event with this id.');
  });
});

function profile(over: Partial<Prof> = {}): Prof {
  return {
    id: 'dev-agent-17',
    kind: 'AGENT',
    displayName: 'Dev Agent 17',
    wallet: 'WALLET111',
    ownerId: 'sebas',
    operatorId: 'cryptobot-001',
    createdAt: '2026-09-30T08:00:00Z',
    reputation: { acceptedOutcomes: 3, totalUnits: 150, firstAcceptedAt: '2026-09-30T09:00:00Z', lastAcceptedAt: '2026-09-30T11:00:00Z' },
    history: [{ valueEventId: 've-1', title: 'Fix login redirect', role: 'implementer', units: 50, acceptedAt: '2026-09-30T10:00:00Z', anchorStatus: 'ANCHORED' }],
    ...over,
  };
}

async function mount<T>(cmp: new () => T, inputs: Record<string, string> = {}) {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({ imports: [cmp as never], providers: [provideRouter([])] }).compileComponents();
  const f = TestBed.createComponent(cmp);
  for (const [k, v] of Object.entries(inputs)) f.componentRef.setInput(k, v);
  await settle(f);
  await settle(f);
  return f;
}

describe('IdentityProfilePage (/value/identities/:id)', () => {
  it('shows loading first', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => undefined));
    await TestBed.configureTestingModule({ imports: [IdentityProfilePage], providers: [provideRouter([])] }).compileComponents();
    const f = TestBed.createComponent(IdentityProfilePage);
    f.componentRef.setInput('id', 'x');
    await settle(f);
    expect(f.nativeElement.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('renders kind, wallet explorer link, owner/operator links, reputation and history', async () => {
    route({ '/identities/dev-agent-17': json(profile()) });
    const el: HTMLElement = (await mount(IdentityProfilePage, { id: 'dev-agent-17' })).nativeElement;
    const w = el.querySelector('[data-testid="wallet"]') as HTMLAnchorElement;
    expect(w.href).toBe('https://explorer.solana.com/address/WALLET111?cluster=devnet');
    expect(w.target).toBe('_blank');
    expect(el.querySelector('[data-testid="owner"]')?.getAttribute('href')).toBe('/value/identities/sebas');
    expect(el.querySelector('[data-testid="operator"]')?.getAttribute('href')).toBe('/value/identities/cryptobot-001');
    const rep = el.querySelector('[data-section="reputation"]')?.textContent as string;
    expect(rep).toContain('accepted outcomes');
    expect(rep).toContain('150');
    const rows = el.querySelectorAll('[data-testid="history"] tbody tr');
    expect(rows.length).toBe(1);
    expect(rows[0].querySelector('a')?.getAttribute('href')).toBe('/value/ve-1');
    expect(rows[0].textContent).toContain('implementer');
    expect(rows[0].textContent).toContain('ANCHORED');
  });

  it('says plainly when the history is empty and there is no wallet', async () => {
    route({ '/identities/sebas': json(profile({ id: 'sebas', kind: 'HUMAN', wallet: null, ownerId: null, operatorId: null, history: [] })) });
    const el: HTMLElement = (await mount(IdentityProfilePage, { id: 'sebas' })).nativeElement;
    expect(el.textContent).toContain('No accepted outcomes in this identity');
    expect(el.querySelector('[data-testid="wallet"]')).toBeNull();
    expect(el.querySelector('[data-testid="owner"]')).toBeNull();
  });

  it('shows not-found and generic errors', async () => {
    route({ '/identities/nope': json({ code: 'NOT_FOUND', message: 'x' }, 404) });
    expect(((await mount(IdentityProfilePage, { id: 'nope' })).nativeElement.textContent as string)).toContain('No identity with this id.');
    vi.restoreAllMocks();
    route({ '/identities/bad': json({ code: 'BOOM', message: 'backend down' }, 500) });
    const el: HTMLElement = (await mount(IdentityProfilePage, { id: 'bad' })).nativeElement;
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('backend down');
  });
});

describe('IdentityList (/value/identities)', () => {
  it('lists identities with reputation and links to each profile', async () => {
    route({ '/identities': json([profile(), profile({ id: 'sebas', kind: 'HUMAN', displayName: 'Sebas', reputation: null })]) });
    const el: HTMLElement = (await mount(IdentityList)).nativeElement;
    const rows = el.querySelectorAll('[data-testid="identities"] tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].querySelector('a')?.getAttribute('href')).toBe('/value/identities/dev-agent-17');
    expect(rows[0].textContent).toContain('150');
    expect(el.querySelector('.subnav')).not.toBeNull();
  });

  it('empty, loading and error states', async () => {
    route({ '/identities': json([]) });
    expect(((await mount(IdentityList)).nativeElement.textContent as string)).toContain('No identities registered yet');
    vi.restoreAllMocks();
    route({ '/identities': json({ code: 'BOOM', message: 'backend down' }, 500) });
    const el: HTMLElement = (await mount(IdentityList)).nativeElement;
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('backend down');
    expect(el.querySelector('table')).toBeNull();
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => undefined));
    await TestBed.configureTestingModule({ imports: [IdentityList], providers: [provideRouter([])] }).compileComponents();
    const f = TestBed.createComponent(IdentityList);
    f.detectChanges();
    expect(f.nativeElement.querySelector('[aria-busy="true"]')).not.toBeNull();
  });
});

describe('Ledger (/value/ledger)', () => {
  const ledger = (groupBy: string) => ({
    groupBy,
    rows: [
      { key: 'a', displayName: 'Alpha', kind: 'HUMAN', totalUnits: 60, acceptedOutcomes: 2 },
      { key: 'b', displayName: 'Beta', kind: 'AGENT', totalUnits: 40, acceptedOutcomes: 1 },
    ],
    totalUnits: 100,
  });

  it('shows the fixed disclaimer, rows, and the total in the footer', async () => {
    route({ '/units/ledger?groupBy=identity': json(ledger('identity')) });
    const el: HTMLElement = (await mount(Ledger)).nativeElement;
    expect(el.querySelector('[data-testid="disclaimer"]')?.textContent).toBe(UNITS_DISCLAIMER);
    expect(el.querySelectorAll('[data-testid="ledger"] tbody tr').length).toBe(2);
    expect(el.querySelector('[data-testid="total"]')?.textContent).toContain('100');
    expect(el.querySelector('tbody a')?.getAttribute('href')).toBe('/value/identities/a');
  });

  it('switching the selector re-queries with the chosen grouping', async () => {
    const spy = vi.fn((input: unknown) => {
      const g = String(input).split('groupBy=')[1];
      return Promise.resolve(new Response(JSON.stringify(ledger(g)), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    });
    vi.spyOn(globalThis, 'fetch').mockImplementation(spy as never);
    const f = await mount(Ledger);
    const buttons = Array.from(f.nativeElement.querySelectorAll('.seg button')) as HTMLButtonElement[];
    expect(buttons.map((b) => b.textContent?.trim())).toEqual(['Identity', 'Asset', 'Project']);
    buttons[1].click();
    await settle(f);
    await settle(f);
    expect(String(spy.mock.calls.at(-1)?.[0])).toContain('groupBy=asset');
    expect(f.nativeElement.querySelector('tbody a')).toBeNull();
    expect(f.nativeElement.querySelector('thead th')?.textContent).toContain('asset');
  });

  it('empty and error states', async () => {
    route({ '/units/ledger': json({ groupBy: 'identity', rows: [], totalUnits: 0 }) });
    expect(((await mount(Ledger)).nativeElement.textContent as string)).toContain('No units distributed yet');
    vi.restoreAllMocks();
    route({ '/units/ledger': json({ code: 'BOOM', message: 'backend down' }, 500) });
    const el: HTMLElement = (await mount(Ledger)).nativeElement;
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('backend down');
  });
});
