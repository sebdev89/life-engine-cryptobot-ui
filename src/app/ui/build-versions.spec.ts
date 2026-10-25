import { describe, expect, it } from 'vitest';
import { versionLine } from './build-versions';

describe('versionLine (KAN-1359)', () => {
  it('shows both commits', () => {
    expect(versionLine({ ui: { commit: '0a75af6' } }, { commit: '8af0831' })).toBe('UI 0a75af6 · service 8af0831');
  });
  it('marks a side that did not answer, or answered without a commit, with ?', () => {
    expect(versionLine(null, { commit: '8af0831' })).toBe('UI ? · service 8af0831');
    expect(versionLine({ ui: { commit: '0a75af6' } }, null)).toBe('UI 0a75af6 · service ?');
    expect(versionLine({ ui: {} }, { commit: 'unknown' })).toBe('UI ? · service ?');
  });
});
