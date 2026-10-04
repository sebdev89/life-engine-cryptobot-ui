import { Component, effect, input, signal } from '@angular/core';
import { ProofPath, proofPath, webCryptoSha256 } from '../merkle';
import { HashChip } from '../ui/hash';

/**
 * The inclusion proof drawn as what it is: the receipt hash goes in at the bottom, each step hashes it
 * with a sibling, and what comes out at the top must be the root written on Solana. Computed here with
 * WebCrypto, the same fold the service does (merkle.ts).
 */
@Component({
  selector: 'app-merkle-viz',
  standalone: true,
  imports: [HashChip],
  template: `
    @if (path(); as p) {
      <ol class="mv" aria-label="Merkle inclusion proof, computed in this browser" data-testid="merkle-viz">
        <li class="mv__node" style="--i: 0">
          <span class="mv__k">Receipt of this event</span>
          <app-hash [value]="receiptHash()" label="receipt hash" />
        </li>
        <li class="mv__op" style="--i: 1"><span class="mono">SHA-256(0x00 ‖ receipt)</span></li>
        <li class="mv__node" style="--i: 2">
          <span class="mv__k">Leaf</span>
          <app-hash [value]="p.leaf" label="leaf hash" />
        </li>
        @for (s of p.steps; track s.level) {
          <li class="mv__op" [style.--i]="3 + $index * 2">
            <span class="mono">SHA-256(0x01 ‖ {{ s.side === 'L' ? 'sibling ‖ node' : 'node ‖ sibling' }})</span>
            <span class="mv__sib">sibling <app-hash [value]="s.sibling" label="sibling hash" [head]="6" [tail]="6" /></span>
          </li>
          <li class="mv__node" [style.--i]="4 + $index * 2">
            <span class="mv__k">Level {{ s.level }}</span>
            <app-hash [value]="s.node" label="node hash" />
          </li>
        }
        <li class="mv__root" [class.mv__root--bad]="p.root !== root()" [style.--i]="3 + p.steps.length * 2">
          <span class="mv__k">{{ p.root === root() ? 'Equals the root written on Solana' : 'Differs from the root written on Solana' }}</span>
          <app-hash [value]="root()" label="anchored root" />
        </li>
      </ol>
      @if (p.steps.length === 0) {
        <p class="mv__note">The proof has no steps: this event is the only leaf in its batch, so its leaf hash is the root.</p>
      }
    } @else if (unavailable()) {
      <p class="mv__note">This browser cannot compute SHA-256 here (WebCrypto needs a secure context).</p>
    }
  `,
  styles: `
    .mv {
      list-style: none;
      margin: var(--sp-3) 0 0;
      padding: 0 0 0 14px;
      display: grid;
      gap: 0;
      position: relative;
    }
    .mv::before {
      content: '';
      position: absolute;
      left: 4px;
      top: 10px;
      bottom: 14px;
      width: 2px;
      border-radius: 1px;
      background: linear-gradient(180deg, var(--text-3), var(--chain), var(--chain-2));
      transform-origin: top;
      animation: mv-grow 1.2s var(--ease) both;
    }
    @keyframes mv-grow {
      from {
        transform: scaleY(0);
      }
    }
    .mv > li {
      position: relative;
      min-width: 0;
      animation: mv-in 320ms var(--ease) both;
      animation-delay: calc(var(--i, 0) * 160ms);
    }
    @keyframes mv-in {
      from {
        opacity: 0;
        transform: translateX(-4px);
      }
    }
    .mv__node,
    .mv__root {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 2px 10px;
      padding: 6px 10px;
      margin-left: 6px;
      border-radius: var(--r-md);
      border: 1px solid var(--glass-border);
      background: var(--glass-hover);
    }
    .mv__node::before,
    .mv__root::before {
      content: '';
      position: absolute;
      left: -15px;
      top: 50%;
      width: 10px;
      height: 10px;
      margin-top: -5px;
      border-radius: 50%;
      background: var(--bg);
      border: 2px solid var(--chain);
    }
    .mv__root {
      border-color: color-mix(in srgb, var(--chain-2) 50%, transparent);
      background: color-mix(in srgb, var(--chain-2) 8%, transparent);
    }
    .mv__root::before {
      border-color: var(--chain-2);
      background: var(--chain-2);
    }
    .mv__root--bad {
      border-color: color-mix(in srgb, var(--err) 50%, transparent);
      background: var(--err-bg);
    }
    .mv__k {
      color: var(--text-2);
      font-size: var(--fs-xs);
    }
    .mv__root .mv__k {
      color: var(--chain-2);
      font-weight: 600;
    }
    .mv__root--bad .mv__k {
      color: var(--err);
    }
    .mv__op {
      display: flex;
      flex-wrap: wrap;
      gap: 2px 10px;
      padding: 6px 0 6px 18px;
      color: var(--text-3);
      font-size: var(--fs-xs);
    }
    .mv__sib {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .mv__note {
      margin: var(--sp-2) 0 0 !important;
      color: var(--text-2);
      font-size: var(--fs-sm);
    }
  `,
})
export class MerkleViz {
  readonly receiptHash = input.required<string>();
  readonly proof = input.required<readonly string[]>();
  readonly root = input.required<string>();

  readonly path = signal<ProofPath | null>(null);
  readonly unavailable = signal(false);

  constructor() {
    effect(() => {
      const h = this.receiptHash();
      const pr = this.proof();
      const sha = webCryptoSha256();
      this.path.set(null);
      if (!sha) {
        this.unavailable.set(true);
        return;
      }
      proofPath(h, pr, sha)
        .then((p) => this.path.set(p))
        .catch(() => this.unavailable.set(true));
    });
  }
}
