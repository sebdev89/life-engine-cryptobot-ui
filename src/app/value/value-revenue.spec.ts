/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RevenueList } from './revenue-list';
import { RevenueDetail } from './revenue-detail';
import { TreasuryPage } from './treasury';
import { ValueList } from './value-list';
import { ValueDetail } from './value-detail';
import { IdentityProfilePage } from './identity-profile';
import { RevenueEvent, Treasury, ValueEvent } from '../value-events-api';
import { bpsPercent, revenuePolicyView } from './value-model';
import { clearCryptobotSession } from '../session';

const SESSION_KEY = 'life-engine-cryptobot.session';

function revenue(over: Partial<RevenueEvent> = {}): RevenueEvent {
  return {
    id: 're-1',
    projectId: 'p1',
    source: { kind: 'PROPOSAL', ref: 'prop-9' },
    simulated: false,
    amountLamports: 1_000_000_000,
    policy: { name: 'pov/revenue-share/v1', revenueShareBps: 2000, protocolFeeBps: 500 },
    contributorPoolLamports: 200_000_000,
    protocolFeeLamports: 50_000_000,
    retainedLamports: 750_000_000,
    status: 'COMPLETE',
    receiptHash: 'sha256:' + 'ab'.repeat(32),
    anchor: { root: 'sha256:' + 'dd'.repeat(32), txSignature: 'ANCHORSIG', slot: 99, explorerUrl: 'https://explorer.solana.com/tx/ANCHORSIG?cluster=devnet' },
    linkedValueEvents: [{ id: 've-1', title: 'Fix login redirect' }],
    payouts: [
      { identityId: 'i1', displayName: 'Sebas', wallet: 'WALLETAAAA1111BBBB', lamports: 100_000_000, status: 'CONFIRMED', txSignature: 'SIG1', explorerUrl: null, error: null },
      { identityId: 'i2', displayName: 'dev-agent', wallet: null, lamports: 100_000_000, status: 'UNFUNDED', txSignature: null, explorerUrl: null, error: null },
    ],
    createdAt: '2026-09-30T12:00:00Z',
    ...over,
  };
}

function treasury(over: Partial<Treasury> = {}): Treasury {
  return {
    identityId: 'cryptobot-001',
    wallet: 'TREASURYWALLET1234',
    onChainBalanceLamports: 2_500_000_000,
    incomeLamports: 1_000_000_000,
    contributorPayoutsLamports: 200_000_000,
    protocolFeeLamports: 50_000_000,
    computeCostMicroUsd: 4200,
    retainedLamports: 750_000_000,
    policies: { rewardPoolLamports: 50_000_000, revenueShareBps: 2000, protocolFeeBps: 500, signerMaxLamports: 100_000_000 },
    recentEvents: [
      { kind: 'REVENUE', id: 're-1', lamports: 1_000_000_000, at: '2026-09-30T12:00:00Z', txSignature: null },
      { kind: 'PAYOUT', id: 'po-1', lamports: 100_000_000, at: '2026-09-30T12:01:00Z', txSignature: 'PAYSIG' },
    ],
    ...over,
  };
}

