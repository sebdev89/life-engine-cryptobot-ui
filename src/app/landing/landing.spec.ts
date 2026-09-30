import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { STAGE_MAP } from '../live/live-model';
import { FAILURE_LINE, LANDING_STAGES, Landing } from './landing';

describe('Landing (KAN-789)', () => {
  it('names the same eight stages, in the same order, as the execution model', () => {
    expect(LANDING_STAGES.map((s) => s.id)).toEqual(STAGE_MAP.map((s) => s.id));
  });

  it('renders the hero, both CTAs, the strip, the failure line and the footer — with no API call', async () => {
    const calls: string[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = ((u: string) => {
      calls.push(String(u));
      return Promise.reject(new Error('no network in the landing'));
    }) as typeof fetch;
    try {
      await TestBed.configureTestingModule({ imports: [Landing], providers: [provideRouter([])] }).compileComponents();
      const f = TestBed.createComponent(Landing);
      f.detectChanges();
      const el: HTMLElement = f.nativeElement;
      expect(el.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Agents can think. CryptoBot lets them safely act with money.');
      const ctas = [...el.querySelectorAll<HTMLAnchorElement>('.hero__cta a')];
      expect(ctas.map((a) => a.textContent?.trim())).toEqual(['Watch Trusted Execution', 'Open Control Tower']);
      expect(ctas.map((a) => a.getAttribute('href'))).toEqual(['/demo', '/tower']);
      expect(el.querySelectorAll('.strip__stage').length).toBe(8);
      expect(el.querySelector('.failure__line')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(FAILURE_LINE.join(' → '));
      expect(el.querySelector('.foot')?.textContent?.trim()).toBe('reference implementation · devnet · not a trading bot');
      expect(calls).toEqual([]);
    } finally {
      globalThis.fetch = original;
      TestBed.resetTestingModule();
    }
  });
});
