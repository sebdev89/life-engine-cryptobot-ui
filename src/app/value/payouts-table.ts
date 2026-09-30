import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Payout } from '../value-events-api';
import { explorerAddressUrl, lamportsToSol, payoutClass, short, shortWallet, txExplorerUrl } from './value-model';

/** Payouts table shared by the immediate distribution (V5) and the historical revenue distribution (V7). */
@Component({
  selector: 'app-payouts-table',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="table-wrap">
      <table class="grid" data-testid="payouts">
        <thead><tr><th>Contributor</th><th>Wallet</th><th class="num">SOL</th><th>Status</th><th>Transaction</th></tr></thead>
        <tbody>
          @for (p of payouts(); track $index) {
            <tr>
              <td><a [routerLink]="['/value/identities', p.identityId]">{{ p.displayName }}</a></td>
              <td>
                @if (p.wallet; as w) {
                  <a class="mono small" [href]="explorerAddressUrl(w)" target="_blank" rel="noopener" [title]="w">{{ shortWallet(w) }} ↗</a>
                } @else {
                  <span class="t-3">no wallet on file</span>
                }
              </td>
              <td class="mono num">{{ sol(p.lamports) }}</td>
              <td>
                <span class="st-badge st--{{ payoutClass(p.status) }}">{{ p.status }}</span>
                @if (p.status === 'FAILED' && p.error) {
                  <span class="small t-3 payout-error">{{ p.error }}</span>
                }
              </td>
              <td>
                @if (p.txSignature; as sig) {
                  <a class="mono small" [href]="p.explorerUrl ?? txExplorerUrl(sig)" target="_blank" rel="noopener">{{ short(sig, 6, 4) }} ↗</a>
                } @else {
                  <span class="t-3">—</span>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styleUrl: './value.scss',
})
export class PayoutsTable {
  readonly payouts = input.required<Payout[]>();
  readonly sol = lamportsToSol;
  readonly payoutClass = payoutClass;
  readonly shortWallet = shortWallet;
  readonly explorerAddressUrl = explorerAddressUrl;
  readonly txExplorerUrl = txExplorerUrl;
  readonly short = short;
}
