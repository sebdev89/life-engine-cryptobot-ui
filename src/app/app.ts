import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PUBLIC_DEMO } from './public-demo/flag';
import { ReplayBanner } from './public-demo/replay-banner';

/**
 * Root shell: one `<router-outlet>`. `/` is the public landing, `/live[/:proposalId]` the
 * live-operation view of the demo path. In the public replay build every screen carries the
 * replay banner (what this is, that it is read-only, and when it was recorded).
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ReplayBanner],
  template: `
    @if (publicDemo) {
      <app-replay-banner />
    }
    <router-outlet />
  `,
})
export class App {
  readonly publicDemo = PUBLIC_DEMO;
}
