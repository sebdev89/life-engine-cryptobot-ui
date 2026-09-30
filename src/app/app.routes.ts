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

// KAN-790: Recovery — the dead-letter queue, the human decision on each letter, and demo-only chaos.
const recovery = () => import('./recovery/recovery').then((m) => m.RecoveryView);

// KAN-791: Policies — the rules a proposal was decided under, read from the proposal itself.
const policies = () => import('./policies/policies').then((m) => m.PoliciesView);

// KAN-828: Proof of Value — accepted outcomes, who contributed, and their Solana anchor.
const value = () => import('./value/value-list').then((m) => m.ValueList);
const valueDetail = () => import('./value/value-detail').then((m) => m.ValueDetail);

const identities = () => import('./value/identity-list').then((m) => m.IdentityList);
const identityProfile = () => import('./value/identity-profile').then((m) => m.IdentityProfilePage);
const revenueList = () => import('./value/revenue-list').then((m) => m.RevenueList);
const revenueDetail = () => import('./value/revenue-detail').then((m) => m.RevenueDetail);
const treasury = () => import('./value/treasury').then((m) => m.TreasuryPage);
const ledger = () => import('./value/ledger').then((m) => m.Ledger);

export const routes: Routes = [
  { path: '', title: 'CryptoBot — trusted execution for financial AI agents', component: Landing, pathMatch: 'full' },
  { path: 'console', title: 'Console · CryptoBot', loadComponent: consoleView },
  { path: 'live', title: 'Execution · CryptoBot', loadComponent: live },
  { path: 'live/:proposalId', title: 'Execution · CryptoBot', loadComponent: live },
  { path: 'demo', title: 'Demo Mode · CryptoBot', loadComponent: demo },
  { path: 'tower', title: 'Control Tower · CryptoBot', loadComponent: tower },
  { path: 'proof', title: 'Proof · CryptoBot', loadComponent: proof },
  { path: 'proof/:root', title: 'Proof · CryptoBot', loadComponent: proof },
  { path: 'value', title: 'Proof of Value · CryptoBot', loadComponent: value },
  { path: 'value/identities', title: 'Identities · CryptoBot', loadComponent: identities },
  { path: 'value/identities/:id', title: 'Identity · CryptoBot', loadComponent: identityProfile },
  { path: 'value/ledger', title: 'Units ledger · CryptoBot', loadComponent: ledger },
  { path: 'value/revenue', title: 'Revenue · CryptoBot', loadComponent: revenueList },
  { path: 'value/revenue/:id', title: 'Revenue event · CryptoBot', loadComponent: revenueDetail },
  { path: 'value/treasury', title: 'Treasury · CryptoBot', loadComponent: treasury },
  { path: 'value/:id', title: 'Value event · CryptoBot', loadComponent: valueDetail },
  { path: 'recovery', title: 'Recovery · CryptoBot', loadComponent: recovery },
  { path: 'policies', title: 'Policies · CryptoBot', loadComponent: policies },
  { path: '**', redirectTo: '' },
];
