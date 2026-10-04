import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PUBLIC_DEMO } from './public-demo/flag';
import { ReplayBanner } from './public-demo/replay-banner';
import { ToastHost } from './ui/toast';
import { TruthLegend } from './ui/truth';

/**
 * Root shell: one `<router-outlet>`. `/` is the public landing, `/live[/:proposalId]` the
 * live-operation view of the demo path. In the public replay build every screen carries the
 * replay banner (what this is, that it is read-only, and when it was recorded). Every screen ends
 * with the key to the data labels (on-chain, recorded, declared, simulated, estimated).
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ReplayBanner, ToastHost, TruthLegend],
  template: `
    <a class="skip" href="#content">Skip to content</a>
    @if (publicDemo) {
      <app-replay-banner />
    }
    <div id="content" tabindex="-1">
      <router-outlet />
    </div>
    <footer class="site-foot" aria-labelledby="legend-title">
      <h2 id="legend-title" class="site-foot__title">How to read the labels</h2>
      <app-truth-legend />
    </footer>
    <app-toast-host />
  `,
  styles: `
    .skip {
      position: absolute;
      left: 12px;
      top: -40px;
      z-index: 60;
      padding: 6px 12px;
      border-radius: var(--r-md);
      background: var(--accent);
      color: var(--on-accent);
      font-weight: 600;
      text-decoration: none;
    }
    .skip:focus {
      top: 8px;
    }
    #content:focus {
      outline: none;
      box-shadow: none;
    }
    .site-foot {
      max-width: 1200px;
      margin: var(--sp-6) auto 0;
      padding: var(--sp-5) var(--sp-5) calc(var(--sp-6) + 24px);
      border-top: 1px solid var(--border-subtle);
    }
    .site-foot__title {
      margin: 0 0 var(--sp-3);
      font-size: var(--fs-sm);
      font-weight: 600;
      color: var(--text-2);
    }
    @media (max-width: 640px) {
      .site-foot {
        padding: var(--sp-4) var(--sp-4) calc(var(--sp-6) + 24px);
      }
    }
  `,
})
export class App {
  readonly publicDemo = PUBLIC_DEMO;
}
