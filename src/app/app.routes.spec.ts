import { describe, expect, it } from 'vitest';
import { routes } from './app.routes';
import { NAV_LINKS } from './shell/top-nav';

describe('routes', () => {
  it('gives every screen its own tab title', () => {
    for (const r of routes.filter((x) => x.redirectTo === undefined)) {
      expect(typeof r.title, `route "${r.path}"`).toBe('string');
      expect(r.title as string).toContain('CryptoBot');
    }
    const screens = routes.filter((r) => r.path && r.redirectTo === undefined && !r.path.includes(':')).map((r) => r.title);
    expect(new Set(screens).size).toBe(screens.length);
  });

  it('links every header entry to a real route, in the judge walk order', () => {
    const paths = new Set(routes.map((r) => '/' + r.path));
    for (const l of NAV_LINKS) expect(paths.has(l.path), l.path).toBe(true);
    expect(NAV_LINKS.map((l) => l.path)).toEqual(['/tour', '/tower', '/live', '/proof', '/value', '/recovery', '/policies', '/demo', '/console']);
  });
});
