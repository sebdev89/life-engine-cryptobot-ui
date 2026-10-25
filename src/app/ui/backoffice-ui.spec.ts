import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Tabs, TabItem } from './tabs';
import { Pager, pageSlice } from './pager';
import { PageBar } from './page-bar';

describe('pageSlice (KAN-1362)', () => {
  const rows = Array.from({ length: 23 }, (_, i) => i);
  it('cuts the page and clamps it when the list shrank', () => {
    expect(pageSlice(rows, 0, 10)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(pageSlice(rows, 2, 10)).toEqual([20, 21, 22]);
    expect(pageSlice(rows, 9, 10)).toEqual([20, 21, 22]);
    expect(pageSlice([], 3, 10)).toEqual([]);
  });
});

describe('Tabs (KAN-1362)', () => {
  const tabs: TabItem[] = [
    { id: 'a', label: 'A' },
    { id: 'b', label: 'B', badge: 3, tone: 'warn' },
    { id: 'c', label: 'C', badge: 0 },
  ];

  it('marks the active tab, shows badges and moves with the arrows, Home and End', () => {
    const f = TestBed.createComponent(Tabs);
    f.componentRef.setInput('tabs', tabs);
    f.componentRef.setInput('tabsId', 't');
    f.componentRef.setInput('active', 'a');
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    const btns = () => Array.from(el.querySelectorAll('[role=tab]')) as HTMLButtonElement[];
    expect(btns().map((b) => b.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
    expect(btns().map((b) => b.tabIndex)).toEqual([0, -1, -1]);
    expect(el.querySelector('.tabs__badge--warn')?.textContent).toBe('3');
    expect(el.querySelectorAll('.tabs__badge').length).toBe(2); // a badge of 0 is still a count

    btns()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    f.detectChanges();
    expect(f.componentInstance.active()).toBe('c');
    btns()[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home' }));
    f.detectChanges();
    expect(f.componentInstance.active()).toBe('a');
    btns()[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
    f.detectChanges();
    expect(f.componentInstance.active()).toBe('c');
    btns()[1].click();
    f.detectChanges();
    expect(f.componentInstance.active()).toBe('b');
    expect(btns()[1].getAttribute('aria-controls')).toBe('t-panel-b');
  });
});

describe('Pager (KAN-1362)', () => {
  it('hides itself with one page and walks pages without leaving the range', () => {
    const f = TestBed.createComponent(Pager);
    f.componentRef.setInput('total', 5);
    f.componentRef.setInput('size', 10);
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('nav')).toBeNull();

    f.componentRef.setInput('total', 31);
    f.detectChanges();
    expect(el.querySelector('.pager__info')?.textContent).toContain('Page 1 of 4 · 31 rows');
    const [prev, next] = Array.from(el.querySelectorAll('button')) as HTMLButtonElement[];
    expect(prev.disabled).toBe(true);
    next.click();
    next.click();
    next.click();
    next.click();
    f.detectChanges();
    expect(f.componentInstance.page()).toBe(3);
    expect(next.disabled).toBe(true);
  });
});

describe('PageBar (KAN-1362)', () => {
  it('renders the title and the counters with their tone in one header', () => {
    const f = TestBed.createComponent(PageBar);
    f.componentRef.setInput('title', 'Live execution');
    f.componentRef.setInput('stats', [
      { label: 'open', value: 3, tone: 'warn' },
      { label: 'stages', value: '7/8' },
    ]);
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Live execution');
    const stats = Array.from(el.querySelectorAll('.page-bar__stat')) as HTMLElement[];
    expect(stats.map((s) => s.dataset['tone'])).toEqual(['warn', 'neutral']);
    expect(stats[0].textContent).toContain('3 open');
  });
});
