import { Routes } from '@angular/router';
import { Landing } from './landing/landing';
import { PUBLIC_DEMO } from './public-demo/flag';

// The demo path as one live screen; lazy so the dashboard's initial bundle does not pay for it.
const live = () => import('./live/live').then((m) => m.LiveOperation);

// Guided replay — the nine links of the Proof of Value chain, step by step (?step=N).
const tour = () => import('./tour/tour').then((m) => m.Tour);

// Control Tower — KPIs counted from the API and the latest executions with their phase.
const tower = () => import('./tower/tower').then((m) => m.ControlTower);

// Proof view — anchors, inclusion path folded in the browser, server verification.
const proof = () => import('./proof/proof').then((m) => m.ProofView);

// Policies — the rules a proposal was decided under, read from the proposal itself.
const policies = () => import('./policies/policies').then((m) => m.PoliciesView);

// Proof of Value — accepted outcomes, who contributed, and their Solana anchor.
const value = () => import('./value/value-list').then((m) => m.ValueList);
const valueDetail = () => import('./value/value-detail').then((m) => m.ValueDetail);

const identities = () => import('./value/identity-list').then((m) => m.IdentityList);
const identityProfile = () => import('./value/identity-profile').then((m) => m.IdentityProfilePage);
const revenueList = () => import('./value/revenue-list').then((m) => m.RevenueList);
const revenueDetail = () => import('./value/revenue-detail').then((m) => m.RevenueDetail);
const treasury = () => import('./value/treasury').then((m) => m.TreasuryPage);
const ledger = () => import('./value/ledger').then((m) => m.Ledger);

// The operator screens (console, Demo Mode, Recovery) are declared inline below, inside the
// PUBLIC_DEMO condition: that is what lets the public build drop their chunks entirely.

export const routes: Routes = [
  { path: '', title: 'Proof of Value on Solana · CryptoBot', component: Landing, pathMatch: 'full' },
  { path: 'tour', title: 'Replay the run · CryptoBot', loadComponent: tour },
  { path: 'live', title: 'Execution · CryptoBot', loadComponent: live },
  { path: 'live/:proposalId', title: 'Execution · CryptoBot', loadComponent: live },
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
  { path: 'policies', title: 'Policies · CryptoBot', loadComponent: policies },
  // Operator screens: not registered at all in the public replay build (not even as chunks).
  ...(PUBLIC_DEMO
    ? []
    : [
      { path: 'console', title: 'Console · CryptoBot', loadComponent: () => import('./dashboard/dashboard').then((m) => m.Dashboard) },
      { path: 'demo', title: 'Demo Mode · CryptoBot', loadComponent: () => import('./demo/demo').then((m) => m.DemoMode) },
      { path: 'recovery', title: 'Recovery · CryptoBot', loadComponent: () => import('./recovery/recovery').then((m) => m.RecoveryView) },
      ]),
  { path: '**', redirectTo: '' },
];

