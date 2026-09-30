import { describe, expect, it } from 'vitest';
import { Sha256, hashBytes, inclusionProofValid, leafHash, renderHash, rootFromProof, webCryptoSha256 } from './merkle';

// Independent reference: a plain-JS SHA-256 (FIPS 180-4) and the whole tree built the way
// MerkleTree.of does (sorted leaves, 0x00/0x01 prefixes, odd node promoted), proofs like proofFor.
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);
function refSha(msg: Uint8Array): Uint8Array {
  const len = msg.length;
  const padded = new Uint8Array(((len + 9 + 63) >> 6) << 6);
  padded.set(msg);
  padded[len] = 0x80;
  const dv = new DataView(padded.buffer);
  dv.setUint32(padded.length - 4, len * 8);
  const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  for (let o = 0; o < padded.length; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      [h, g, f, e, d, c, b, a] = [g, f, e, (d + t1) >>> 0, c, b, a, (t1 + t2) >>> 0];
    }
    [a, b, c, d, e, f, g, h].forEach((v, i) => (H[i] = (H[i] + v) >>> 0));
  }
  const out = new Uint8Array(32);
  const odv = new DataView(out.buffer);
  H.forEach((v, i) => odv.setUint32(i * 4, v));
  return out;
}
const cat = (...parts: Uint8Array[]) => {
  const m = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    m.set(p, o);
    o += p.length;
  }
  return m;
};
const leaf = (h: string) => renderHash(refSha(cat(new Uint8Array([0]), hashBytes(h))));
const node = (l: string, r: string) => renderHash(refSha(cat(new Uint8Array([1]), hashBytes(l), hashBytes(r))));

function tree(hashes: string[]) {
  const leaves = [...new Set(hashes)].sort();
  const levels = [leaves.map(leaf)];
  while (levels[levels.length - 1].length > 1) {
    const lv = levels[levels.length - 1];
    const next: string[] = [];
    for (let i = 0; i < lv.length; i += 2) next.push(i + 1 < lv.length ? node(lv[i], lv[i + 1]) : lv[i]);
    levels.push(next);
  }
  const proofFor = (h: string) => {
    let idx = leaves.indexOf(h);
    const proof: string[] = [];
    for (let l = 0; l < levels.length - 1; l++) {
      const sib = idx % 2 === 0 ? idx + 1 : idx - 1;
      if (sib < levels[l].length) proof.push((idx % 2 === 0 ? 'R:' : 'L:') + levels[l][sib]);
      idx = Math.floor(idx / 2);
    }
    return proof;
  };
  return { root: levels[levels.length - 1][0], proofFor };
}

const h = (c: string) => 'sha256:' + c.repeat(64);
const RECEIPTS = [h('d'), h('a'), h('c'), h('b'), h('e')]; // 5 leaves: exercises the promoted odd node
const sha: Sha256 = webCryptoSha256()!;

describe('merkle — inclusion proof folded in the client', () => {
  it('WebCrypto is available in the test runtime, and the reference SHA-256 is right (FIPS "abc" vector)', () => {
    expect(sha).not.toBeNull();
    expect(renderHash(refSha(new TextEncoder().encode('abc')))).toBe('sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('leaf hash matches the reference (0x00 domain separation)', async () => {
    expect(await leafHash(h('a'), sha)).toBe(leaf(h('a')));
  });

  it('every receipt of a 5-leaf batch folds back to the root', async () => {
    const t = tree(RECEIPTS);
    for (const r of RECEIPTS) {
      expect(await rootFromProof(r, t.proofFor(r), sha)).toBe(t.root);
      expect(await inclusionProofValid(r, t.proofFor(r), t.root, sha)).toBe(true);
    }
  });

  it('a batch of one has root = leaf and an empty proof', async () => {
    const t = tree([h('f')]);
    expect(t.proofFor(h('f'))).toEqual([]);
    expect(await inclusionProofValid(h('f'), [], t.root, sha)).toBe(true);
  });

  it('rejects a tampered sibling, a swapped side, another receipt, and malformed steps', async () => {
    const t = tree(RECEIPTS);
    const proof = t.proofFor(h('c'));
    expect(await inclusionProofValid(h('c'), [proof[0].slice(0, 2) + h('9'), ...proof.slice(1)], t.root, sha)).toBe(false);
    const swapped = (proof[0].startsWith('L:') ? 'R:' : 'L:') + proof[0].slice(2);
    expect(await inclusionProofValid(h('c'), [swapped, ...proof.slice(1)], t.root, sha)).toBe(false);
    expect(await inclusionProofValid(h('7'), proof, t.root, sha)).toBe(false);
    expect(await inclusionProofValid(h('c'), ['X:' + h('1')], t.root, sha)).toBe(false);
  });

  it('answers null (not checked) when an input or the digest is missing', async () => {
    expect(await inclusionProofValid(null, [], h('a'), sha)).toBeNull();
    expect(await inclusionProofValid(h('a'), [], null, sha)).toBeNull();
    expect(await inclusionProofValid(h('a'), [], h('a'), null)).toBeNull();
  });
});
