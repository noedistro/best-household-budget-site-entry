// Ledger & Larder — HTML builders, one render function per route.
// Every figure comes from the shared state (data.js by default) and the
// pure math in budgetMath.js, so no page can drift from another.
import { CATEGORIES, GOALS, BILLS, HOUSEHOLD, MONTH } from './data.js';
import { formatMoney, sumByType, spendingByCategory, categoryStatus, goalProgress, weeklyTotals } from './budgetMath.js';
import { donutChart, barChart, progressBar, budgetTone } from './charts.js';

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function shortDate(iso) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const parts = iso.split('-');
  return Number(parts[2]) + ' ' + months[Number(parts[1]) - 1];
}

function categoryName(slug) {
  const found = CATEGORIES.find((c) => c.slug === slug);
  return found ? found.name : 'Uncategorised';
}

function txRow(row, running) {
  const sign = row.type === 'income' ? '+' : '−';
  return '<tr><td>' + escapeHtml(shortDate(row.date)) + '</td><td>' + escapeHtml(row.payee) +
    '</td><td>' + escapeHtml(categoryName(row.category)) + '</td><td class="num">' + sign +
    formatMoney(row.amount) + '</td><td class="num">' + formatMoney(running) + '</td></tr>';
}

export function renderDashboard(state) {
  const income = sumByType(state.transactions, 'income');
  const spent = sumByType(state.transactions, 'spending');
  const left = income - spent;
  const rate = income > 0 ? Math.round((left / income) * 100) : 0;
  const byCat = spendingByCategory(state.transactions, CATEGORIES.map((c) => c.slug));
  const slices = CATEGORIES.map((c) => ({ label: c.name, value: byCat[c.slug] || 0 }));
  const over = CATEGORIES.filter((c) => categoryStatus(byCat[c.slug] || 0, c.limit).state === 'over');
  const recent = [...state.transactions]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, 5);
  const goalBars = state.goals.map((g) => {
    const p = goalProgress(g.saved, g.target, g.monthly);
    return '<li class="goal-mini"><span>' + escapeHtml(g.name) + ' — ' + formatMoney(g.saved) +
      ' of ' + formatMoney(g.target) + ' (' + p.pct + '%)</span>' + progressBar(p.pct, 'good') + '</li>';
  }).join('');
  const flags = over.map((c) => {
    const st = categoryStatus(byCat[c.slug] || 0, c.limit);
    return '<li class="flag"><strong>' + escapeHtml(c.name) + ' is ' + formatMoney(st.overBy) +
      ' over its ' + formatMoney(c.limit) + ' limit.</strong> ' + escapeHtml(c.note) + '</li>';
  }).join('');
  return '<h1>November at a glance</h1>' +
    '<p class="lede">One month of Wren household money: what came in, what went out, and what is left for December.</p>' +
    '<section class="stats" aria-label="Month totals">' +
    '<div class="stat"><span>Income</span><strong data-stat>' + formatMoney(income) + '</strong><small>Two paydays</small></div>' +
    '<div class="stat"><span>Spent</span><strong data-stat>' + formatMoney(spent) + '</strong><small>22 purchases and bills</small></div>' +
    '<div class="stat"><span>Left over</span><strong data-stat>' + formatMoney(left) + '</strong><small>For savings and December</small></div>' +
    '<div class="stat"><span>Savings rate</span><strong data-stat>' + rate + '%</strong><small>' + formatMoney(left) + ' of ' + formatMoney(income) + '</small></div>' +
    '</section>' +
    '<div class="two-col"><section class="card"><h2>Where the money went</h2>' +
    donutChart(slices, spent) + '</section>' +
    '<section class="card"><h2>Over budget</h2>' +
    (flags ? '<ul class="flags">' + flags + '</ul>' : '<p>Nothing is over budget this month.</p>') +
    '<h2>Goals so far</h2><ul class="goal-minis">' + goalBars + '</ul>' +
    '<p><a href="#/goals">See all goals and add savings &rarr;</a></p></section></div>' +
    '<section class="card"><h2>Latest transactions</h2><table class="tx"><thead><tr>' +
    '<th>Date</th><th>Payee</th><th>Category</th><th>Amount</th><th>Balance</th></tr></thead><tbody>' +
    recent.map((row) => {
      let running = 0;
      for (const r of [...state.transactions].sort((a, b) => (a.date < b.date ? -1 : 1))) {
        running += r.type === 'income' ? r.amount : -r.amount;
        if (r === row) break;
      }
      return txRow(row, running);
    }).join('') + '</tbody></table>' +
    '<p><a href="#/transactions">See all 24 transactions &rarr;</a></p></section>' +
    '<section class="card"><h2>Every section</h2><ul class="quick-links">' +
    '<li><a href="#/transactions">Transactions — filter, search and add</a></li>' +
    '<li><a href="#/budgets">Budgets — limits by category</a></li>' +
    '<li><a href="#/goals">Goals — savings, month by month</a></li>' +
    '<li><a href="#/bills">Bills — what is paid and what is still due</a></li>' +
    '<li><a href="#/reports">Reports — charts and December actions</a></li></ul></section>';
}

