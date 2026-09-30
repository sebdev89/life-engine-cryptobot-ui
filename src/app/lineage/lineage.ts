import { Component, computed, effect, input, signal, untracked } from '@angular/core';
import { KeyValuePipe } from '@angular/common';
import {
  LineageEdge,
  LineageGraph,
  LineageNode,
  ReceiptView,
  Verification,
  computeLabel,
  getProposalLineage,
  getReceipt,
  layoutLineage,
  levelTag,
  NODE_H,
  NODE_W,
  producerLabel,
  shortHash,
  verifyReceipt,
} from '../lineage-api';

/**
 * The provenance DAG of one proposal (Endgame §19 step 5): every receipt the pipeline
 * left behind, as a node with its hash, what produced it (model or deterministic engine), what it
 * cost in measured compute, its reproducibility level and its anchor; edges typed by role. Click a
 * node → the stored receipt and a live `verify` (hash, body, signature, parents, and for L1 the
 * re-execution). Nothing here is computed: the graph and the verification come from the service.
 */
@Component({
  selector: 'app-lineage',
  standalone: true,
  imports: [KeyValuePipe],
  templateUrl: './lineage.html',
  styleUrl: './lineage.scss',
})
export class Lineage {
  /** The proposal whose DAG to show; `null` clears the panel. */
  readonly proposalId = input<string | null>(null);
  /** Bumped by the parent when the proposal changed state (approve/execute) so the graph reloads. */
  readonly version = input(0);

  readonly graph = signal<LineageGraph | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly selectedHash = signal<string | null>(null);
  readonly receipt = signal<ReceiptView | null>(null);
  readonly verification = signal<Verification | null>(null);
  readonly verifying = signal(false);
  readonly detailError = signal<string | null>(null);

  readonly layout = computed(() => {
    const g = this.graph();
    return g ? layoutLineage(g.nodes, g.edges) : null;
  });
  readonly selectedNode = computed<LineageNode | null>(() => {
    const h = this.selectedHash();
    return h ? (this.graph()?.nodes.find((n) => n.receiptHash === h) ?? null) : null;
  });
  readonly nodeW = NODE_W;
  readonly nodeH = NODE_H;

  constructor() {
    effect(() => {
      const id = this.proposalId();
      this.version();
      untracked(() => void this.load(id));
    });
  }

  async load(proposalId: string | null): Promise<void> {
    this.selectedHash.set(null);
    this.receipt.set(null);
    this.verification.set(null);
    this.detailError.set(null);
    if (!proposalId) {
      this.graph.set(null);
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    try {
      this.graph.set(await getProposalLineage(proposalId));
    } catch (e) {
      this.graph.set(null);
      this.error.set(e instanceof Error ? e.message : String(e));
    } finally {
      this.loading.set(false);
    }
  }

  /** Node click: the receipt as stored, then `verify` recomputed live by the service. */
  async select(hash: string): Promise<void> {
    if (this.selectedHash() === hash) {
      this.selectedHash.set(null);
      this.receipt.set(null);
      this.verification.set(null);
      return;
    }
    this.selectedHash.set(hash);
    this.receipt.set(null);
    this.verification.set(null);
    this.detailError.set(null);
    this.verifying.set(true);
    try {
      const [view, verified] = await Promise.all([getReceipt(hash), verifyReceipt(hash)]);
      if (this.selectedHash() === hash) {
        this.receipt.set(view);
        this.verification.set(verified);
      }
    } catch (e) {
      this.detailError.set(e instanceof Error ? e.message : String(e));
    } finally {
      this.verifying.set(false);
    }
  }

  async reverify(): Promise<void> {
    const hash = this.selectedHash();
    if (!hash || this.verifying()) return;
    this.verifying.set(true);
    try {
      this.verification.set(await verifyReceipt(hash));
    } catch (e) {
      this.detailError.set(e instanceof Error ? e.message : String(e));
    } finally {
      this.verifying.set(false);
    }
  }

  // ---- template helpers ----------------------------------------------------------------------

  short(hash: string | null | undefined): string {
    return shortHash(hash);
  }

  level(n: LineageNode): string {
    return levelTag(n.level);
  }

  producer(n: LineageNode): string {
    return producerLabel(n);
  }

  compute(n: LineageNode): string {
    return computeLabel(n);
  }

  kindLabel(kind: string): string {
    return kind.toLowerCase().replace(/_/g, ' ');
  }

  levelClass(n: LineageNode): string {
    return n.level === 'L0_SIGNED' ? 'l0' : n.level === 'L1_REPRODUCIBLE' ? 'l1' : 'lx';
  }

  edgeClass(e: LineageEdge): string {
    return e.role.toLowerCase().replace(/_/g, '-');
  }

  edgeLabel(e: LineageEdge): string {
    return e.role === 'DERIVES_FROM' ? '' : e.role.toLowerCase();
  }

  isRoot(n: LineageNode): boolean {
    return (this.graph()?.roots ?? []).includes(n.receiptHash);
  }

  cost(n: LineageNode): string {
    return n.cost ? `$${n.cost.usd}` : 'no price table';
  }

  checks(v: Verification): { label: string; ok: boolean | null }[] {
    return [
      { label: 'hash = SHA-256(domain ‖ canonical)', ok: v.hashMatchesCanonical },
      { label: 'body re-canonicalises to the hashed bytes', ok: v.bodyMatchesCanonical },
      { label: `Ed25519 signature (${v.keyId ?? '?'})`, ok: v.signatureValid },
      { label: 'every parent exists in the tenant', ok: v.parentsPresent },
      { label: 'L1 re-execution reproduces outputHash', ok: v.reproduced },
    ];
  }

  checkGlyph(ok: boolean | null): string {
    return ok === null ? '·' : ok ? '✓' : '✗';
  }

  reproductionReason(v: Verification): string | null {
    return v.reproduction?.reason ?? null;
  }

  edgesOf(view: ReceiptView): LineageEdge[] {
    return view.parents;
  }

  inputsOf(view: ReceiptView): { type: string; hash: string }[] {
    return view.receipt.body.inputs ?? [];
  }
}
