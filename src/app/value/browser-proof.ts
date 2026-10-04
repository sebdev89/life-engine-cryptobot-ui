import { Sha256, inclusionProofValid, rootFromProof, webCryptoSha256 } from '../merkle';
import { ValueProof } from '../value-events-api';

/** What the browser itself concluded about a ValueEvent's Merkle inclusion. */
export interface BrowserProofCheck {
  /** true/false when folded here; null when it could not be checked (reason says why) */
  valid: boolean | null;
  computedRoot: string | null;
  steps: number;
  reason?: string;
}

interface AnchorPart {
  root?: string | null;
  proof?: readonly string[] | null;
}

/**
 * Recomputes `receipt ∈ root` from the proof response with the service's own scheme (merkle.ts):
 * leaf = SHA-256(0x00‖h), node = SHA-256(0x01‖l‖r). The root must equal BOTH the root in the
 * proof and the one the event says was anchored (`expectedRoot`, the memo of the Solana tx).
 */
export async function browserProofCheck(
  p: ValueProof,
  expectedRoot: string | null,
  sha: Sha256 | null = webCryptoSha256(),
): Promise<BrowserProofCheck> {
  const anchor = (p['anchor'] ?? null) as AnchorPart | null;
  const path = anchor?.proof ?? null;
  const root = anchor?.root ?? p.root ?? null;
  if (!sha) return { valid: null, computedRoot: null, steps: 0, reason: 'no WebCrypto in this context' };
  if (!p.receiptHash || !path || !root) return { valid: null, computedRoot: null, steps: 0, reason: 'the proof has no Merkle path' };
  let computedRoot: string | null = null;
  try {
    computedRoot = await rootFromProof(p.receiptHash, path, sha);
  } catch {
    return { valid: false, computedRoot: null, steps: path.length, reason: 'malformed proof step' };
  }
  const ok = (await inclusionProofValid(p.receiptHash, path, root, sha)) === true && (!expectedRoot || computedRoot === expectedRoot);
  return { valid: ok, computedRoot, steps: path.length };
}
