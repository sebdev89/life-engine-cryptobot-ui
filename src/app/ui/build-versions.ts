import { Component, OnInit, signal } from '@angular/core';
import { uiConfig } from '../config';

/** What `/version.json` (written by the image at start) and `GET /api/cryptobot/health` say about the build. */
export interface UiVersionDoc {
  ui?: { name?: string; version?: string; commit?: string };
}
export interface ServiceHealthDoc {
  commit?: string;
  version?: string;
}

/** `UI 0a75af6 · service 8af0831`; a side that did not answer (or has no commit) shows `?`. */
export function versionLine(ui: UiVersionDoc | null, service: ServiceHealthDoc | null): string {
  const u = ui?.ui?.commit || '?';
  const s = service?.commit && service.commit !== 'unknown' ? service.commit : '?';
  return `UI ${u} · service ${s}`;
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { cache: 'no-store' });
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

/**
 * KAN-1359: which builds answer this page — the UI's commit from its own `/version.json` and the service's from its
 * public health endpoint. Neither needs a session. Not shown in the public replay (it has no backend).
 */
@Component({
  selector: 'app-build-versions',
  standalone: true,
  template: `<p class="build-versions" data-testid="build-versions" [title]="detail()">{{ line() }}</p>`,
  styles: `
    .build-versions {
      margin: var(--sp-3) 0 0;
      font-family: var(--font-mono);
      font-size: var(--fs-2xs);
      color: var(--text-3);
    }
  `,
})
export class BuildVersions implements OnInit {
  readonly line = signal(versionLine(null, null));
  readonly detail = signal('');

  async ngOnInit(): Promise<void> {
    const [ui, service] = await Promise.all([
      getJson<UiVersionDoc>('version.json'),
      getJson<ServiceHealthDoc>(`${uiConfig().cryptobotBase}/api/cryptobot/health`),
    ]);
    this.line.set(versionLine(ui, service));
    this.detail.set([ui?.ui?.version && `UI ${ui.ui.version}`, service?.version && `service ${service.version}`].filter(Boolean).join(' · '));
  }
}