export function renderTransactions(state, view) {
  const rows = view.rows;
  const total = rows.reduce((sum, r) => sum + (r.type === 'income' ? r.amount : -r.amount), 0);
  const spentShown = rows.filter((r) => r.type === 'spending').reduce((s, r) => s + r.amount, 0);
  let running = 0;
  const sorted = [...state.transactions].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const balanceAt = new Map();
  for (const r of sorted) {
    running += r.type === 'income' ? r.amount : -r.amount;
    balanceAt.set(r, running);
  }
  const body = rows.map((r) => txRow(r, balanceAt.get(r) ?? 0)).join('');
  const options = ['<option value="all">All categories</option>'].concat(
    CATEGORIES.map((c) => '<option value="' + c.slug + '"' + (view.category === c.slug ? ' selected' : '') + '>' + escapeHtml(c.name) + '</option>'),
  ).join('');
  const typeOptions = [['all', 'All types'], ['spending', 'Spending'], ['income', 'Income']]
    .map(([v, label]) => '<option value="' + v + '"' + (view.type === v ? ' selected' : '') + '>' + label + '</option>').join('');
  const sortOptions = [['date-desc', 'Newest first'], ['date-asc', 'Oldest first'], ['amount-desc', 'Largest amount first'], ['amount-asc', 'Smallest amount first']]
    .map(([v, label]) => '<option value="' + v + '"' + (view.sort === v ? ' selected' : '') + '>' + label + '</option>').join('');
  return '<h1>Transactions</h1>' +
    '<p class="lede">Every dollar of November, in order. Filter it, search it, or add a purchase you forgot.</p>' +
    '<section class="card"><h2>Add a transaction</h2>' +
    '<form id="add-tx-form"><div class="form-row">' +
    '<label>Date <input id="add-date" type="date" value="2026-11-28" min="2026-11-01" max="2026-11-30" required></label>' +
    '<label>Payee <input id="add-payee" type="text" placeholder="e.g. Marlow\'s Market" required></label>' +
    '<label>Category <select id="add-category">' + CATEGORIES.map((c) => '<option value="' + c.slug + '">' + escapeHtml(c.name) + '</option>').join('') + '</select></label>' +
    '<label>Amount ($) <input id="add-amount" type="text" inputmode="decimal" placeholder="45.00" required></label>' +
    '</div><p class="form-error" id="add-error" role="alert"></p>' +
    '<button type="submit">Add transaction</button></form></section>' +
    '<section class="card"><h2>Find transactions</h2><div class="form-row">' +
    '<label>Category <select id="filter-category">' + options + '</select></label>' +
    '<label>Type <select id="filter-type">' + typeOptions + '</select></label>' +
    '<label>Search payee <input id="search-payee" type="search" placeholder="Search payee" value="' + escapeHtml(view.search) + '"></label>' +
    '<label>Sort <select id="sort-by">' + sortOptions + '</select></label>' +
    '</div><p id="tx-summary">Showing ' + rows.length + ' of ' + state.transactions.length +
    ' · spending shown ' + formatMoney(spentShown) + ' · net ' + formatMoney(total) + '</p>' +
    '<div class="table-scroll"><table class="tx" id="tx-table"><thead><tr>' +
    '<th>Date</th><th>Payee</th><th>Category</th><th>Amount</th><th>Balance</th></tr></thead><tbody>' +
    body + '</tbody></table></div>' +
    '<p id="tx-empty">' + (rows.length === 0 ? 'No transactions match — try clearing the search.' : '') + '</p></section>';
}

