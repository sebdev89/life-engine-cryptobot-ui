import { describe, expect, it } from 'vitest';
import { SwapView } from '../swaps-api';
import { actions, explorerTx, fromBaseUnits, previewSummary, reasonText, toBaseUnits, windowLeft } from './swaps-model';

const base: SwapView = {
  id: 'o1', status: 'PENDING_APPROVAL', direction: 'SOL_USDC', cluster: 'mainnet-beta', owner: 'Own', inAmount: 50_000_000,
  minOut: 7_400_000, maxSlippageBps: 50, previewHash: 'h', preview: '{}', createdBy: 'u', approvedBy: null, approvedAt: null,
  expiresAt: '2026-10-25T12:02:00Z', txSignature: null, error: null, createdAt: '2026-10-25T12:00:00Z', approvalNonce: 'n',
};
const NOW = Date.parse('2026-10-25T12:00:30Z');

describe('swaps model (KAN-1249)', () => {
  it('converts amounts to base units exactly, and refuses what it cannot represent', () => {
    expect(toBaseUnits('0.05', 9)).toBe(50_000_000);
    expect(toBaseUnits('10', 6)).toBe(10_000_000);
    expect(toBaseUnits('0.000000001', 9)).toBe(1);
    expect(toBaseUnits('0.0000000001', 9)).toBeNull();
    expect(toBaseUnits('0', 9)).toBeNull();
    expect(toBaseUnits('-1', 9)).toBeNull();
    expect(toBaseUnits('1e3', 9)).toBeNull();
    expect(toBaseUnits(' 1.5 ', 6)).toBe(1_500_000);
    expect(fromBaseUnits(50_000_000, 9)).toBe('0.05');
    expect(fromBaseUnits(7_400_000, 6)).toBe('7.4');
    expect(fromBaseUnits(1, 9)).toBe('0.000000001');
  });

  it('reads the quote and the simulation out of the preview, and survives a broken one', () => {
    const p = previewSummary(JSON.stringify({ quote: { outAmount: '7438000', priceImpactPct: '0.0001', routePlan: [{ swapInfo: { label: 'Whirlpool' } }] },
      simulation: { ok: true, units: 61000 } }));
    expect(p).toEqual({ quotedOut: 7_438_000, priceImpactPct: '0.0001', route: ['Whirlpool'], simulationOk: true, computeUnits: 61000 });
    expect(previewSummary('not json').simulationOk).toBeNull();
  });

  it('offers approve only to the approver inside the window, execute only when approved', () => {
    expect(actions(base, NOW)).toEqual({ approve: true, reject: true, execute: false, reconcile: false });
    expect(actions({ ...base, approvalNonce: null }, NOW).approve).toBe(false);
    expect(actions(base, Date.parse('2026-10-25T12:03:00Z')).approve).toBe(false);
    expect(actions({ ...base, status: 'APPROVED' }, NOW)).toEqual({ approve: false, reject: false, execute: true, reconcile: false });
    expect(actions({ ...base, status: 'UNKNOWN_SENT' }, NOW).reconcile).toBe(true);
    expect(actions({ ...base, status: 'CONFIRMED' }, NOW)).toEqual({ approve: false, reject: false, execute: false, reconcile: false });
  });

  it('counts down the window and links the explorer per cluster', () => {
    expect(windowLeft(base.expiresAt, NOW)).toBe('1:30');
    expect(windowLeft(base.expiresAt, Date.parse('2026-10-25T12:05:00Z'))).toBeNull();
    expect(explorerTx('5sig', 'mainnet-beta')).toBe('https://explorer.solana.com/tx/5sig');
    expect(explorerTx('5sig', 'devnet')).toBe('https://explorer.solana.com/tx/5sig?cluster=devnet');
    expect(reasonText('swaps_disabled')).toContain('off');
    expect(reasonText('weird_new_reason')).toBe('weird_new_reason');
  });
});
