import { Routes } from '@angular/router';
import { Dashboard } from './dashboard/dashboard';

// KAN-576: the demo path as one live screen; lazy so the dashboard's initial bundle does not pay for it.
const live = () => import('./live/live').then((m) => m.LiveOperation);

// KAN-785: Demo Mode, lazy for the same reason.
const demo = () => import('./demo/demo').then((m) => m.DemoMode);

export const routes: Routes = [
  { path: '', component: Dashboard, pathMatch: 'full' },
  { path: 'live', loadComponent: live },
  { path: 'live/:proposalId', loadComponent: live },
  { path: 'demo', loadComponent: demo },
  { path: '**', redirectTo: '' },
];
