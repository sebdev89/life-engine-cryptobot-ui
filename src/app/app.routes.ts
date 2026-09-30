import { Routes } from '@angular/router';
import { Landing } from './landing/landing';

// KAN-789: the operator dashboard moved to /console; lazy now that `/` is the public landing.
const consoleView = () => import('./dashboard/dashboard').then((m) => m.Dashboard);

// KAN-576: the demo path as one live screen; lazy so the dashboard's initial bundle does not pay for it.
const live = () => import('./live/live').then((m) => m.LiveOperation);

// KAN-785: Demo Mode, lazy for the same reason.
const demo = () => import('./demo/demo').then((m) => m.DemoMode);

// KAN-787: Control Tower — KPIs counted from the API and the latest executions with their phase.
const tower = () => import('./tower/tower').then((m) => m.ControlTower);

// KAN-788: Proof view — anchors, inclusion path folded in the browser, server verification.
const proof = () => import('./proof/proof').then((m) => m.ProofView);

export const routes: Routes = [
  { path: '', component: Landing, pathMatch: 'full' },
  { path: 'console', loadComponent: consoleView },
  { path: 'live', loadComponent: live },
  { path: 'live/:proposalId', loadComponent: live },
  { path: 'demo', loadComponent: demo },
  { path: 'tower', loadComponent: tower },
  { path: 'proof', loadComponent: proof },
  { path: 'proof/:root', loadComponent: proof },
  { path: '**', redirectTo: '' },
];
