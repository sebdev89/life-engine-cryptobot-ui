import { describe, expect, it } from 'vitest';
import { AnchorVerification } from '../receipts-api';
import { anchorState, pickMember, proofLinkOf, shortHex, verificationChecks } from './proof-model';

// POST /anchors/sha256:a605…6a1f/verify on cryptobot-demo-main (local validator), 2026-09-30.
const VERIFIED: AnchorVerification = {
  root: 'sha256:a60533998c19247079f4178d10588b40b482d9ec0515014f6ad7a6d9f91b6a1f',
  status: 'FINALIZED',
  receiptCount: 7,
  memberCount: 7,
  recomputedRoot: 'sha256:a60533998c19247079f4178d10588b40b482d9ec0515014f6ad7a6d9f91b6a1f',
  rootMatches: true,
  countMatches: true,
  proofsValid: true,
  memoMatches: true,
  memo: 'ir/1 root=sha256:a605… n=7 ts=2026-09-30T03:07:30Z',
  tx: '3dpg1tHP…',
  slot: 4228,
  explorerUrl: null,
  onChain: { checked: true, found: true, failed: false, memoMatches: true, slot: 4228, error: null },
  valid: true,
};

describe('proof-model', () => {
  it('anchorState maps batch statuses to UI states', () => {
    expect(anchorState('FINALIZED')).toBe('done');
    expect(anchorState('SUBMITTED')).toBe('active');
    expect(anchorState('PENDING')).toBe('active');
    expect(anchorState('FAILED')).toBe('failed');
    expect(anchorState('ABANDONED')).toBe('failed');
    expect(anchorState(null)).toBe('pending');
  });

  it('verificationChecks lists the server answer in order, all green for the demo anchor', () => {
    const c = verificationChecks(VERIFIED);
    expect(c.map((x) => x.id)).toEqual(['rootMatches', 'countMatches', 'proofsValid', 'memoMatches', 'onChain.found', 'valid']);
    expect(c.every((x) => x.ok === true)).toBe(true);
    expect(c.find((x) => x.id === 'onChain.found')?.detail).toContain('slot 4228');
  });

  it('an unqueried chain is null, not false; an RPC error is a failure with its message', () => {
    expect(verificationChecks({ ...VERIFIED, onChain: null }).find((x) => x.id === 'onChain.found')?.ok).toBeNull();
    const err = verificationChecks({ ...VERIFIED, valid: false, onChain: { checked: true, found: false, failed: true, memoMatches: false, slot: null, error: 'rpc down' } });
    const on = err.find((x) => x.id === 'onChain.found')!;
    expect(on.ok).toBe(false);
    expect(on.detail).toBe('rpc down');
    expect(err.find((x) => x.id === 'valid')?.ok).toBe(false);
  });

  it('pickMember honours ?receipt= only when it is in the batch', () => {
    const d = { myReceipts: [{ root: 'r', receiptHash: 'a', proof: [] }, { root: 'r', receiptHash: 'b', proof: [] }] };
    expect(pickMember(d, 'b')).toBe('b');
    expect(pickMember(d, 'zzz')).toBe('a');
    expect(pickMember(d, null)).toBe('a');
    expect(pickMember({ myReceipts: [] }, 'a')).toBeNull();
    expect(pickMember(null, 'a')).toBeNull();
  });

  it('shortHex trims the prefix and the middle', () => {
    expect(shortHex(VERIFIED.root)).toBe('a6053399…6a1f');
    expect(shortHex('abc')).toBe('abc');
    expect(shortHex(null)).toBe('—');
  });

  it('proofLinkOf prefers the batch, falls back to the receipt anchor, and is null before anchoring', () => {
    const receipt = { receiptHash: 'sha256:r', anchor: { root: 'sha256:fromReceipt' } } as never;
    expect(proofLinkOf({ batch: { root: 'sha256:batch' } as never, receipt })).toEqual({ root: 'sha256:batch', receipt: 'sha256:r' });
    expect(proofLinkOf({ batch: null, receipt })).toEqual({ root: 'sha256:fromReceipt', receipt: 'sha256:r' });
    expect(proofLinkOf({ batch: null, receipt: { receiptHash: 'sha256:r', anchor: null } as never })).toBeNull();
    expect(proofLinkOf(null)).toBeNull();
  });
});
