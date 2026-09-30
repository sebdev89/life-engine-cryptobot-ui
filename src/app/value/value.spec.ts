/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ValueList } from './value-list';
import { ValueDetail } from './value-detail';
import { ValueEvent } from '../value-events-api';
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
    expect(t).toContain('Not attributed in V1');
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

  it('shows a not-found message', async () => {
    route({ '/value-events/nope': json({ code: 'NOT_FOUND', message: 'x' }, 404) });
    const f = await mountDetail('nope');
    expect(f.nativeElement.textContent).toContain('No value event with this id.');
  });
});
