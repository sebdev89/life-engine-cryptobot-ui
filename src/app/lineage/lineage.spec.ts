import { describe, expect, it } from 'vitest';
import {
  LineageEdge,
  LineageNode,
  NODE_H,
  NODE_W,
  computeLabel,
  layoutLineage,
  levelTag,
  producerLabel,
  shortHash,
} from '../lineage-api';

function node(hash: string, kind: string, createdAt: string, extra: Partial<LineageNode> = {}): LineageNode {
  return {
    receiptHash: `sha256:${hash.padEnd(64, '0')}`,
    kind,
    agentId: `${kind.toLowerCase()}-agent@1.0.0`,
    level: 'L0_SIGNED',
    depth: 0,
    createdAt,
    startedAt: createdAt,
    completedAt: createdAt,
    model: null,
    engine: null,
    compute: null,
    cost: null,
    anchor: null,
    runId: null,
    outputHash: 'sha256:' + 'f'.repeat(64),
    outputSchema: 'test/1',
    keyId: 'k',
    parentCount: 0,
    childCount: 0,
    refs: null,
    ...extra,
  };
}

const h = (s: string) => `sha256:${s.padEnd(64, '0')}`;
const edge = (child: string, parent: string, role: LineageEdge['role'] = 'DERIVES_FROM'): LineageEdge => ({
  childHash: h(child),
  parentHash: h(parent),
  role,
});

/** The demo pipeline of Endgame §19: snapshot → idea/risk → analysis → strategy → risk-after/simulation → execution. */
const demo = {
  nodes: [
    node('a1', 'WALLET_SNAPSHOT', '2026-09-18T10:00:00Z'),
    node('b2', 'RISK_DECISION', '2026-09-18T10:00:01Z', { level: 'L1_REPRODUCIBLE', engine: { id: 'risk-engine', version: '1.0.0', weightsHash: h('ee') } }),
    node('c3', 'HUMAN_IDEA', '2026-09-18T10:01:00Z'),
    node('d4', 'MARKET_ANALYSIS', '2026-09-18T10:01:20Z', {
      model: { ref: 'qwen3:14b', provider: 'life-engine-runtime', providerDigest: null },
      compute: { units: 3512 + 3 * 240, inputTokens: 3512, outputTokens: 240, wallMs: 16100 },
    }),
    node('e5', 'STRATEGY', '2026-09-18T10:02:00Z', { level: 'L1_REPRODUCIBLE', engine: { id: 'rebalance-planner', version: '1.0.0', weightsHash: null } }),
    node('f6', 'RISK_DECISION', '2026-09-18T10:02:01Z', { level: 'L1_REPRODUCIBLE' }),
    node('g7', 'SIMULATION', '2026-09-18T10:02:02Z'),
    node('h8', 'EXECUTION', '2026-09-18T10:03:00Z'),
  ],
  edges: [
    edge('b2', 'a1'),
    edge('c3', 'a1'),
    edge('d4', 'c3'),
    edge('d4', 'a1'),
    edge('d4', 'b2'),
    edge('e5', 'a1'),
    edge('e5', 'd4', 'REUSES'),
    edge('f6', 'e5', 'VALIDATES'),
    edge('g7', 'e5'),
    edge('h8', 'g7'),
    edge('h8', 'e5', 'EXECUTES'),
  ],
};

