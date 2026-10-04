import { describe, expect, it } from 'vitest';
import snapshotJson from '../public-demo/snapshot.json';
import type { ReplaySnapshot } from '../public-demo/replay';
import { DICT } from './i18n-dict';
import { translate } from './i18n';
import { identiconCells, seedStream } from './identicon';
import { spokenHash } from './format';
import { buildTour, TourData } from '../tour/tour-model';
import { USE_CASES } from '../use-cases/use-cases';
import { POV_CHAIN } from '../pov/pov-chain';
import { TRUTH, TRUTH_ORDER } from './truth';

const s = snapshotJson as unknown as ReplaySnapshot;
const body = <T>(k: string): T => s.responses[k].body as T;

describe('i18n', () => {
  it('English and Spanish carry exactly the same keys', () => {
    const en = Object.keys(DICT.en).sort();
    const es = Object.keys(DICT.es).sort();
    expect(es.filter((k) => !DICT.en[k])).toEqual([]);
    expect(en.filter((k) => !DICT.es[k])).toEqual([]);
  });

  it('fills placeholders, falls back to English, then to the given fallback, then to the key', () => {
    expect(translate('es', 'tour.step', { n: 3, total: 9 })).toBe('Paso 3 de 9');
    expect(translate('en', 'tour.step', { n: 3, total: 9 })).toBe('Step 3 of 9');
    expect(translate('es', 'no.such.key', undefined, 'Fallback')).toBe('Fallback');
    expect(translate('es', 'no.such.key')).toBe('no.such.key');
  });

  it('the chain sentences and truth meanings in the dictionary are the ones the model states', () => {
    for (const l of POV_CHAIN) expect(DICT.en[`chain.${l.n}`]).toBe(l.says);
    for (const k of TRUTH_ORDER) expect(DICT.en[`truth.${k}.means`]).toBe(TRUTH[k].means);
  });

  it('the replay in Spanish has no untranslated key left', () => {
    const ev = body<{ id: string }[]>('GET /value-events')[0];
    const prop = body<{ proposal: unknown; audit: unknown[] }>('GET /proposals/37dc2047-6878-4c6f-ac97-ffac7a337ab2');
    const revId = body<{ id: string }[]>('GET /revenue-events')[0].id;
    const d: TourData = {
      proposal: prop.proposal as TourData['proposal'],
      audit: prop.audit as TourData['audit'],
      event: body(`GET /value-events/${ev.id}`),
      distribution: body(`GET /value-events/${ev.id}/distribution`),
      revenue: body(`GET /revenue-events/${revId}`),
      identity: body('GET /identities/dev-agent-17'),
    };
    const text = JSON.stringify(buildTour(d, (k, p) => translate('es', k, p)));
    expect(text).not.toMatch(/"tour\.[a-z0-9.]+"/);
    expect(text).toContain('no un swap');
    expect(text).toContain('rebalanceo');
  });

  it('every use case has a title and a line in both languages, and there are ten', () => {
    expect(USE_CASES.length).toBe(10);
    for (const id of USE_CASES) for (const l of ['en', 'es'] as const) {
      expect(DICT[l][`uc.${id}.title`], `${l} ${id}`).toBeTruthy();
      expect(DICT[l][`uc.${id}.line`], `${l} ${id}`).toBeTruthy();
    }
    expect(DICT.en['uc.badge']).toBe('ROADMAP — not built');
  });
});

describe('identicon and spoken hashes', () => {
  it('is deterministic, mirrored, and differs between wallets', () => {
    const a = identiconCells('Dq1m7tigPnMNrurH8xTTShjTbPQhFqhMA2X3zr3iZYCC');
    expect(identiconCells('Dq1m7tigPnMNrurH8xTTShjTbPQhFqhMA2X3zr3iZYCC')).toEqual(a);
    for (let row = 0; row < 5; row++) {
      expect(a.on[row * 5]).toBe(a.on[row * 5 + 4]);
      expect(a.on[row * 5 + 1]).toBe(a.on[row * 5 + 3]);
    }
    expect(a.hue).toBeGreaterThanOrEqual(160);
    expect(a.hue).toBeLessThan(256);
    expect(seedStream('a', 4)).not.toEqual(seedStream('b', 4));
  });

  it('reads a hash as its kind and both ends', () => {
    expect(spokenHash('sha256:0960c920bc100fcedd841921174871f30a692a32eb58e3213b4d5bcc341dfd50')).toBe('SHA-256 hash, starts 0960 c920, ends 341d fd50');
    expect(spokenHash('short')).toBe('short');
    expect(spokenHash(null)).toBe('none');
  });
});
