import { describe, expect, it } from 'vitest';
import { acceptanceStages, contributionSummary, short, statusClass, statusLabel } from './value-model';

describe('value-model', () => {
  it('never invents a check: no acceptance object means five unknowns, in the fixed order', () => {
    const rows = acceptanceStages({ acceptance: null });
    expect(rows.map((r) => r.label)).toEqual(['MERGED', 'BUILT', 'DEPLOYED', 'RUNNING', 'ACCEPTED']);
    expect(rows.every((r) => r.state === null)).toBe(true);
  });

  it('maps true, false and missing stages separately', () => {
    const rows = acceptanceStages({ acceptance: { stages: { MERGED: true, BUILT: true, DEPLOYED: false } } });
    expect(rows.map((r) => r.state)).toEqual([true, true, false, null, null]);
  });

  it('labels the two states honestly', () => {
    expect(statusLabel('RECORDED')).toContain('not anchored');
    expect(statusLabel('ANCHORED')).toContain('Solana');
    expect(statusClass('ANCHORED')).toBe('done');
    expect(statusClass('RECORDED')).toBe('active');
  });

  it('shortens hashes and counts kinds', () => {
    expect(short('sha256:' + 'ab'.repeat(32))).toBe('sha256:abababab…ababab');
    expect(short(null)).toBe('—');
    expect(
      contributionSummary({
        contributions: [
          { identityId: '1', displayName: 'a', kind: 'HUMAN', role: 'r', units: 50 },
          { identityId: '2', displayName: 'b', kind: 'AGENT', role: 'r', units: 50 },
        ],
      }),
    ).toEqual({ humans: 1, agents: 1 });
  });
});
