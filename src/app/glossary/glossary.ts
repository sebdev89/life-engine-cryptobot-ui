import { Component, ElementRef, computed, effect, input, output, signal, viewChild } from '@angular/core';
import { GLOSSARY, GLOSSARY_CATEGORIES, GlossaryCategory, GlossaryEntry } from './glossary-data';

/** Lowercase + strip diacritics so "criptografia" matches "Criptografía" and "PDA" matches "pda". */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Filter + rank the glossary. Term matches come first (prefix before substring), then definition matches;
 * ties keep Spanish alphabetical order. Empty query → whole (optionally category-filtered) glossary, sorted.
 */
export function filterGlossary(
  entries: readonly GlossaryEntry[],
  query: string,
  category: GlossaryCategory | null,
): GlossaryEntry[] {
  const q = normalize(query);
  const inCategory = category ? entries.filter((e) => e.category === category) : [...entries];
  const byTerm = (a: GlossaryEntry, b: GlossaryEntry) => a.term.localeCompare(b.term, 'es', { sensitivity: 'base' });
  if (!q) {
    return inCategory.sort(byTerm);
  }
  const rank = (e: GlossaryEntry): number => {
    const t = normalize(e.term);
    if (t === q) return 0;
    if (t.startsWith(q)) return 1;
    if (t.includes(q)) return 2;
    if (normalize(e.definition).includes(q)) return 3;
    return -1;
  };
  return inCategory
    .map((e) => ({ e, r: rank(e) }))
    .filter((x) => x.r >= 0)
    .sort((a, b) => a.r - b.r || byTerm(a.e, b.e))
    .map((x) => x.e);
}

@Component({
  selector: 'app-glossary',
  standalone: true,
  templateUrl: './glossary.html',
  styleUrl: './glossary.scss',
})
export class Glossary {
  readonly open = input(false);
  readonly closed = output<void>();

  readonly categories = GLOSSARY_CATEGORIES;
  readonly total = GLOSSARY.length;

  readonly query = signal('');
  readonly category = signal<GlossaryCategory | null>(null);

  readonly results = computed(() => filterGlossary(GLOSSARY, this.query(), this.category()));

  /** Per-category counts for the chips — independent of the current query so the chips stay stable. */
  readonly counts = computed(() => {
    const m = new Map<GlossaryCategory, number>();
    for (const e of GLOSSARY) m.set(e.category, (m.get(e.category) ?? 0) + 1);
    return m;
  });

  private readonly searchBox = viewChild<ElementRef<HTMLInputElement>>('searchBox');

  constructor() {
    effect(() => {
      if (this.open()) {
        // Wait one frame so the drawer is visible before focusing (hidden inputs refuse focus).
        requestAnimationFrame(() => this.searchBox()?.nativeElement.focus());
      }
    });
  }

  onQuery(v: string): void {
    this.query.set(v);
  }

  pickCategory(c: GlossaryCategory | null): void {
    this.category.set(this.category() === c ? null : c);
  }

  clear(): void {
    this.query.set('');
    this.category.set(null);
    this.searchBox()?.nativeElement.focus();
  }

  close(): void {
    this.closed.emit();
  }

  onKeydown(ev: KeyboardEvent): void {
    if (ev.key === 'Escape') {
      ev.stopPropagation();
      this.close();
    }
  }
}
