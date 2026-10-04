import { describe, expect, it } from 'vitest';
import snapshotJson from '../public-demo/snapshot.json';
import type { ReplaySnapshot } from '../public-demo/replay';
import { POV_CHAIN, clampStep } from '../pov/pov-chain';
import { flowGeometry } from '../value/money-flow';
import { TourData, buildTour, prLabel } from './tour-model';
import { clock } from './tour';

const s = snapshotJson as unknown as ReplaySnapshot;
const body = <T>(k: string): T => s.responses[k].body as T;

function recorded(): TourData {
  const ev = body<{ id: string; revenueShares?: { revenueEventId: string }[] }[]>('GET /value-events')[0];
  const prop = body<{ proposal: unknown; audit: unknown[] }>('GET /proposals/37dc2047-6878-4c6f-ac97-ffac7a337ab2');
  const revId = body<{ id: string }[]>('GET /revenue-events')[0].id;
  return {
    proposal: prop.proposal as TourData['proposal'],
    audit: prop.audit as TourData['audit'],
    event: body(`GET /value-events/${ev.id}`),
    distribution: body(`GET /value-events/${ev.id}/distribution`),
    revenue: body(`GET /revenue-events/${revId}`),
    identity: body('GET /identities/dev-agent-17'),
  };
}

describe('Proof of Value chain', () => {
  it('is the nine links of the pitch, in order', () => {
    expect(POV_CHAIN.map((l) => l.name)).toEqual([
      'Intent', 'Strategist', 'Guardian', 'Operator', 'Solana', 'AcceptanceProof', 'ValueEvent', 'Contribution Units', 'Reward & Reputation',
    ]);
    for (const l of POV_CHAIN) expect(l.says).toMatch(/\.$/);
  });

  it('clamps ?step= to 1…9', () => {
    expect(clampStep('3')).toBe(3);
    expect(clampStep('0')).toBe(1);
    expect(clampStep('99')).toBe(9);
    expect(clampStep('x')).toBe(1);
    expect(clampStep(undefined)).toBe(1);
  });
});

describe('guided replay — built from the recording', () => {
  const tour = buildTour(recorded());
  const text = JSON.stringify(tour);

  it('has nine steps, each with a sentence and evidence', () => {
    expect(tour.map((t) => t.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (const t of tour) {
      expect(t.line.length, t.name).toBeGreaterThan(20);
      expect(t.evidence.length, t.name).toBeGreaterThan(0);
    }
  });

  it('every hash and transaction it shows exists in the recording (nothing typed in)', () => {
    const snap = JSON.stringify(s);
    for (const t of tour)
      for (const e of t.evidence) {
        if (e.kind === 'hash') expect(snap.includes(e.value), `${t.name}: ${e.label}`).toBe(true);
      }
  });

  it('labels on-chain only what is on Solana, and says what the run is not', () => {
    const solana = tour[4];
    expect(solana.evidence.find((e) => e.label === 'transaction')?.truth).toBe('onchain');
    expect(solana.caveat).toContain('not a swap');
    expect(tour[1].caveat).toContain('not a language model');
    expect(tour[2].caveat).toContain('No second agent');
    // the recorded acceptance is manual: the stages are DECLARED, not measured
    expect(tour[5].evidence[0].truth).toBe('declared');
    expect(tour[5].caveat).toContain('source: manual');
    // the revenue is simulated, the payouts are on-chain
    const reward = tour[8];
    expect(reward.evidence.find((e) => e.label === 'revenue split')?.truth).toBe('simulated');
    expect(reward.evidence.find((e) => e.label === 'reward paid')?.truth).toBe('onchain');
    expect(reward.caveat).toContain('simulated');
  });

  it('reads the real values: verdict, transfer, units, split, reputation', () => {
    expect(text).toContain('ESCALATE · tier SECOND_AGENT');
    expect(text).toContain('1.4675 SOL');
    expect(text).toContain('100 Contribution Units');
    expect(text).toContain('0.0500 SOL → 20 % contributors · 5 % protocol · 75 % retained');
    expect(text).toContain('1 accepted outcome · 16 units');
    expect(text).toContain('0.0100 SOL to 4 wallets');
    expect(tour[2].evidence.find((e) => e.label === 'timelock before execution')).toMatchObject({ value: '20 s' });
  });

  it('step 7 carries the live check against the anchored root', () => {
    expect(tour[6].verify).toEqual({
      signature: '47X9tshe8bvHsUfvUU2FwetQ4En5L111A7HNftWsY3N8vBehVYpVFhM5eeCcUy6GfkpAuuUmMQ4p6tMpFeXGK544',
      root: 'sha256:0960c920bc100fcedd841921174871f30a692a32eb58e3213b4d5bcc341dfd50',
      slot: 507246166,
    });
    expect(tour.filter((t) => t.verify).length).toBe(1);
  });

  it('a recording without a ValueEvent still builds, and simply leaves those rows out', () => {
    const t = buildTour({ ...recorded(), event: null, distribution: null, revenue: null, identity: null });
    expect(t.length).toBe(9);
    expect(t[6].evidence).toEqual([]);
    expect(t[6].verify).toBeNull();
  });

  it('formats the PR and the player clock', () => {
    expect(prLabel('https://github.com/sebdev89/life-engine-cryptobot-service/pull/59')).toBe('sebdev89/life-engine-cryptobot-service #59');
    expect(clock(90_000)).toBe('1:30');
    expect(clock(5_000)).toBe('0:05');
  });
});

describe('money flow geometry', () => {
  it('splits by lamports and fans the pool into the payouts', () => {
    const g = flowGeometry(
      50_000_000,
      [
        { label: 'Contributors', lamports: 10_000_000, bps: 2000, pool: true, tone: 'pool' },
        { label: 'Protocol fee', lamports: 2_500_000, bps: 500, tone: 'fee' },
        { label: 'Retained', lamports: 37_500_000, bps: 7500, tone: 'retained' },
      ],
      [{ lamports: 5_200_000 }, { lamports: 1_600_000 }, { lamports: 1_600_000 }, { lamports: 1_600_000 }],
    );
    expect(g.parts.map((p) => Math.round(p.w))).toEqual([20, 5, 75]);
    expect(g.pool).toEqual({ x: 0, w: 20 });
    expect(g.payouts.map((p) => Math.round(p.w))).toEqual([52, 16, 16, 16]);
  });

  it('without a split the whole amount fans out', () => {
    expect(flowGeometry(10, [], [{ lamports: 5 }, { lamports: 5 }]).pool).toEqual({ x: 0, w: 100 });
  });
});