function valueEvent(over: Partial<ValueEvent> = {}): ValueEvent {
  return {
    id: 've-1',
    receiptHash: 'sha256:' + 'aa'.repeat(32),
    artifactHash: 'sha256:' + 'bb'.repeat(32),
    acceptanceHash: 'sha256:' + 'cc'.repeat(32),
    status: 'ANCHORED',
    anchor: null,
    distributionPolicy: 'pov/equal-split/v1',
    totalUnits: 100,
    contributions: [{ identityId: 'i1', displayName: 'Sebas', kind: 'HUMAN', role: 'reviewer', units: 100 }],
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

async function mount<T>(cmp: new () => T, inputs: Record<string, string> = {}) {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({ imports: [cmp as never], providers: [provideRouter([])] }).compileComponents();
  const f = TestBed.createComponent(cmp);
  for (const [k, v] of Object.entries(inputs)) f.componentRef.setInput(k, v);
  await settle(f);
  await settle(f);
  return f;
}
const q = (el: HTMLElement, id: string) => el.querySelector(`[data-testid="${id}"]`);

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

describe('revenue policy helpers', () => {
  it('reads the bps from the policy object', () => {
    const v = revenuePolicyView(revenue({ policy: { revenueShareBps: 3000, protocolFeeBps: 250 } }));
    expect(v).toMatchObject({ shareBps: 3000, feeBps: 250, retainedBps: 6750 });
  });
  it('derives them from the server amounts when only a name came', () => {
    const v = revenuePolicyView(revenue({ policy: 'pov/revenue/v1' }));
    expect(v).toMatchObject({ name: 'pov/revenue/v1', shareBps: 2000, feeBps: 500, retainedBps: 7500 });
  });
  it('formats bps', () => {
    expect(bpsPercent(2000)).toBe('20 %');
    expect(bpsPercent(250)).toBe('2.5 %');
    expect(bpsPercent(null)).toBe('—');
  });
});

describe('RevenueList (/value/revenue)', () => {
  it('shows loading first', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => undefined));
    const f = await mount(RevenueList);
    expect(f.nativeElement.textContent).toContain('Reading /revenue-events');
  });

  it('renders rows with split, anchor link, the fixed settlement copy and no simulated text for real revenue', async () => {
    route({ '/revenue-events': json([revenue()]) });
    const el: HTMLElement = (await mount(RevenueList)).nativeElement;
    expect(el.querySelectorAll('[data-testid="revenue-list"] tbody tr').length).toBe(1);
    expect(q(el, 'revenue-list')?.textContent).toContain('1.0000');
    expect(q(el, 'revenue-list')?.textContent).toContain('0.2000');
    expect(el.querySelector('a[href="https://explorer.solana.com/tx/ANCHORSIG?cluster=devnet"]')).not.toBeNull();
    expect(q(el, 'settlement-note')?.textContent).toContain('devnet SOL stands in for stablecoin settlement in this demo.');
    expect(q(el, 'simulated')).toBeNull();
    expect(q(el, 'simulated-note')).toBeNull();
  });

  it('marks SIMULATED and says it is not real profit', async () => {
    route({ '/revenue-events': json([revenue({ simulated: true, source: { kind: 'SIMULATED', ref: 'demo' }, anchor: null })]) });
    const el: HTMLElement = (await mount(RevenueList)).nativeElement;
    expect(q(el, 'simulated')?.textContent).toContain('SIMULATED');
    expect(q(el, 'simulated-note')?.textContent).toContain('Simulated economic result — not real profit.');
    expect(el.textContent).toContain('not anchored');
  });

  it('empty and error states', async () => {
    route({ '/revenue-events': json([]) });
    expect(((await mount(RevenueList)).nativeElement as HTMLElement).textContent).toContain('No revenue events yet');
    route({ '/revenue-events': json({ message: 'boom' }, 500) });
    const el: HTMLElement = (await mount(RevenueList)).nativeElement;
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Could not read revenue events');
    expect(q(el, 'revenue-list')).toBeNull();
  });
});

describe('RevenueDetail (/value/revenue/:id)', () => {
  it('shows what, why (bps from the object), linked events, payouts and anchor', async () => {
    route({ '/revenue-events/re-1': json(revenue({ policy: { revenueShareBps: 3000, protocolFeeBps: 250 } })) });
    const el: HTMLElement = (await mount(RevenueDetail, { id: 're-1' })).nativeElement;
    expect(q(el, 'amount')?.textContent).toContain('1.0000 SOL');
    expect(q(el, 'source-link')?.getAttribute('href')).toBe('/live/prop-9');
    expect(q(el, 'share-pool')?.textContent).toContain('30 %');
    expect(q(el, 'share-fee')?.textContent).toContain('2.5 %');
    expect(q(el, 'share-retained')?.textContent).toContain('67.5 %');
    expect(q(el, 'linked')?.querySelector('a')?.getAttribute('href')).toBe('/value/ve-1');
    expect(q(el, 'payouts')?.querySelectorAll('tbody tr').length).toBe(2);
    expect(q(el, 'payouts')?.textContent).toContain('no wallet on file');
    expect(el.querySelector('[data-section="solana"]')?.textContent).toContain('ANCHORSIG');
    expect(el.textContent).toContain('devnet SOL stands in for stablecoin settlement in this demo.');
    expect(q(el, 'simulated-note')).toBeNull();
  });

  it('simulated: badge and banner; non-PROPOSAL source has no /live link', async () => {
    route({ '/revenue-events/re-2': json(revenue({ id: 're-2', simulated: true, source: { kind: 'SIMULATED', ref: 'demo' }, anchor: null, payouts: [], linkedValueEvents: [] })) });
    const el: HTMLElement = (await mount(RevenueDetail, { id: 're-2' })).nativeElement;
    expect(q(el, 'simulated')).not.toBeNull();
    expect(q(el, 'simulated-note')?.textContent).toContain('Simulated economic result — not real profit.');
    expect(q(el, 'source-link')).toBeNull();
    expect(el.textContent).toContain('No payouts recorded');
    expect(el.textContent).toContain('No value events are linked');
    expect(el.textContent).toContain('Not anchored on Solana yet');
  });

  it('loading, not-found and generic errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => undefined));
    expect(((await mount(RevenueDetail, { id: 'x' })).nativeElement as HTMLElement).textContent).toContain('Reading revenue event');
    route({ '/revenue-events/nope': json({ code: 'NOT_FOUND', message: 'x' }, 404) });
    expect(((await mount(RevenueDetail, { id: 'nope' })).nativeElement as HTMLElement).textContent).toContain('No revenue event with this id.');
    route({ '/revenue-events/bad': json({ message: 'boom' }, 500) });
    expect(((await mount(RevenueDetail, { id: 'bad' })).nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent).toContain('API:');
  });
});

