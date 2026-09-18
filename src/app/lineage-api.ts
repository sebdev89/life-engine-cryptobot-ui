/**
 * Client + pure helpers for the provenance DAG (KAN-393, Endgame §7 / §15):
 * `/api/cryptobot/proposals/{id}/lineage`, `/receipts/{hash}/lineage|parents|children|reused-by`,
 * `/receipts/{hash}` and `POST /receipts/{hash}/verify`. Shapes mirror the Java records one-to-one.
 *
 * `layoutLineage` is the only computation here: a layered layout of the DAG (parents above
 * children) for the SVG in the lineage component. It is pure so it can be unit-tested without a DOM.
 */
import { apiFetch, throwHttp } from './cryptobot-api';

export type ReproducibilityLevel = 'L0_SIGNED' | 'L1_REPRODUCIBLE' | 'L2_CHALLENGED' | 'L3_PROVEN';
export type EdgeRole = 'DERIVES_FROM' | 'VALIDATES' | 'EXECUTES' | 'REUSES';
export type LineageDirection = 'ANCESTORS' | 'DESCENDANTS' | 'BOTH';

export interface LineageNode {
  receiptHash: string;
  kind: string;
  agentId: string;
  level: ReproducibilityLevel;
  depth: number;
  createdAt: string;
  startedAt: string;
  completedAt: string;
  model: { ref: string; provider: string | null; providerDigest: string | null } | null;
  engine: { id: string; version: string; weightsHash: string | null } | null;
  compute: { units: number; inputTokens: number | null; outputTokens: number | null; wallMs: number | null } | null;
  cost: { usd: string; priceTableVersion: string | null } | null;
  anchor: { chain: string; tx: string; slot: number | null; root: string | null; explorerUrl: string | null } | null;
  runId: string | null;
  outputHash: string;
  outputSchema: string | null;
  keyId: string;
  parentCount: number;
  childCount: number;
  refs: { walletId: string | null; proposalId: string | null; snapshotId: string | null } | null;
}

export interface LineageEdge {
  childHash: string;
  parentHash: string;
  role: EdgeRole;
}

export interface LineageSummary {
  nodes: number;
  edges: number;
  computeUnits: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: string | null;
  priceTableVersion: string | null;
  anchored: number;
  reused: number;
  byLevel: Record<string, number>;
  byKind: Record<string, number>;
}

export interface LineageGraph {
  roots: string[];
  direction: LineageDirection;
  maxDepth: number;
  truncated: boolean;
  lineageRoots: string[];
  nodes: LineageNode[];
  edges: LineageEdge[];
  summary: LineageSummary;
}

export interface LineageNeighbour {
  role: EdgeRole;
  node: LineageNode;
}

/** `GET /receipts/{hash}`: the stored record plus its edges. Only what the detail card shows is typed. */
export interface ReceiptView {
  receipt: {
    receiptHash: string;
    domain: string;
    body: Record<string, unknown> & {
      kind: string;
      agentId: string;
      parents: string[];
      inputs: { type: string; hash: string }[];
      promptHash?: string;
      nonce: string;
      reproducibility: ReproducibilityLevel;
    };
    canonicalJson: string;
    signature: { alg: string; keyId: string; signatureBase64: string };
    anchor: { chain: string; tx: string; slot: number | null; root: string | null; proof: string[] } | null;
    createdAt: string;
  };
  parents: LineageEdge[];
  children: LineageEdge[];
}

/** `POST /receipts/{hash}/verify`: one boolean per check. `reproduced` is null unless the receipt is L1. */
export interface Verification {
  receiptHash: string;
  valid: boolean;
  hashMatchesCanonical: boolean;
  bodyMatchesCanonical: boolean;
  signatureValid: boolean;
  keyId: string | null;
  parentsPresent: boolean;
  level: ReproducibilityLevel;
  reproduced: boolean | null;
  reproduction?: { reason: string; [k: string]: unknown } | null;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    return throwHttp(res);
  }
  return (await res.json()) as T;
}

export function getProposalLineage(proposalId: string, depth = 16): Promise<LineageGraph> {
  return apiFetch(`/proposals/${proposalId}/lineage?depth=${depth}`).then((r) => json<LineageGraph>(r));
}

export function getReceiptLineage(receiptHash: string, direction: LineageDirection = 'BOTH', depth = 16): Promise<LineageGraph> {
  return apiFetch(`/receipts/${receiptHash}/lineage?direction=${direction.toLowerCase()}&depth=${depth}`).then((r) =>
    json<LineageGraph>(r),
  );
}

export function getReceiptParents(receiptHash: string): Promise<LineageNeighbour[]> {
  return apiFetch(`/receipts/${receiptHash}/parents`).then((r) => json<LineageNeighbour[]>(r));
}

export function getReceiptChildren(receiptHash: string): Promise<LineageNeighbour[]> {
  return apiFetch(`/receipts/${receiptHash}/children`).then((r) => json<LineageNeighbour[]>(r));
}

export function getReusedBy(receiptHash: string): Promise<LineageNeighbour[]> {
  return apiFetch(`/receipts/${receiptHash}/reused-by`).then((r) => json<LineageNeighbour[]>(r));
}

export function getReceipt(receiptHash: string): Promise<ReceiptView> {
  return apiFetch(`/receipts/${receiptHash}`).then((r) => json<ReceiptView>(r));
}

export function verifyReceipt(receiptHash: string): Promise<Verification> {
  return apiFetch(`/receipts/${receiptHash}/verify`, { method: 'POST' }).then((r) => json<Verification>(r));
}

// ---- layout ---------------------------------------------------------------------------------

export interface LaidOutNode {
  node: LineageNode;
  /** Topological layer: 0 = no parent inside the graph (the lineage root); parents always sit above children. */
  layer: number;
  x: number;
  y: number;
}

