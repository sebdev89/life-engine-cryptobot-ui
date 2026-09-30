import { describe, expect, it } from 'vitest';
import { acceptanceStages, contributionSummary, short, statusClass, statusLabel } from './value-model';

describe('value-model', () => {
  it('implies five passed stages when the API sends none', () => {
    const rows = acceptanceStages({ acceptance: null });
    expect(rows).toHaveLength(5);
    expect(rows.every((r) => r.ok && !r.reported)).toBe(true);
  });

  it('shows reported stages as reported, failures included', () => {
    const rows = acceptanceStages({ acceptance: { stages: { tests: true, review: false } } });
    expect(rows).toEqual([
      { label: 'tests', ok: true, reported: true },
      { label: 'review', ok: false, reported: true },
    ]);
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