describe('TreasuryPage (/value/treasury)', () => {
  const identities = [
    { id: 'sebas', kind: 'HUMAN', displayName: 'Sebas', wallet: null, ownerId: null, operatorId: null },
    { id: 'cryptobot-001', kind: 'AGENT', displayName: 'CryptoBot 001', wallet: 'TREASURYWALLET1234', ownerId: 'sebas', operatorId: 'sebas' },
    { id: 'dev-agent-17', kind: 'AGENT', displayName: 'Dev Agent 17', wallet: 'W', ownerId: 'sebas', operatorId: null },
  ];

  it('loads cryptobot-001 by default and renders the accounting, policies, events and the fixed note', async () => {
    route({ '/treasury/cryptobot-001': json(treasury()), '/identities': json(identities) });
    const el: HTMLElement = (await mount(TreasuryPage)).nativeElement;
    expect(q(el, 'balance')?.textContent).toContain('2.5000 SOL');
    expect(q(el, 'wallet')?.getAttribute('href')).toContain('explorer.solana.com/address/TREASURYWALLET1234');
    expect(q(el, 'income')?.textContent).toContain('1.0000');
    expect(q(el, 'payouts-total')?.textContent).toContain('0.2000');
    expect(q(el, 'fee')?.textContent).toContain('0.0500');
    expect(q(el, 'compute')?.textContent).toContain('$0.004200');
    expect(q(el, 'retained')?.textContent).toContain('0.7500');
    expect(q(el, 'policies')?.textContent).toContain('20 %');
    expect(q(el, 'policies')?.textContent).toContain('5 %');
    expect(q(el, 'recent')?.querySelectorAll('tbody tr').length).toBe(2);
    expect(q(el, 'recent')?.querySelector('a[href*="PAYSIG"]')).not.toBeNull();
    expect(q(el, 'treasury-note')?.textContent).toContain('Treasury is an accounting view; in this demo payouts are signed from the demo wallet.');
    // selector offers only AGENT identities
    expect(Array.from(el.querySelectorAll('.seg button')).map((b) => b.textContent?.trim())).toEqual(['CryptoBot 001', 'Dev Agent 17']);
  });

  it('a null on-chain balance reads unknown, never 0', async () => {
    route({ '/treasury/cryptobot-001': json(treasury({ onChainBalanceLamports: null, recentEvents: [] })), '/identities': json(identities) });
    const el: HTMLElement = (await mount(TreasuryPage)).nativeElement;
    expect(q(el, 'balance')?.textContent).toContain('unknown');
    expect(q(el, 'balance')?.textContent).not.toContain('0.0000');
    expect(el.textContent).toContain('No treasury activity yet');
  });

  it('switching the selector queries the chosen identity', async () => {
    route({ '/treasury/dev-agent-17': json(treasury({ identityId: 'dev-agent-17', incomeLamports: 5_000_000_000 })), '/treasury/cryptobot-001': json(treasury()), '/identities': json(identities) });
    const f = await mount(TreasuryPage);
    const el: HTMLElement = f.nativeElement;
    (Array.from(el.querySelectorAll('.seg button')).find((b) => b.textContent?.includes('Dev Agent')) as HTMLButtonElement).click();
    await settle(f);
    await settle(f);
    expect(q(el, 'income')?.textContent).toContain('5.0000');
  });

  it('loading and error states; the default still loads when identities fail', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => undefined));
    expect(((await mount(TreasuryPage)).nativeElement as HTMLElement).textContent).toContain('Reading /treasury');
    route({ '/treasury/cryptobot-001': json(treasury()) });
    expect(q((await mount(TreasuryPage)).nativeElement, 'income')).not.toBeNull();
    route({ '/treasury/cryptobot-001': json({ message: 'boom' }, 500), '/identities': json(identities) });
    const el: HTMLElement = (await mount(TreasuryPage)).nativeElement;
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Could not read the treasury');
    expect(q(el, 'income')).toBeNull();
  });
});

