import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AuthRequiredError } from '../cryptobot-api';
import { bootstrapSessionFromQuery, getAccessToken } from '../session';
import { TokenGate } from '../shell/token-gate';
import { TopNav } from '../shell/top-nav';
import { SwapDirection, SwapError, SwapView, approveSwap, createSwap, executeSwap, getSwap, reconcileSwap, rejectSwap } from '../swaps-api';
import { DECIMALS, LIVE, actions, explorerTx, fromBaseUnits, previewSummary, reasonText, toBaseUnits, windowLeft } from './swaps-model';

export const SWAPS_POLL_MS = 3000;

/**
 * `/swaps` (KAN-1249 pilot): propose a SOL⇄USDC swap — Jupiter quotes it, the RPC simulates it, nothing is signed —,
 * read the preview, approve it (only the configured approver sees the button: the service hands the nonce to nobody
 * else) and execute it, once. Every refusal is the service's stable reason, in plain words.
 */
@Component({
  selector: 'app-swaps',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [DatePipe, TopNav, TokenGate],
  template: `
    <app-top-nav />
    <main class="swaps">
      <h1>Swaps <span class="muted small">pilot · SOL ⇄ USDC</span></h1>
      @if (!signedIn()) {
        <app-token-gate [why]="error() ?? 'Swap orders are read and approved on the live API; they need your session.'" (saved)="onSignedIn()" />
      } @else {
        <section class="panel">
          <h2>1 · Propose <span class="muted small">quote + simulation, nothing is signed</span></h2>
          <form class="row" (submit)="$event.preventDefault(); propose()">
            <select [value]="direction()" (change)="direction.set($any($event.target).value)" aria-label="Direction">
              <option value="SOL_USDC">SOL → USDC</option>
              <option value="USDC_SOL">USDC → SOL</option>
            </select>
            <input class="amount" [value]="amount()" (input)="amount.set($any($event.target).value)" inputmode="decimal"
              [attr.aria-label]="'Amount in ' + dec().inSym" [placeholder]="'amount in ' + dec().inSym" data-testid="swap-amount" />
            <label class="muted small">slippage
              <input class="bps" type="number" min="0" max="100" [value]="slippage()" (input)="slippage.set(+$any($event.target).value)" aria-label="Max slippage (bps)" /> bps
            </label>
            <button type="submit" [disabled]="busy() || baseAmount() === null" data-testid="swap-propose">
              @if (busy() === 'propose') { Quoting… } @else { Propose }
            </button>
          </form>
          @if (amount() && baseAmount() === null) {
            <p class="warn small">Not a valid {{ dec().inSym }} amount.</p>
          }
          <form class="row small" (submit)="$event.preventDefault(); load(lookup())">
            <input [value]="lookup()" (input)="lookup.set($any($event.target).value)" placeholder="…or open an order by id" aria-label="Order id" />
            <button type="submit" class="ghost" [disabled]="!lookup().trim()">Open</button>
          </form>
        </section>

        @if (message(); as m) {
          <p class="note" [class.err]="!m.ok" role="status">{{ m.text }}</p>
        }

        @if (order(); as o) {
          <section class="panel" data-testid="swap-order">
            <h2>2 · Order <span class="badge badge--{{ tone() }}">{{ o.status }}</span>
              <span class="muted small">{{ o.cluster }}</span></h2>
            <dl class="facts">
              <dt>Spend</dt><dd>{{ fmtIn(o) }} {{ decOf(o).inSym }}</dd>
              <dt>Quoted</dt><dd>{{ summary().quotedOut === null ? '—' : fmtOut(o, summary().quotedOut!) + ' ' + decOf(o).outSym }}</dd>
              <dt>Minimum received</dt><dd><strong>{{ fmtOut(o, o.minOut) }} {{ decOf(o).outSym }}</strong> <span class="muted small">(slippage ≤ {{ o.maxSlippageBps }} bps, enforced on chain)</span></dd>
              <dt>Route</dt><dd>{{ summary().route.length ? summary().route.join(' → ') : '—' }}</dd>
              <dt>Simulation</dt><dd>{{ summary().simulationOk === null ? '—' : summary().simulationOk ? 'would succeed' : 'would fail' }}
                @if (summary().computeUnits) { <span class="muted small">{{ summary().computeUnits }} CU</span> }</dd>
              <dt>Wallet</dt><dd class="mono small">{{ o.owner }}</dd>
              <dt>Preview hash</dt><dd class="mono small">{{ o.previewHash }}</dd>
              @if (left(); as l) { <dt>Window</dt><dd>{{ l }} left</dd> }
              @if (o.txSignature) {
                <dt>Transaction</dt><dd class="mono small"><a [href]="explorer(o)" target="_blank" rel="noopener">{{ o.txSignature }}</a></dd>
              }
              @if (o.error) { <dt>Error</dt><dd class="err">{{ o.error }}</dd> }
              <dt>Created</dt><dd>{{ o.createdAt | date: 'medium' }}</dd>
            </dl>

            <div class="row">
              @if (can().approve) {
                <label class="small"><input type="checkbox" [checked]="reviewed()" (change)="reviewed.set($any($event.target).checked)" /> I read this preview</label>
                <button type="button" [disabled]="!reviewed() || !!busy()" (click)="approve(o)" data-testid="swap-approve">Approve</button>
              }
              @if (can().reject) {
                <button type="button" class="ghost" [disabled]="!!busy()" (click)="reject(o)">Reject</button>
              }
              @if (can().execute) {
                <button type="button" class="danger" [disabled]="!!busy()" (click)="execute(o)" data-testid="swap-execute">
                  @if (busy() === 'execute') { Executing… } @else { Execute on {{ o.cluster }} }
                </button>
              }
              @if (can().reconcile) {
                <button type="button" class="ghost" [disabled]="!!busy()" (click)="reconcile(o)">Ask the chain</button>
              }
            </div>
            @if (o.status === 'PENDING_APPROVAL' && !o.approvalNonce) {
              <p class="muted small">Only the configured approver can approve this order.</p>
            }
          </section>
        }
      }
    </main>
  `,
  styles: `
    .swaps { max-width: 960px; margin: 0 auto; padding: 0 var(--sp-4) var(--sp-6); }
    .panel { border: 1px solid var(--border-subtle); border-radius: var(--r-md); padding: var(--sp-4); margin-bottom: var(--sp-4); }
    .row { display: flex; flex-wrap: wrap; gap: var(--sp-3); align-items: center; margin-top: var(--sp-3); }
    .amount { width: 10rem; }
    .bps { width: 4.5rem; }
    .facts { display: grid; grid-template-columns: max-content 1fr; gap: var(--sp-2) var(--sp-4); margin: var(--sp-3) 0; }
    .facts dt { color: var(--text-3); }
    .facts dd { margin: 0; overflow-wrap: anywhere; }
    .mono { font-family: var(--font-mono); }
    .muted { color: var(--text-3); }
    .small { font-size: var(--fs-sm); }
    .warn, .err { color: var(--danger, #c0392b); }
    .note { padding: var(--sp-2) var(--sp-3); border-radius: var(--r-sm); background: var(--surface-2); }
    .danger { background: var(--danger, #c0392b); color: #fff; }
  `,
})
export class SwapsView {
  readonly signedIn = signal(false);
  readonly error = signal<string | null>(null);
  readonly direction = signal<SwapDirection>('SOL_USDC');
  readonly amount = signal('');
  readonly slippage = signal(50);
  readonly lookup = signal('');
  readonly order = signal<SwapView | null>(null);
  readonly busy = signal<string | null>(null);
  readonly reviewed = signal(false);
  readonly message = signal<{ ok: boolean; text: string } | null>(null);
  readonly now = signal(Date.now());

