/**
 * Client-side inclusion proof for the receipt anchors (KAN-784, PROVE stage). Same fixed scheme as
 * `MerkleTree` in cryptobot-service, reimplemented here so the browser checks
 * `receipt ∈ root` on its own instead of trusting a boolean from the server:
 *
 *   leaf(h) = SHA-256(0x00 ‖ bytes32(h))
 *   node    = SHA-256(0x01 ‖ bytes32(left) ‖ bytes32(right))
 *   proof   = siblings from the leaf up, "L:" (sibling is the left input) or "R:"
 *
 * Hashes are rendered `sha256:<64 hex>`. The digest function is injectable so tests can run it
 * against an independent implementation; the default is WebCrypto (secure contexts only —
 * `localhost` is one; elsewhere `inclusionProofValid` answers `null`, i.e. "not checked").
 */
const PREFIX = 'sha256:';
const HASH_RE = /^sha256:[0-9a-f]{64}$/;

export type Sha256 = (bytes: Uint8Array) => Promise<Uint8Array>;

export function hashBytes(hash: string): Uint8Array {
  if (!HASH_RE.test(hash)) throw new Error(`not a sha256 hash: ${hash}`);
  const hex = hash.slice(PREFIX.length);
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function renderHash(bytes: Uint8Array): string {
  return PREFIX + Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function webCryptoSha256(): Sha256 | null {
  const subtle = (globalThis.crypto as Crypto | undefined)?.subtle;
  if (!subtle) return null;
  return async (bytes) => new Uint8Array(await subtle.digest('SHA-256', bytes as BufferSource));
}

async function prefixed(sha: Sha256, prefix: number, ...parts: Uint8Array[]): Promise<string> {
  const m = new Uint8Array(1 + parts.reduce((n, p) => n + p.length, 0));
  m[0] = prefix;
  let o = 1;
  for (const p of parts) {
    m.set(p, o);
    o += p.length;
  }
  return renderHash(await sha(m));
}

export function leafHash(receiptHash: string, sha: Sha256): Promise<string> {
  return prefixed(sha, 0x00, hashBytes(receiptHash));
}

export function nodeHash(left: string, right: string, sha: Sha256): Promise<string> {
  return prefixed(sha, 0x01, hashBytes(left), hashBytes(right));
}

/** Folds the proof over the leaf: the root a verifier compares with the one in the memo tx. */
export async function rootFromProof(receiptHash: string, proof: readonly string[], sha: Sha256): Promise<string> {
  let current = await leafHash(receiptHash, sha);
  for (const step of proof) {
    const side = step.slice(0, 2).toUpperCase();
    const sibling = step.slice(2);
    if (side === 'L:') current = await nodeHash(sibling, current, sha);
    else if (side === 'R:') current = await nodeHash(current, sibling, sha);
    else throw new Error(`malformed proof step: ${step}`);
  }
  return current;
}

/** true/false when checked; null when it cannot be checked here (no WebCrypto, missing input). */
export async function inclusionProofValid(
  receiptHash: string | null | undefined,
  proof: readonly string[] | null | undefined,
  root: string | null | undefined,
  sha: Sha256 | null = webCryptoSha256(),
): Promise<boolean | null> {
  if (!receiptHash || !proof || !root || !sha) return null;
  try {
    return (await rootFromProof(receiptHash, proof, sha)) === root;
  } catch {
    return false;
  }
}
