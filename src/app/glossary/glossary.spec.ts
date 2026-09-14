import { describe, expect, it } from 'vitest';
import { GLOSSARY, GLOSSARY_CATEGORIES } from './glossary-data';
import { filterGlossary, normalize } from './glossary';

describe('glossary data', () => {
  it('has no empty terms or definitions and only known categories', () => {
    const cats = new Set<string>(GLOSSARY_CATEGORIES);
    for (const e of GLOSSARY) {
      expect(e.term.trim().length, e.term).toBeGreaterThan(0);
      expect(e.definition.trim().length, e.term).toBeGreaterThan(0);
      expect(cats.has(e.category), `${e.term} → ${e.category}`).toBe(true);
    }
  });

  it('has unique terms (case-insensitive)', () => {
    const seen = new Map<string, string>();
    const dupes: string[] = [];
    for (const e of GLOSSARY) {
      const k = e.term.toLowerCase();
      if (seen.has(k)) dupes.push(e.term);
      seen.set(k, e.term);
    }
    expect(dupes).toEqual([]);
  });

  it('covers every category with at least one entry', () => {
    for (const c of GLOSSARY_CATEGORIES) {
      expect(GLOSSARY.some((e) => e.category === c), c).toBe(true);
    }
  });
});

describe('normalize', () => {
  it('strips accents and case', () => {
    expect(normalize('  Criptografía y PoW ')).toBe('criptografia y pow');
  });
});

describe('filterGlossary', () => {
  it('returns everything sorted when query is empty', () => {
    const all = filterGlossary(GLOSSARY, '', null);
    expect(all.length).toBe(GLOSSARY.length);
    const terms = all.map((e) => e.term);
    const sorted = [...terms].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
    expect(terms).toEqual(sorted);
  });

  it('ranks exact term match first, then prefix, then substring, then definition', () => {
    const r = filterGlossary(GLOSSARY, 'PDA', null);
    expect(r[0].term).toBe('PDA');
    const idx = (t: string) => r.findIndex((e) => e.term === t);
    expect(idx('signer PDA')).toBeGreaterThan(0); // substring in term
    expect(idx('seed')).toBeGreaterThan(idx('signer PDA')); // only in definition
  });

  it('is accent- and case-insensitive', () => {
    expect(filterGlossary(GLOSSARY, 'criptografia', null).length).toBeGreaterThan(0);
    expect(filterGlossary(GLOSSARY, 'BLOCKHASH', null)[0].term).toBe('blockhash');
  });

  it('restricts to a category', () => {
    const r = filterGlossary(GLOSSARY, '', 'Rust y Anchor');
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((e) => e.category === 'Rust y Anchor')).toBe(true);
  });

  it('returns empty for nonsense', () => {
    expect(filterGlossary(GLOSSARY, 'zzzzqqqq', null)).toEqual([]);
  });
});
