// Ledger & Larder — event wiring, one job: attach every control on the
// page that was just rendered, and call rerender() when state changes.
// All state lives in the object main.js passes in; nothing here touches
// storage, cookies or the network.
import { parseAmount, toCents, fromCents } from './budgetMath.js';

// Filter/sort memory for the Transactions page, kept for the session.
const txView = { category: 'all', type: 'all', search: '', sort: 'date-desc' };
// Chart choice for the Reports page, kept for the session.
let chartMode = 'category';

export function getChartMode() {
  return chartMode;
}

export function filteredTransactions(state) {
  let rows = state.transactions.filter((row) => {
    if (txView.category !== 'all' && row.category !== txView.category) return false;
    if (txView.type !== 'all' && row.type !== txView.type) return false;
    if (txView.search && !row.payee.toLowerCase().includes(txView.search.toLowerCase())) return false;
    return true;
  });
  const byDate = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  if (txView.sort === 'date-asc') rows = rows.sort((a, b) => byDate(a, b));
  else if (txView.sort === 'date-desc') rows = rows.sort((a, b) => -byDate(a, b));
  else if (txView.sort === 'amount-desc') rows = rows.sort((a, b) => toCents(b.amount) - toCents(a.amount));
  else if (txView.sort === 'amount-asc') rows = rows.sort((a, b) => toCents(a.amount) - toCents(b.amount));
  return { rows, category: txView.category, type: txView.type, search: txView.search, sort: txView.sort };
}

function showError(element, message) {
  if (element) element.textContent = message;
}

function wireTransactions(state, rerender) {
  const category = document.querySelector('#filter-category');
  const type = document.querySelector('#filter-type');
  const search = document.querySelector('#search-payee');
  const sort = document.querySelector('#sort-by');
  if (category) category.addEventListener('change', () => { txView.category = category.value; rerender(); });
  if (type) type.addEventListener('change', () => { txView.type = type.value; rerender(); });
  if (search) search.addEventListener('input', () => { txView.search = search.value; rerender(); });
  if (sort) sort.addEventListener('change', () => { txView.sort = sort.value; rerender(); });
  const form = document.querySelector('#add-tx-form');
  if (!form) return;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const error = document.querySelector('#add-error');
    const date = document.querySelector('#add-date').value;
    const payee = document.querySelector('#add-payee').value.trim();
    const categoryValue = document.querySelector('#add-category').value;
    const cents = parseAmount(document.querySelector('#add-amount').value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { showError(error, 'Pick a valid date in November 2026.'); return; }
    if (!payee) { showError(error, 'Give the purchase a payee, e.g. the shop name.'); return; }
    if (cents === null) { showError(error, 'Enter an amount above $0 with at most two decimal places, e.g. 45.00.'); return; }
    state.transactions.push({ date, payee, category: categoryValue, type: 'spending', amount: fromCents(cents) });
    state.transactions.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    rerender();
  });
}

function wireBudgets(state, rerender) {
  document.querySelectorAll('.budget-row').forEach((row) => {
    const slug = row.dataset.category;
    const input = row.querySelector('input');
    const button = row.querySelector('button');
    const error = row.querySelector('.adjust-error');
    if (!input || !button) return;
    button.addEventListener('click', () => {
      const cents = parseAmount(input.value);
      if (cents === null) { showError(error, 'Enter a limit above $0, e.g. 600.'); return; }
      const category = state.categories.find((c) => c.slug === slug);
      if (!category) return;
      category.limit = fromCents(cents);
      rerender();
    });
  });
}

function wireGoals(state, rerender) {
  document.querySelectorAll('.goal-row').forEach((row) => {
    const slug = row.dataset.goal;
    const input = row.querySelector('input');
    const button = row.querySelector('button');
    const error = row.querySelector('.adjust-error');
    if (!input || !button) return;
    button.addEventListener('click', () => {
      const cents = parseAmount(input.value);
      if (cents === null) { showError(error, 'Enter an amount above $0, e.g. 50.00.'); return; }
      const goal = state.goals.find((g) => g.slug === slug);
      if (!goal) return;
      goal.saved = fromCents(toCents(goal.saved) + cents);
      rerender();
    });
  });
}

function wireBills(state, rerender) {
  document.querySelectorAll('.bill-row').forEach((row) => {
    const slug = row.dataset.bill;
    const button = row.querySelector('button');
    if (!button || button.disabled) return;
    button.addEventListener('click', () => {
      const bill = state.bills.find((b) => b.slug === slug);
      if (!bill || bill.paid) return;
      bill.paid = true;
      bill.paidDate = '2026-11-28';
      rerender();
    });
  });
}

function wireReports(rerender) {
  const byCategory = document.querySelector('#chart-toggle-category');
  const byWeek = document.querySelector('#chart-toggle-week');
  const printButton = document.querySelector('#print-report');
  if (byCategory) byCategory.addEventListener('click', () => { chartMode = 'category'; rerender(); });
  if (byWeek) byWeek.addEventListener('click', () => { chartMode = 'week'; rerender(); });
  if (printButton) printButton.addEventListener('click', () => window.print());
}

export function wireControls(route, state, rerender) {
  if (route === 'transactions') wireTransactions(state, rerender);
  else if (route === 'budgets') wireBudgets(state, rerender);
  else if (route === 'goals') wireGoals(state, rerender);
  else if (route === 'bills') wireBills(state, rerender);
  else if (route === 'reports') wireReports(rerender);
}