  readonly dec = computed(() => DECIMALS[this.direction()]);
  readonly baseAmount = computed(() => toBaseUnits(this.amount(), this.dec().in));
  readonly summary = computed(() => previewSummary(this.order()?.preview ?? '{}'));
  readonly can = computed(() => {
    const o = this.order();
    return o ? actions(o, this.now()) : { approve: false, reject: false, execute: false, reconcile: false };
  });
  readonly left = computed(() => {
    const o = this.order();
    return o && (o.status === 'PENDING_APPROVAL' || o.status === 'APPROVED') ? windowLeft(o.expiresAt, this.now()) : null;
  });
  readonly tone = computed(() => {
    const s = this.order()?.status;
    return s === 'CONFIRMED' ? 'ok' : s === 'FAILED' || s === 'REJECTED' || s === 'EXPIRED' ? 'err' : 'warn';
  });

  constructor() {
    bootstrapSessionFromQuery();
    this.signedIn.set(!!getAccessToken());
    const timer = setInterval(() => {
      this.now.set(Date.now());
      const o = this.order();
      if (o && LIVE.has(o.status) && !this.busy() && Math.floor(this.now() / 1000) % (SWAPS_POLL_MS / 1000) === 0) {
        void this.load(o.id, true);
      }
    }, 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  onSignedIn(): void {
    this.signedIn.set(true);
    this.error.set(null);
  }

  decOf(o: SwapView) {
    return DECIMALS[o.direction];
  }
  fmtIn(o: SwapView): string {
    return fromBaseUnits(o.inAmount, this.decOf(o).in);
  }
  fmtOut(o: SwapView, units: number): string {
    return fromBaseUnits(units, this.decOf(o).out);
  }
  explorer(o: SwapView): string {
    return explorerTx(o.txSignature ?? '', o.cluster);
  }

  async propose(): Promise<void> {
    const units = this.baseAmount();
    if (units === null) return;
    await this.run('propose', () => createSwap(this.direction(), units, this.slippage(), crypto.randomUUID()), 'Proposed: read the preview before approving.');
  }

  async load(id: string, quiet = false): Promise<void> {
    if (!id.trim()) return;
    try {
      this.order.set(await getSwap(id.trim()));
      if (!quiet) this.message.set(null);
    } catch (e) {
      if (!quiet) this.fail(e);
    }
  }

  approve(o: SwapView): Promise<void> {
    return this.run('approve', () => approveSwap(o.id, o.approvalNonce ?? '', o.previewHash), 'Approved: execute it before the window closes.');
  }

  reject(o: SwapView): Promise<void> {
    return this.run('reject', () => rejectSwap(o.id), 'Rejected.');
  }

  execute(o: SwapView): Promise<void> {
    const d = this.decOf(o);
    const ok = confirm(`Execute on ${o.cluster}: spend ${this.fmtIn(o)} ${d.inSym}, receive at least ${this.fmtOut(o, o.minOut)} ${d.outSym}?`);
    if (!ok) return Promise.resolve();
    return this.run('execute', () => executeSwap(o.id), 'Execution finished — see the status.');
  }

  reconcile(o: SwapView): Promise<void> {
    return this.run('reconcile', () => reconcileSwap(o.id), 'Asked the chain.');
  }

  private async run(what: string, call: () => Promise<SwapView>, done: string): Promise<void> {
    this.busy.set(what);
    this.message.set(null);
    try {
      const o = await call();
      this.order.set(o);
      this.reviewed.set(false);
      this.message.set({ ok: true, text: done });
    } catch (e) {
      this.fail(e);
    } finally {
      this.busy.set(null);
    }
  }

  private fail(e: unknown): void {
    if (e instanceof AuthRequiredError) {
      this.signedIn.set(false);
      this.error.set('Your session expired: sign in again.');
      return;
    }
    this.message.set({ ok: false, text: e instanceof SwapError ? reasonText(e.reason) : String(e) });
  }
}
