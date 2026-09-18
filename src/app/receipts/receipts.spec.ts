import { describe, expect, it } from 'vitest';
import { IntelligenceReceipt, anchorLabel, explorerTxUrl, shortHash, shortSig, sortReceipts } from '../receipts-api';

const HASH = 'sha256:' + 'ab'.repeat(32);
const TX = '5VERYLONGSIGNATUREBASE58xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

function receipt(kind: string, createdAt: string, anchor: IntelligenceReceipt['anchor'] = null): IntelligenceReceipt {
  return {
    receiptHash: 'sha256:' + kind.toLowerCase().padEnd(64, '0').slice(0, 64),
    body: {
      kind,
      agentId: 'agent@1',
      reproducibility: 'L0_SIGNED',
      parents: [],
      model: null,
      engine: null,
      runtime: null,
      output: { hash: HASH, schema: 'x/1' },
      completedAt: createdAt,
    },
    signature: { alg: 'ed25519', keyId: 'k' },
    anchor,
    createdAt,
  };
}

describe('explorerTxUrl', () => {
  it('links devnet anchors with ?cluster=devnet and mainnet ones without, like SolanaCluster.explorerTxUrl', () => {
    expect(explorerTxUrl('solana-devnet', TX)).toBe(`https://explorer.solana.com/tx/${TX}?cluster=devnet`);
    expect(explorerTxUrl('solana-mainnet-beta', TX)).toBe(`https://explorer.solana.com/tx/${TX}`);
    expect(explorerTxUrl('SOLANA-DEVNET', TX)).toBe(`https://explorer.solana.com/tx/${TX}?cluster=devnet`);
  });

  it('has no link without a chain, without a tx, or for a chain that is not Solana', () => {
    expect(explorerTxUrl(null, TX)).toBeNull();
    expect(explorerTxUrl('solana-devnet', null)).toBeNull();
    expect(explorerTxUrl('ethereum', TX)).toBeNull();
  });
});

describe('anchorLabel', () => {
  it('says what the receipt can prove today', () => {
    expect(anchorLabel(null)).toBe('not anchored yet');
    expect(anchorLabel({ chain: 'solana-devnet', tx: TX, slot: 4242, root: HASH, proof: [] })).toBe('anchored · devnet · slot 4242');
    expect(anchorLabel({ chain: 'solana-devnet', tx: TX, slot: null, root: HASH, proof: [] })).toBe('anchored · devnet');
  });
});

describe('shortHash / shortSig', () => {
  it('keeps the prefix and both ends, and never throws on empty', () => {
    expect(shortHash(HASH)).toBe('sha256:ababab…abab');
    expect(shortHash('plain')).toBe('plain…lain');
    expect(shortHash(null)).toBe('—');
    expect(shortSig(TX)).toBe(`${TX.slice(0, 8)}…${TX.slice(-6)}`);
    expect(shortSig(undefined)).toBe('—');
  });
});

describe('sortReceipts', () => {
  it('orders by time, then by the pipeline order of kinds, without mutating the input', () => {
    const t = '2026-09-18T03:00:00Z';
    const input = [receipt('RISK_DECISION', t), receipt('WALLET_SNAPSHOT', t), receipt('EXECUTION', '2026-09-18T03:05:00Z'), receipt('STRATEGY', t)];
    const copy = [...input];
    expect(sortReceipts(input).map((r) => r.body.kind)).toEqual(['WALLET_SNAPSHOT', 'RISK_DECISION', 'STRATEGY', 'EXECUTION']);
    expect(input).toEqual(copy);
    expect(sortReceipts([receipt('UNKNOWN_KIND', t), receipt('SIMULATION', t)]).map((r) => r.body.kind)).toEqual(['SIMULATION', 'UNKNOWN_KIND']);
  });
});
