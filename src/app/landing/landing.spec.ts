import { afterEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { STAGE_MAP } from '../live/live-model';
import type { ValueEvent } from '../value-events-api';
import { FAILURE_LINE, LANDING_STAGES, Landing, pickProofEvent } from './landing';

const ev = (id: string, status: 'RECORDED' | 'ANCHORED', distribution = false): ValueEvent =>
  ({ id, status, distribution: distribution ? { status: 'COMPLETE', poolLamports: 1, confirmedLamports: 1 } : null }) as unknown as ValueEvent;

async function render(fetchImpl: typeof fetch): Promise<HTMLElement> {
  globalThis.fetch = fetchImpl;
  await TestBed.configureTestingModule({ imports: [Landing], providers: [provideRouter([])] }).compileComponents();
  const f = TestBed.createComponent(Landing);
  f.detectChanges();
  await f.whenStable();
  await new Promise((r) => setTimeout(r, 10));
  f.detectChanges();
  return f.nativeElement;
}

describe('Landing', () => {
  const original = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = original;
    TestBed.resetTestingModule();
  });

  it('names the same eight stages, in the same order, as the execution model', () => {
    expect(LANDING_STAGES.map((s) => s.id)).toEqual(STAGE_MAP.map((s) => s.id));
  });

  it('picks the newest anchored event, preferring one with a distribution', () => {
    expect(pickProofEvent([ev('a', 'RECORDED'), ev('b', 'ANCHORED'), ev('c', 'ANCHORED', true)])?.id).toBe('c');
    expect(pickProofEvent([ev('a', 'RECORDED'), ev('b', 'ANCHORED')])?.id).toBe('b');
    expect(pickProofEvent([ev('a', 'RECORDED')])).toBeNull();
  });

  it('renders the title, the sentence, the diagram, the CryptoBot case and the repo links', async () => {
    const el = await render((() => Promise.reject(new Error('offline'))) as typeof fetch);
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Proof of Value — Verifiable Value Creation on Solana');
    expect(el.querySelector('.hero__sub')?.textContent?.trim()).toBe('AI can create value. Proof of Value makes sure we remember who created it.');
    expect(el.querySelector('.diagram img')?.getAttribute('src')).toBe('proof-of-value.svg');
    expect(el.querySelector('.case__line')?.textContent).toContain('First real case: CryptoBot, an economic agent on Solana devnet');
    expect(el.querySelector('.case__line a')?.getAttribute('href')).toBe('/demo');
    const hrefs = [...el.querySelectorAll('a')].map((a) => a.getAttribute('href') ?? '');
    expect(hrefs.some((h) => h.endsWith('/life-engine-cryptobot-service'))).toBe(true);
    expect(hrefs.some((h) => h.endsWith('/life-engine-cryptobot-ui'))).toBe(true);
    expect(hrefs.some((h) => h.includes('#run-it-against-the-demo-stack'))).toBe(true);
    expect(el.querySelectorAll('.strip__stage').length).toBe(8);
    expect(el.querySelector('.failure__line')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(FAILURE_LINE.join(' → '));
  });

  it('"See a real proof" resolves to the anchored ValueEvent at runtime', async () => {
    const body = [ev('rec-1', 'RECORDED'), ev('ve-42', 'ANCHORED', true)];
    const el = await render((() => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }))) as typeof fetch);
    expect(el.querySelector('#see-proof')?.getAttribute('href')).toBe('/value/ve-42');
  });

  it('falls back to /value when the API is unreachable or unauthenticated', async () => {
    const off = await render((() => Promise.reject(new Error('offline'))) as typeof fetch);
    expect(off.querySelector('#see-proof')?.getAttribute('href')).toBe('/value');
    TestBed.resetTestingModule();
    const unauth = await render((() => Promise.resolve(new Response('', { status: 401 }))) as typeof fetch);
    expect(unauth.querySelector('#see-proof')?.getAttribute('href')).toBe('/value');
  });
});
