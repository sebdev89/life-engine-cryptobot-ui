import { Routes } from '@angular/router';
import { Dashboard } from './dashboard/dashboard';

// KAN-576: the demo path as one live screen; lazy so the dashboard's initial bundle does not pay for it.
const live = () => import('./live/live').then((m) => m.LiveOperation);

export const routes: Routes = [
  { path: '', component: Dashboard, pathMatch: 'full' },
  { path: 'live', loadComponent: live },
  { path: 'live/:proposalId', loadComponent: live },
  { path: '**', redirectTo: '' },
];
