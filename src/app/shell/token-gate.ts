import { Component, input, output, signal } from '@angular/core';
import { setCryptobotSession } from '../session';

/**
 * What a screen shows when there is no session (KAN-787, reused by /demo in KAN-789): a field for
 * the demo JWT instead of a dead end. The token stays in this browser (session.ts → localStorage);
 * `scripts/demo/ui-url.sh` in cryptobot-service mints one for the local demo stack.
 */
@Component({
  selector: 'app-token-gate',
  standalone: true,
  template: `
    <form class="gate panel" (submit)="save($event)">
      <p class="eyebrow">Session needed</p>
      <p class="gate__why">{{ why() }}</p>
      <label class="gate__row">
        <span class="t-2">Access token (demo JWT)</span>
        <input class="field mono" type="password" autocomplete="off" [value]="token()" (input)="onInput($event)" placeholder="eyJhbGciOi…" />
      </label>
      <div class="gate__actions">
        <button type="submit" class="btn btn--primary" [disabled]="token().trim().length < 16">Use token</button>
        <span class="t-3">or open this page with <code>?token=…</code> — <code>scripts/demo/ui-url.sh</code> prints one.</span>
      </div>
    </form>
  `,
  styles: `
    .gate {
      max-width: 640px;
      padding: var(--sp-4) var(--sp-5);
      margin-bottom: var(--sp-4);
      display: grid;
      gap: var(--sp-3);
    }
    .gate__why {
      margin: 0;
    }
    .gate__row {
      display: grid;
      gap: var(--sp-1);
    }
    .gate__row input {
      width: 100%;
    }
    .gate__actions {
      display: flex;
      gap: var(--sp-3);
      align-items: center;
      flex-wrap: wrap;
      font-size: var(--fs-xs);
    }
  `,
})
export class TokenGate {
  readonly why = input('This screen reads the live API; it needs an operator token.');
  readonly saved = output<void>();
  readonly token = signal('');

  onInput(e: Event): void {
    this.token.set((e.target as HTMLInputElement).value);
  }

  save(e: Event): void {
    e.preventDefault();
    const t = this.token().trim();
    if (t.length < 16) return;
    setCryptobotSession({ accessToken: t });
    this.token.set('');
    this.saved.emit();
  }
}
