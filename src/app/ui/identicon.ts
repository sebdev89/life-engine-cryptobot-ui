import { Component, computed, input } from '@angular/core';

/** FNV-1a over the seed's UTF-16 units, then xorshift: a stable stream of 32-bit numbers per seed. */
export function seedStream(seed: string, count: number): number[] {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  const out: number[] = [];
  let x = h || 1;
  for (let i = 0; i < count; i++) {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    out.push(x);
  }
  return out;
}

/** 5×5, mirrored left/right (15 free cells), plus a hue between the chain's violet and mint. */
export function identiconCells(seed: string): { on: boolean[]; hue: number } {
  const r = seedStream(seed, 16);
  const on: boolean[] = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const c = col < 3 ? col : 4 - col;
      on.push((r[row * 3 + c] & 1) === 1);
    }
  }
  // 160 (mint) … 255 (violet)
  return { on, hue: 160 + (r[15] % 96) };
}

/**
 * A face for a wallet: the same public key always draws the same pattern, so an identity is
 * recognisable at a glance across screens. Decorative — the key itself is always shown next to it.
 */
@Component({
  selector: 'app-identicon',
  standalone: true,
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 5 5" aria-hidden="true" focusable="false" class="ident" shape-rendering="crispEdges">
      <rect width="5" height="5" rx="0.9" [attr.fill]="'hsl(' + cells().hue + ' 40% 12%)'" />
      @for (on of cells().on; track $index) {
        @if (on) {
          <rect [attr.x]="$index % 5" [attr.y]="floor($index / 5)" width="1" height="1" [attr.fill]="'hsl(' + cells().hue + ' 70% 62%)'" />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    .ident {
      border-radius: 22%;
      box-shadow: 0 0 0 1px var(--glass-border);
    }
  `,
})
export class Identicon {
  readonly seed = input.required<string>();
  readonly size = input<number>(40);
  readonly cells = computed(() => identiconCells(this.seed()));
  readonly floor = Math.floor;
}