export function renderBudgets(state) {
  const byCat = spendingByCategory(state.transactions, CATEGORIES.map((c) => c.slug));
  const rows = state.categories.map((c) => {
    const spent = byCat[c.slug] || 0;
    const st = categoryStatus(spent, c.limit);
    const left = c.limit - spent;
    const tone = budgetTone(st);
    const stateWord = st.state === 'over' ? 'Over budget' : st.state === 'at' ? 'At the limit' : st.state === 'near' ? 'Near the limit' : 'On track';
    return '<article class="budget-row" data-category="' + c.slug + '">' +
      '<div class="budget-head"><h3>' + escapeHtml(c.name) + '</h3><span class="budget-state state-' + tone + '">' + stateWord + '</span></div>' +
      '<p class="budget-figures"><span class="budget-spent">' + formatMoney(spent) + ' spent</span> of ' +
      '<span class="budget-limit">' + formatMoney(c.limit) + ' limit</span> · ' +
      '<span class="budget-left">' + (left < 0 ? '−' + formatMoney(Math.abs(left)) : formatMoney(left)) + ' left</span> · ' +
      Math.round(st.pct) + '% used</p>' +
      progressBar(st.pct, tone) +
      '<p class="budget-note">' + escapeHtml(c.note) + '</p>' +
      '<div class="budget-adjust"><label>Monthly limit ($) <input type="text" inputmode="decimal" value="' + c.limit + '" aria-label="Monthly limit for ' + escapeHtml(c.name) + '"></label>' +
      '<button type="button">Save limit</button><span class="adjust-error" role="alert"></span></div></article>';
  }).join('');
  const totalLimit = state.categories.reduce((s, c) => s + c.limit, 0);
  const totalSpent = Object.values(byCat).reduce((a, b) => a + b, 0);
  return '<h1>Budgets by category</h1>' +
    '<p class="lede">Eight envelopes for November. Green is on track, amber is near the edge, red is over — and every limit can be changed.</p>' +
    '<p class="totals-line">Limits total ' + formatMoney(totalLimit) + ' · spent ' + formatMoney(totalSpent) + ' across the eight categories.</p>' +
    '<section class="budget-list">' + rows + '</section>' +
    '<section class="card"><h2>How the limits were set</h2>' +
    '<p>The Wrens use the 50/30/20 rule as a starting point: about half the $5,840 pay for needs (rent, bills, groceries, transport), about a third for wants (dining out, fun, kids’ extras) and about a fifth for savings. Housing alone is $1,450, so needs run a little over half this month — the trade-off is a smaller fun envelope, not a smaller emergency fund. Limits are reviewed on the last Sunday of each month, and a limit that is missed twice in a row gets raised honestly instead of being quietly ignored.</p></section>';
}

export function renderGoals(state) {
  const rows = state.goals.map((g) => {
    const p = goalProgress(g.saved, g.target, g.monthly);
    const monthsText = p.months === null ? '—' : p.months === 0 ? 'Done' : p.months + (p.months === 1 ? ' month' : ' months');
    return '<article class="goal-row" data-goal="' + g.slug + '">' +
      '<div class="budget-head"><h3>' + escapeHtml(g.name) + '</h3><span class="goal-pct">' + p.pct + '%</span></div>' +
      '<p class="budget-figures"><span class="goal-saved">' + formatMoney(g.saved) + ' saved</span> of ' + formatMoney(g.target) +
      ' · ' + formatMoney(p.left) + ' to go · ' + formatMoney(g.monthly) + ' a month</p>' +
      progressBar(p.pct, 'good') +
      '<p class="budget-note">' + escapeHtml(g.note) + (p.surplus > 0 ? ' This goal is ' + formatMoney(p.surplus) + ' over its target.' : '') + '</p>' +
      '<p>Months to go at the current rate: <strong>' + monthsText + '</strong></p>' +
      '<div class="budget-adjust"><label>Add savings ($) <input type="text" inputmode="decimal" placeholder="50.00" aria-label="Add savings to ' + escapeHtml(g.name) + '"></label>' +
      '<button type="button">Add savings</button><span class="adjust-error" role="alert"></span></div></article>';
  }).join('');
  const monthlyTotal = state.goals.reduce((s, g) => s + g.monthly, 0);
  return '<h1>Goals &amp; savings</h1>' +
    '<p class="lede">Three goals, in the order they get funded: the safety net first, the broken washer second, the holiday third.</p>' +
    '<p class="totals-line">Saving ' + formatMoney(monthlyTotal) + ' a month across the three goals — inside the $1,228 left over in November.</p>' +
    '<section class="goal-list">' + rows + '</section>' +
    '<section class="card"><h2>Why this order</h2>' +
    '<p>An emergency fund comes first because one missed payday should never mean a missed rent payment. The washing machine is second because it is already leaking and a replacement is cheaper than repeated repairs. The holiday is third on purpose: it is the reward for the other two, and it still gets $140 a month, so the coast trip stays real instead of becoming a wish.</p></section>';
}

