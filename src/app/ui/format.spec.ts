import { describe, expect, it } from 'vitest';
import { localDateTime, middle, slotLabel, utcStamp } from './format';
import { easeOut } from './count-up';
import { TRUTH, TRUTH_ORDER } from './truth';

describe('display helpers', () => {
  it('elides hashes in the middle and keeps the sha256: prefix', () => {
    expect(middle('sha256:0960c920bc100fcedd841921174871f30a692a32eb58e3213b4d5bcc341dfd50')).toBe('sha256:0960c920…341dfd50');
    expect(middle('5GEExMC7qDKaVcQYyA9ySVYuVQGLrkM2NbFoJQjwok6aANPD7iXtYWLtQLybXdJ1zVDLK4XqbFHXcu8zRotumfdB', 6, 6)).toBe('5GEExM…tumfdB');
    expect(middle('short')).toBe('short');
    expect(middle(null)).toBe('—');
  });

  it('local time carries a time zone; UTC stamp is exact; slots are grouped', () => {
    expect(localDateTime('2026-10-03T21:25:16Z', 'en-US')).toMatch(/2026/);
    expect(localDateTime('nope')).toBe('—');
    expect(utcStamp('2026-10-03T21:25:16Z')).toBe('2026-10-03 21:25:16 UTC');
    expect(utcStamp('2026-10-03T21:25:16.123Z')).toBe('2026-10-03 21:25:16 UTC');
    expect(slotLabel(507246166)).toBe('507,246,166');
    expect(slotLabel(null)).toBe('—');
  });

  it('the counter lands exactly on its value', () => {
    expect(easeOut(0)).toBe(0);
    expect(easeOut(1)).toBe(1);
    expect(easeOut(2)).toBe(1);
  });

  it('every truth label has a one-sentence meaning and the legend lists all five', () => {
    expect(TRUTH_ORDER).toEqual(['onchain', 'recorded', 'declared', 'simulated', 'estimated']);
    for (const k of TRUTH_ORDER) expect(TRUTH[k].means).toMatch(/\.$/);
  });
});
