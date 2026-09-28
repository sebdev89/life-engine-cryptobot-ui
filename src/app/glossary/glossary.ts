import { Component, ElementRef, OnDestroy, computed, effect, input, output, signal, viewChild } from '@angular/core';
import { GLOSSARY, GLOSSARY_CATEGORIES, GlossaryCategory, GlossaryEntry } from './glossary-data';
import { GlossaryEvent, GlossaryTelemetry, glossaryTelemetry } from './glossary-telemetry';

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

/**
 * KAN-353 — the `search` event for a settled query: `hit` says whether it matched anything and
 * `term` is the entry the query resolved to (the top-ranked result), never the query text itself.
 * `null` for an empty query (clearing the box is not a search).
 */
export function searchEvent(query: string, results: readonly GlossaryEntry[]): GlossaryEvent | null {
  if (!normalize(query)) return null;
  const top = results[0];
  return top ? { action: 'search', term: top.term, hit: true } : { action: 'search', hit: false };
}

/** Idle time after the last keystroke before a search counts (one event per settled query, not per key). */
export const SEARCH_SETTLE_MS = 700;

@Component({
  selector: 'app-glossary',
  standalone: true,
  templateUrl: './glossary.html',
  styleUrl: './glossary.scss',
})
export class Glossary implements OnDestroy {
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

  /** The one entry whose definition is unfolded (accordion); opening it is the `open` event. */
  readonly expanded = signal<string | null>(null);
  /** Term whose definition was just copied, for the "Copiado" hint. */
  readonly copied = signal<string | null>(null);

  private readonly searchBox = viewChild<ElementRef<HTMLInputElement>>('searchBox');
  private readonly telemetry: GlossaryTelemetry = glossaryTelemetry;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSearchReported = '';
  private copiedTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.telemetry.bindLifecycle();
    effect(() => {
      if (this.open()) {
        // Wait one frame so the drawer is visible before focusing (hidden inputs refuse focus).
        requestAnimationFrame(() => this.searchBox()?.nativeElement.focus());
      }
    });
  }

  onQuery(v: string): void {
    this.query.set(v);
    this.expanded.set(null);
    if (this.searchTimer !== null) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.searchTimer = null;
      this.reportSearch();
    }, SEARCH_SETTLE_MS);
  }

  pickCategory(c: GlossaryCategory | null): void {
    this.category.set(this.category() === c ? null : c);
  }

  clear(): void {
    this.query.set('');
    this.category.set(null);
    this.expanded.set(null);
    this.lastSearchReported = '';
    this.searchBox()?.nativeElement.focus();
  }

  /** Unfold one term (fold it again on a second click). Unfolding is what gets counted. */
  toggle(e: GlossaryEntry): void {
    if (this.expanded() === e.term) {
      this.expanded.set(null);
      return;
    }
    this.expanded.set(e.term);
    this.telemetry.record({ action: 'open', term: e.term });
  }

  isExpanded(e: GlossaryEntry): boolean {
    return this.expanded() === e.term;
  }

  async copy(e: GlossaryEntry, ev?: Event): Promise<void> {
    ev?.stopPropagation();
    try {
      await navigator.clipboard?.writeText(`${e.term}: ${e.definition}`);
    } catch {
      // Clipboard denied (insecure context / permissions): nothing to do, the text is on screen.
    }
    this.telemetry.record({ action: 'copy', term: e.term });
    this.copied.set(e.term);
    if (this.copiedTimer !== null) clearTimeout(this.copiedTimer);
    this.copiedTimer = setTimeout(() => this.copied.set(null), 1500);
  }

  close(): void {
    if (this.searchTimer !== null) {
      clearTimeout(this.searchTimer);
      this.searchTimer = null;
      this.reportSearch();
    }
    this.telemetry.flush();
    this.closed.emit();
  }

  onKeydown(ev: KeyboardEvent): void {
    if (ev.key === 'Escape') {
      ev.stopPropagation();
      this.close();
    }
  }

  ngOnDestroy(): void {
    if (this.searchTimer !== null) clearTimeout(this.searchTimer);
    if (this.copiedTimer !== null) clearTimeout(this.copiedTimer);
    this.telemetry.flush();
  }

  /** One `search` event per settled, non-empty, changed query. */
  private reportSearch(): void {
    const q = normalize(this.query());
    if (!q || q === this.lastSearchReported) return;
    this.lastSearchReported = q;
    const ev = searchEvent(this.query(), this.results());
    if (ev) this.telemetry.record(ev);
  }
}