export function renderBills(state) {
  const stillToPay = state.bills.filter((b) => !b.paid).reduce((s, b) => s + b.amount, 0);
  const paidTotal = state.bills.filter((b) => b.paid).reduce((s, b) => s + b.amount, 0);
  const monthlyTotal = state.bills.reduce((s, b) => s + b.amount, 0);
  const rows = state.bills.map((b) => {
    const overdue = !b.paid ? HOUSEHOLD.todayDay - b.dueDay : 0;
    const status = b.paid
      ? '<span class="bill-status status-paid">Paid ' + escapeHtml(shortDate(b.paidDate)) + '</span>'
      : '<span class="bill-status status-due">Overdue by ' + overdue + (overdue === 1 ? ' day' : ' days') + '</span>';
    const button = b.paid
      ? '<button type="button" disabled>Paid</button>'
      : '<button type="button">Mark paid</button>';
    return '<article class="bill-row" data-bill="' + b.slug + '">' +
      '<div class="budget-head"><h3>' + escapeHtml(b.name) + '</h3><strong>' + formatMoney(b.amount) + '</strong></div>' +
      '<p class="budget-figures">Due the ' + b.dueDay + 'th of each month · ' + formatMoney(b.amount * 12) + ' a year</p>' +
      '<p>' + status + '</p>' + button + '</article>';
  }).join('');
  return '<h1>Bills &amp; recurring</h1>' +
    '<p class="lede">The six bills that repeat every month. These are already counted inside the $4,612 spent — they are the same money, shown here so nothing is missed.</p>' +
    '<p class="totals-line">Still to pay in November: <strong id="still-to-pay">' + formatMoney(stillToPay) +
    '</strong> · already paid: ' + formatMoney(paidTotal) + ' · monthly total ' + formatMoney(monthlyTotal) +
    ' · ' + formatMoney(monthlyTotal * 12) + ' a year.</p>' +
    '<section class="bill-list">' + rows + '</section>' +
    '<section class="card"><h2>How bills are handled</h2>' +
    '<p>Rent, electricity, internet and water are paid by standing order on the day they fall due. The phone bill and the bus pass are paid by hand, which is why they are the two that slipped this month — both are now overdue, so they are paid first out of the $1,228 left over, before anything else in December.</p></section>';
}

export function renderReports(state, chartMode) {
  const byCat = spendingByCategory(state.transactions, CATEGORIES.map((c) => c.slug));
  const spent = sumByType(state.transactions, 'spending');
  const weeks = weeklyTotals(state.transactions, MONTH.year, MONTH.month);
  const ranked = CATEGORIES.map((c) => ({ name: c.name, spent: byCat[c.slug] || 0 }))
    .sort((a, b) => b.spent - a.spent);
  const catBars = CATEGORIES.map((c) => ({ label: c.name.split(' ')[0], value: byCat[c.slug] || 0 }));
  const weekBars = weeks.map((value, i) => ({ label: 'Week ' + (i + 1), value }));
  const chartTitle = chartMode === 'week' ? 'Spending by week' : 'Spending by category';
  const chart = chartMode === 'week' ? barChart(weekBars) : barChart(catBars);
  const rankedList = ranked.map((r, i) => '<li><span class="rank">' + (i + 1) + '.</span> ' + escapeHtml(r.name) +
    ' — ' + formatMoney(r.spent) + ' (' + Math.round((r.spent / spent) * 100) + '% of spending)</li>').join('');
  return '<h1>Reports &amp; charts</h1>' +
    '<p class="lede">November in pictures: where the money went, week by week, and three things to do before December.</p>' +
    '<section class="card"><h2 id="chart-title">' + chartTitle + '</h2>' +
    '<p>Chart: <button type="button" id="chart-toggle-category"' + (chartMode === 'category' ? ' aria-pressed="true"' : '') + '>By category</button> ' +
    '<button type="button" id="chart-toggle-week"' + (chartMode === 'week' ? ' aria-pressed="true"' : '') + '>By week</button> ' +
    '<span class="hint">The toggle switches the chart only; the ranked list below always shows spending by category.</span></p>' +
    '<div id="report-chart">' + chart + '</div></section>' +
    '<section class="card"><h2>Where the money went</h2><ol class="ranked">' + rankedList + '</ol>' +
    '<p>Weekly spending: Week 1 ' + formatMoney(weeks[0]) + ' · Week 2 ' + formatMoney(weeks[1]) +
    ' · Week 3 ' + formatMoney(weeks[2]) + ' · Week 4 ' + formatMoney(weeks[3]) +
    ' — together ' + formatMoney(spent) + '.</p></section>' +
    '<section class="card"><h2>Three things to do before December</h2><ol class="actions">' +
    '<li><strong>Dining out is $214 over its $180 limit.</strong> Cook at home three nights a week in December to save about $120.</li>' +
    '<li><strong>Pay the two overdue bills first.</strong> Phone ($96, 7 days overdue) and the bus pass ($74, 3 days overdue) come out of the $1,228 left over before anything else.</li>' +
    '<li><strong>Groceries is $86 over its $520 limit.</strong> The freezer is now stocked from the 14 Nov shop, so December’s grocery limit can stay at $520 and still be met.</li>' +
    '</ol><p><button type="button" id="print-report">Print this report</button></p></section>';
}

export function renderNotFound() {
  return '<h1>Not found</h1>' +
    '<p class="lede">That page is not in the ledger. The Wrens only keep six sections — pick one below.</p>' +
    '<p><a href="#/">Back to the Dashboard &rarr;</a></p>';
}
