import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Root shell: one `<router-outlet>`. `/` is the dashboard (login, wallet, advisor, proposals);
 * `/live[/:proposalId]` is the live-operation view of the hackathon demo path (KAN-576).
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class App {}