export interface LaidOutEdge {
  edge: LineageEdge;
  /** SVG path from the parent's bottom centre to the child's top centre. */
  path: string;
  labelX: number;
  labelY: number;
}

export interface LineageLayout {
  width: number;
  height: number;
  nodes: LaidOutNode[];
  edges: LaidOutEdge[];
}

export const NODE_W = 172;
export const NODE_H = 64;
const COL_GAP = 28;
const ROW_GAP = 56;
const PAD = 16;

/**
 * Layered layout of the DAG. Layer = 1 + max(layer of parents present in the graph), roots at 0
 * (a DAG has no cycles, so the recursion terminates; the graph is bounded by the API's depth cap).
 * Within a layer, nodes are ordered by the mean x of their parents (one barycenter pass) so the
 * usual pipeline — snapshot → idea → analysis → strategy → risk/simulation → execution — reads
 * top-down with few crossings. Coordinates are SVG user units.
 */
export function layoutLineage(nodes: readonly LineageNode[], edges: readonly LineageEdge[]): LineageLayout {
  const known = new Set(nodes.map((n) => n.receiptHash));
  const parentsOf = new Map<string, string[]>();
  for (const e of edges) {
    if (known.has(e.childHash) && known.has(e.parentHash)) {
      parentsOf.set(e.childHash, [...(parentsOf.get(e.childHash) ?? []), e.parentHash]);
    }
  }
  const layerOf = new Map<string, number>();
  const visiting = new Set<string>();
  const layer = (hash: string): number => {
    const cached = layerOf.get(hash);
    if (cached !== undefined) return cached;
    if (visiting.has(hash)) return 0; // defensive: a cycle cannot exist in a content-addressed DAG
    visiting.add(hash);
    const parents = parentsOf.get(hash) ?? [];
    const l = parents.length ? 1 + Math.max(...parents.map(layer)) : 0;
    visiting.delete(hash);
    layerOf.set(hash, l);
    return l;
  };
  const byLayer = new Map<number, LineageNode[]>();
  for (const n of [...nodes].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.kind.localeCompare(b.kind))) {
    const l = layer(n.receiptHash);
    byLayer.set(l, [...(byLayer.get(l) ?? []), n]);
  }
  const layers = [...byLayer.keys()].sort((a, b) => a - b);
  const widest = Math.max(1, ...layers.map((l) => byLayer.get(l)!.length));
  const width = PAD * 2 + widest * NODE_W + (widest - 1) * COL_GAP;

  const placed = new Map<string, LaidOutNode>();
  const out: LaidOutNode[] = [];
  for (const l of layers) {
    let row = byLayer.get(l)!;
    if (l > 0) {
      const bary = (n: LineageNode): number => {
        const xs = (parentsOf.get(n.receiptHash) ?? []).map((p) => placed.get(p)?.x).filter((x): x is number => x !== undefined);
        return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : Number.MAX_SAFE_INTEGER;
      };
      row = [...row].sort((a, b) => bary(a) - bary(b) || a.createdAt.localeCompare(b.createdAt));
    }
    const rowWidth = row.length * NODE_W + (row.length - 1) * COL_GAP;
    const x0 = (width - rowWidth) / 2;
    row.forEach((n, i) => {
      const ln: LaidOutNode = { node: n, layer: l, x: x0 + i * (NODE_W + COL_GAP), y: PAD + l * (NODE_H + ROW_GAP) };
      placed.set(n.receiptHash, ln);
      out.push(ln);
    });
  }
  const height = PAD * 2 + layers.length * NODE_H + Math.max(0, layers.length - 1) * ROW_GAP;

  const laidEdges: LaidOutEdge[] = [];
  for (const e of edges) {
    const parent = placed.get(e.parentHash);
    const child = placed.get(e.childHash);
    if (!parent || !child) continue;
    const x1 = parent.x + NODE_W / 2;
    const y1 = parent.y + NODE_H;
    const x2 = child.x + NODE_W / 2;
    const y2 = child.y;
    const my = (y1 + y2) / 2;
    laidEdges.push({
      edge: e,
      path: `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`,
      labelX: (x1 + x2) / 2,
      labelY: my,
    });
  }
  return { width, height, nodes: out, edges: laidEdges };
}

// ---- formatting -----------------------------------------------------------------------------

/** `sha256:9f3a…c1e2` — enough to recognise a hash on a slide, never enough to confuse two. */
export function shortHash(hash: string | null | undefined, chars = 6): string {
  if (!hash) return '—';
  const [prefix, hex] = hash.includes(':') ? hash.split(':', 2) : ['', hash];
  if (hex.length <= chars * 2) return hash;
  return `${prefix ? prefix + ':' : ''}${hex.slice(0, chars)}…${hex.slice(-chars)}`;
}

/** `L1_REPRODUCIBLE` → `L1`. */
export function levelTag(level: string | null | undefined): string {
  return level ? level.split('_')[0] : '—';
}

/** What ran: the deterministic engine (with version) or the model the provider named. */
export function producerLabel(n: Pick<LineageNode, 'model' | 'engine' | 'agentId'>): string {
  if (n.engine) return `${n.engine.id}@${n.engine.version}`;
  if (n.model) return n.model.ref;
  return n.agentId;
}

/** Compute as measured: tokens for an LLM step, units for the rest; nothing invented. */
export function computeLabel(n: Pick<LineageNode, 'compute'>): string {
  const c = n.compute;
  if (!c) return 'not measured';
  if (c.inputTokens !== null || c.outputTokens !== null) {
    return `${c.inputTokens ?? 0}+${c.outputTokens ?? 0} tok · ${c.units} u`;
  }
  return `${c.units} u`;
}