describe('ValueList header numbers (V7)', () => {
  it('shows accepted, anchored, SOL distributed (immediate + revenue) and revenue events', async () => {
    route({
      '/revenue-events': json([revenue(), revenue({ id: 're-2', payouts: [{ identityId: 'i1', displayName: 'S', wallet: 'W', lamports: 300_000_000, status: 'FAILED', txSignature: null, explorerUrl: null, error: 'x' }] })]),
      '/value-events': json([
        valueEvent({ id: 'a', distribution: { status: 'COMPLETE', poolLamports: 50_000_000, confirmedLamports: 50_000_000 } }),
        valueEvent({ id: 'b', status: 'RECORDED' }),
      ]),
    });
    const el: HTMLElement = (await mount(ValueList)).nativeElement;
    expect(q(el, 'kpi-accepted')?.textContent?.trim()).toBe('2');
    expect(q(el, 'kpi-anchored')?.textContent?.trim()).toBe('1');
    // 0.05 immediate + 0.1 confirmed revenue payout (the FAILED one does not count)
    expect(q(el, 'kpi-sol')?.textContent?.trim()).toBe('0.1500');
    expect(q(el, 'kpi-revenue')?.textContent?.trim()).toBe('2');
  });

  it('without a revenue endpoint the numbers that need it say — instead of 0', async () => {
    route({ '/value-events': json([valueEvent()]) });
    const el: HTMLElement = (await mount(ValueList)).nativeElement;
    expect(q(el, 'kpi-accepted')?.textContent?.trim()).toBe('1');
    expect(q(el, 'kpi-sol')?.textContent?.trim()).toBe('—');
    expect(q(el, 'kpi-revenue')?.textContent?.trim()).toBe('—');
  });

  it('nav links Revenue and Treasury', async () => {
    route({ '/value-events': json([]) });
    const el: HTMLElement = (await mount(ValueList)).nativeElement;
    const labels = Array.from(el.querySelectorAll('nav.subnav a')).map((a) => a.textContent?.trim());
    expect(labels).toEqual(['Events', 'Identities', 'Ledger', 'Revenue', 'Treasury']);
  });
});

describe('ValueDetail revenue shares (V7)', () => {
  it('lists revenueShares with links and SOL next to Contribution Units', async () => {
    route({ '/value-events/ve-1': json(valueEvent({ revenueShares: [{ revenueEventId: 're-1', lamports: 100_000_000 }] })), '/proof': json({ receiptHash: 'h', root: 'r', txSignature: 't', verified: true }) });
    const el: HTMLElement = (await mount(ValueDetail, { id: 've-1' })).nativeElement;
    const sec = el.querySelector('[data-section="future"]') as HTMLElement;
    expect(sec.textContent).toContain('Contribution Units: 100');
    expect(q(sec, 'revenue-shares')?.querySelector('a')?.getAttribute('href')).toBe('/value/revenue/re-1');
    expect(q(sec, 'revenue-shares')?.textContent).toContain('0.1000 SOL');
  });

  it('says so when there are no shares', async () => {
    route({ '/value-events/ve-1': json(valueEvent()), '/proof': json({ receiptHash: 'h', root: 'r', txSignature: 't', verified: true }) });
    const el: HTMLElement = (await mount(ValueDetail, { id: 've-1' })).nativeElement;
    expect(q(el, 'no-revenue-shares')).not.toBeNull();
  });
});

describe('IdentityProfilePage rewards (V7)', () => {
  it('shows immediate and revenue rewards on two lines plus the total', async () => {
    route({
      '/identities/i1': json({
        id: 'i1', kind: 'HUMAN', displayName: 'Sebas', wallet: null, ownerId: null, operatorId: null, history: [],
        rewards: { confirmedLamports: 25_000_000, revenueLamports: 100_000_000, payouts: [] },
      }),
    });
    const el: HTMLElement = (await mount(IdentityProfilePage, { id: 'i1' })).nativeElement;
    expect(q(el, 'rewards-sol')?.textContent).toContain('0.0250 SOL');
    expect(q(el, 'rewards-revenue')?.textContent).toContain('0.1000 SOL');
    expect(q(el, 'rewards-total')?.textContent).toContain('0.1250 SOL');
  });
});
