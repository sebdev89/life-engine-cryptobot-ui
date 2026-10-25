import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';

/** Rows of page `page` (0-based) of size `size`; clamps `page` when the list shrank. */
export function pageSlice<T>(rows: readonly T[], page: number, size: number): T[] {
  const last = Math.max(0, Math.ceil(rows.length / size) - 1);
  const p = Math.min(Math.max(0, page), last);
  return rows.slice(p * size, p * size + size);
}

/**
 * KAN-1362: compact pager (Previous · «Page x of n · total» · Next), so a long list does not push the page down. The
 * parent cuts the rows with {@link pageSlice}; `page` is 0-based and clamps itself when `total` changes.
 */
@Component({
  selector: 'app-pager',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (pageCount() > 1) {
      <nav class="pager" [attr.aria-label]="label()">
        <button type="button" class="btn pager__btn" [disabled]="current() === 0" (click)="go(current() - 1)">Previous</button>
        <span class="pager__info" aria-live="polite">Page {{ current() + 1 }} of {{ pageCount() }} · {{ total() }} {{ noun() }}</span>
        <button type="button" class="btn pager__btn" [disabled]="current() >= pageCount() - 1" (click)="go(current() + 1)">Next</button>
      </nav>
    }
  `,
  styles: `
    .pager {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--sp-3);
      margin-top: var(--sp-3);
    }
    .pager__btn {
      padding: var(--sp-1) var(--sp-3);
      font-size: var(--fs-xs);
    }
    .pager__info {
      color: var(--text-2);
      font-size: var(--fs-xs);
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class Pager {
  readonly total = input.required<number>();
  readonly size = input(15);
  readonly noun = input('rows');
  readonly label = input('Pages');
  readonly page = model(0);

  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.total() / this.size())));
  protected readonly current = computed(() => Math.min(this.page(), this.pageCount() - 1));

  protected go(p: number): void {
    this.page.set(Math.min(Math.max(0, p), this.pageCount() - 1));
  }
}
