import { ChangeDetectionStrategy, Component, ElementRef, input, model, viewChildren } from '@angular/core';

/** One tab of the rail. `badge` shows a count; `tone: 'warn'` paints it as something to look at. */
export interface TabItem {
  readonly id: string;
  readonly label: string;
  readonly badge?: number | null;
  readonly tone?: 'neutral' | 'warn';
}

/**
 * KAN-1362: accessible tab rail (WAI-ARIA Tabs pattern) — arrows, Home and End move the focus and activate, and only the
 * active tab is in the tab order. The parent renders the panel for `active`; each panel carries `role="tabpanel"`,
 * `[id]="tabsId + '-panel-' + id"` and `[attr.aria-labelledby]="tabsId + '-tab-' + id"`.
 */
@Component({
  selector: 'app-tabs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tabs" role="tablist" [attr.aria-label]="label()">
      @for (t of tabs(); track t.id; let i = $index) {
        <button
          #tabBtn
          type="button"
          role="tab"
          class="tabs__item"
          [class.is-active]="t.id === active()"
          [id]="tabsId() + '-tab-' + t.id"
          [attr.aria-selected]="t.id === active()"
          [attr.aria-controls]="tabsId() + '-panel-' + t.id"
          [attr.tabindex]="t.id === active() ? 0 : -1"
          [attr.data-testid]="tabsId() + '-tab-' + t.id"
          (click)="select(t.id)"
          (keydown)="onKey($event, i)"
        >
          {{ t.label }}
          @if (t.badge != null) {
            <span class="tabs__badge" [class.tabs__badge--warn]="t.tone === 'warn'">{{ t.badge }}</span>
          }
        </button>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .tabs {
      display: flex;
      flex-wrap: nowrap;
      gap: var(--sp-1);
      overflow-x: auto;
      scrollbar-width: thin;
      border-bottom: 1px solid var(--border);
    }
    .tabs__item {
      display: inline-flex;
      align-items: center;
      gap: var(--sp-2);
      padding: var(--sp-2) var(--sp-3);
      border: 0;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      background: transparent;
      color: var(--text-2);
      font: inherit;
      font-size: var(--fs-sm);
      font-weight: 600;
      white-space: nowrap;
      cursor: pointer;
      transition: color var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease);
    }
    .tabs__item:hover {
      color: var(--text);
    }
    .tabs__item.is-active {
      color: var(--text);
      border-bottom-color: var(--accent);
    }
    .tabs__item:focus-visible {
      outline: none;
      box-shadow: var(--focus-ring);
      border-radius: var(--r-sm);
    }
    .tabs__badge {
      min-width: 1.4rem;
      padding: 0 var(--sp-1);
      border-radius: var(--r-pill);
      background: var(--surface-2);
      color: var(--text-2);
      font-family: var(--font-mono);
      font-size: var(--fs-2xs);
      font-weight: 700;
      text-align: center;
    }
    .tabs__badge--warn {
      background: var(--warn-bg);
      color: var(--warn);
    }
  `,
})
export class Tabs {
  readonly tabs = input.required<readonly TabItem[]>();
  /** Prefix of the tab and panel ids; unique per page. */
  readonly tabsId = input.required<string>();
  readonly label = input<string>('Sections');
  readonly active = model.required<string>();

  private readonly buttons = viewChildren<ElementRef<HTMLButtonElement>>('tabBtn');

  protected select(id: string): void {
    this.active.set(id);
  }

  protected onKey(event: KeyboardEvent, index: number): void {
    const count = this.tabs().length;
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
        next = (index + 1) % count;
        break;
      case 'ArrowLeft':
        next = (index - 1 + count) % count;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = count - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    this.select(this.tabs()[next].id);
    this.buttons()[next]?.nativeElement.focus();
  }
}
