/**
 * The Proof of Value chain, in the order the guided replay walks it. "Strategist", "Guardian" and
 * "Operator" are role names for parts of the pipeline, not separate AI agents: each sentence says
 * what actually does the job in this run (no claim the recording cannot back).
 */
export interface ChainLink {
  /** 1-based position; it is also the `?step=` of the guided replay */
  n: number;
  id: string;
  name: string;
  /** one sentence a visitor can read in the tooltip */
  says: string;
}

export const POV_CHAIN: readonly ChainLink[] = [
  { n: 1, id: 'intent', name: 'Intent', says: 'What the agent wants done, stated before anything moves.' },
  { n: 2, id: 'strategist', name: 'Strategist', says: 'A deterministic planner turns the intent into exact amounts and simulates the transaction.' },
  { n: 3, id: 'guardian', name: 'Guardian', says: 'Policy rules under a versioned hash decide whether it may proceed, and with which safeguards.' },
  { n: 4, id: 'operator', name: 'Operator', says: 'A human approves, an independent validator re-checks, an isolated signer signs only those bytes.' },
  { n: 5, id: 'solana', name: 'Solana', says: 'The transaction is broadcast and finalized on Solana devnet.' },
  { n: 6, id: 'acceptance', name: 'AcceptanceProof', says: 'Software counts only once it is merged, built, deployed, running and accepted.' },
  { n: 7, id: 'value-event', name: 'ValueEvent', says: 'The accepted outcome becomes a signed receipt whose Merkle root is written to Solana.' },
  { n: 8, id: 'units', name: 'Contribution Units', says: 'Units record who contributed: humans, agents, compute and knowledge. Not equity, not a token.' },
  { n: 9, id: 'reward', name: 'Reward & Reputation', says: 'Contributors are paid on Solana by units, and each identity keeps plain counts of accepted outcomes.' },
];

/** `?step=` → a valid step (1…9); anything else is step 1. */
export function clampStep(raw: string | number | null | undefined): number {
  const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n)) return 1;
  return Math.min(POV_CHAIN.length, Math.max(1, Math.trunc(n)));
}