describe('layoutLineage', () => {
  it('puts every parent strictly above its child and the lineage root at layer 0', () => {
    const lo = layoutLineage(demo.nodes, demo.edges);
    const byHash = new Map(lo.nodes.map((n) => [n.node.receiptHash, n]));
    expect(byHash.get(h('a1'))!.layer).toBe(0);
    for (const e of demo.edges) {
      const parent = byHash.get(e.parentHash)!;
      const child = byHash.get(e.childHash)!;
      expect(child.layer, `${e.childHash} under ${e.parentHash}`).toBeGreaterThan(parent.layer);
      expect(child.y).toBeGreaterThan(parent.y + NODE_H);
    }
  });

  it('follows the longest path, not the first parent (MARKET_ANALYSIS sits under RISK_DECISION, not beside it)', () => {
    const lo = layoutLineage(demo.nodes, demo.edges);
    const layer = (s: string) => lo.nodes.find((n) => n.node.receiptHash === h(s))!.layer;
    expect(layer('b2')).toBe(1);
    expect(layer('c3')).toBe(1);
    expect(layer('d4')).toBe(2);
    expect(layer('e5')).toBe(3);
    expect(layer('f6')).toBe(4);
    expect(layer('g7')).toBe(4);
    expect(layer('h8')).toBe(5);
  });

  it('never overlaps two nodes of the same layer and stays inside the canvas', () => {
    const lo = layoutLineage(demo.nodes, demo.edges);
    for (const a of lo.nodes) {
      expect(a.x).toBeGreaterThanOrEqual(0);
      expect(a.x + NODE_W).toBeLessThanOrEqual(lo.width);
      expect(a.y + NODE_H).toBeLessThanOrEqual(lo.height);
      for (const b of lo.nodes) {
        if (a !== b && a.layer === b.layer) {
          expect(Math.abs(a.x - b.x)).toBeGreaterThanOrEqual(NODE_W);
        }
      }
    }
  });

  it('draws one path per edge, from the parent bottom centre to the child top centre', () => {
    const lo = layoutLineage(demo.nodes, demo.edges);
    expect(lo.edges).toHaveLength(demo.edges.length);
    const byHash = new Map(lo.nodes.map((n) => [n.node.receiptHash, n]));
    for (const le of lo.edges) {
      const p = byHash.get(le.edge.parentHash)!;
      const c = byHash.get(le.edge.childHash)!;
      expect(le.path.startsWith(`M ${p.x + NODE_W / 2} ${p.y + NODE_H} `)).toBe(true);
      expect(le.path.endsWith(`${c.x + NODE_W / 2} ${c.y}`)).toBe(true);
    }
  });

  it('ignores edges to receipts outside the graph (a truncated ancestor) and handles an empty graph', () => {
    const lo = layoutLineage(demo.nodes.slice(0, 2), [edge('b2', 'a1'), edge('b2', 'zz')]);
    expect(lo.edges).toHaveLength(1);
    expect(lo.nodes.map((n) => n.layer)).toEqual([0, 1]);
    const empty = layoutLineage([], []);
    expect(empty.nodes).toEqual([]);
    expect(empty.edges).toEqual([]);
    expect(empty.width).toBeGreaterThan(0);
  });

  it('is deterministic: same input, same coordinates', () => {
    const a = layoutLineage(demo.nodes, demo.edges);
    const b = layoutLineage([...demo.nodes].reverse(), [...demo.edges].reverse());
    const coords = (lo: ReturnType<typeof layoutLineage>) =>
      [...lo.nodes].sort((x, y) => x.node.receiptHash.localeCompare(y.node.receiptHash)).map((n) => [n.node.receiptHash, n.x, n.y]);
    expect(coords(a)).toEqual(coords(b));
  });
});

describe('formatting helpers', () => {
  it('shortHash keeps the algorithm prefix and both ends of the digest', () => {
    expect(shortHash('sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef')).toBe('sha256:012345…abcdef');
    expect(shortHash('short')).toBe('short');
    expect(shortHash(null)).toBe('—');
  });

  it('levelTag and producerLabel read the receipt, never invent', () => {
    expect(levelTag('L1_REPRODUCIBLE')).toBe('L1');
    expect(levelTag(null)).toBe('—');
    expect(producerLabel({ engine: { id: 'risk-engine', version: '1.0.0', weightsHash: null }, model: null, agentId: 'x' })).toBe('risk-engine@1.0.0');
    expect(producerLabel({ engine: null, model: { ref: 'qwen3:14b', provider: 'ollama', providerDigest: null }, agentId: 'x' })).toBe('qwen3:14b');
    expect(producerLabel({ engine: null, model: null, agentId: 'human' })).toBe('human');
  });

  it('computeLabel shows tokens when they were measured and says so when they were not', () => {
    expect(computeLabel({ compute: { units: 4232, inputTokens: 3512, outputTokens: 240, wallMs: null } })).toBe('3512+240 tok · 4232 u');
    expect(computeLabel({ compute: { units: 1, inputTokens: null, outputTokens: null, wallMs: 3 } })).toBe('1 u');
    expect(computeLabel({ compute: null })).toBe('not measured');
  });
});
