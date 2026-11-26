// Ledger & Larder — hash router and render orchestration.
// One job: read the hash, render the matching page into <main id="app">,
// wire its controls, and mark the page ready for screenshots.
// The whole dataset lives in `state` so every control's change is
// visible on every page for the rest of the session.
import { TRANSACTIONS, CATEGORIES, GOALS, BILLS } from './data.js';
import { renderDashboard, renderTransactions, renderBudgets, renderGoals, renderBills, renderReports, renderNotFound } from './views.js';
import { wireControls, filteredTransactions, getChartMode } from './controls.js';

const state = {
  transactions: TRANSACTIONS.map((row) => ({ ...row })),
  categories: CATEGORIES.map((c) => ({ ...c })),
  goals: GOALS.map((g) => ({ ...g })),
  bills: BILLS.map((b) => ({ ...b })),
};

const NAV = [
  ['#/', 'Dashboard'],
  ['#/transactions', 'Transactions'],
  ['#/budgets', 'Budgets'],
  ['#/goals', 'Goals'],
  ['#/bills', 'Bills'],
  ['#/reports', 'Reports'],
];

function routeFromHash() {
  const hash = window.location.hash || '#/';
  if (hash === '#/' || hash === '#') return 'dashboard';
  const match = /^#\/([a-z-]+)/.exec(hash);
  if (!match) return 'notfound';
  const known = ['transactions', 'budgets', 'goals', 'bills', 'reports'];
  return known.includes(match[1]) ? match[1] : 'notfound';
}

function render() {
  window.__shotReady = false;
  const route = routeFromHash();
  const app = document.getElementById('app');
  if (route === 'dashboard') app.innerHTML = renderDashboard(state);
  else if (route === 'transactions') app.innerHTML = renderTransactions(state, filteredTransactions(state));
  else if (route === 'budgets') app.innerHTML = renderBudgets(state);
  else if (route === 'goals') app.innerHTML = renderGoals(state);
  else if (route === 'bills') app.innerHTML = renderBills(state);
  else if (route === 'reports') app.innerHTML = renderReports(state, getChartMode());
  else app.innerHTML = renderNotFound();
  document.querySelectorAll('header nav a').forEach((link) => {
    const here = '#' + (route === 'dashboard' ? '/' : '/' + route);
    if (link.getAttribute('href') === here) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  wireControls(route, state, render);
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

window.addEventListener('hashchange', render);
render();
