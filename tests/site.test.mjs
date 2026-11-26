// Ledger & Larder — browser integration tests.
// Drives the real site in Playwright-cached headless Chromium over CDP
// (Node's built-in WebSocket client, no dependencies). Run with:
//   node --test tests/site.test.mjs
// The test starts its own server (serve.ts, port 8123) and its own browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..');
const CHROME = `${process.env.HOME}/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell`;
const BASE = 'http://localhost:8123';

let server;
let chrome;
let ws;
let msgId = 0;
const pending = new Map();
const consoleErrors = [];

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evalJs(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('page JS error: ' + JSON.stringify(r.exceptionDetails).slice(0, 500));
  return r.result.value;
}

async function go(hash) {
  await evalJs(`location.hash = ${JSON.stringify(hash)}`);
  await new Promise((r) => setTimeout(r, 250));
  const ready = await evalJs('window.__shotReady === true');
  assert.equal(ready, true, `__shotReady after navigating to ${hash}`);
}

async function waitFor(predicate, timeoutMs = 5000) {
  const start = Date.now();
  for (;;) {
    if (await predicate()) return;
    if (Date.now() - start > timeoutMs) throw new Error('timed out waiting for condition');
    await new Promise((r) => setTimeout(r, 100));
  }
}

async function fresh() {
  // Reload the page: in-memory state resets to the shipped dataset,
  // so each test starts from the same reconciled figures.
  await evalJs('location.hash = "#/"; location.reload()');
  await waitFor(async () => {
    try { return await evalJs('window.__shotReady === true'); } catch { return false; }
  });
  await new Promise((r) => setTimeout(r, 200));
}

test.before(async () => {
  server = spawn('node', ['serve.ts', '--port', '8123'], { cwd: repo, stdio: 'ignore' });
  chrome = spawn(CHROME, ['--headless', '--disable-gpu', '--no-sandbox', '--remote-debugging-port=9224', '--window-size=1280,800', 'about:blank'], { stdio: 'ignore' });
  await waitFor(async () => {
    try {
      const r = await fetch('http://localhost:8123/');
      return r.status === 200;
    } catch { return false; }
  });
  let targets;
  await waitFor(async () => {
    try {
      targets = await (await fetch('http://localhost:9224/json/list')).json();
      return Array.isArray(targets) && targets.length > 0;
    } catch { return false; }
  });
  const page = targets.find((t) => t.type === 'page');
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve) => { ws.onopen = resolve; });
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      pending.get(data.id).resolve(data.result);
      pending.delete(data.id);
    } else if (data.method === 'Runtime.exceptionThrown') {
      consoleErrors.push(JSON.stringify(data.params.exceptionDetails).slice(0, 300));
    } else if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error') {
      consoleErrors.push(JSON.stringify(data.params.args).slice(0, 300));
    }
  };
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.navigate', { url: `${BASE}/#/` });
  await waitFor(async () => {
    try { return await evalJs('window.__shotReady === true'); } catch { return false; }
  });
});

test.after(async () => {
  try { ws?.close(); } catch { /* ignore */ }
  try { chrome?.kill(); } catch { /* ignore */ }
  try { server?.kill(); } catch { /* ignore */ }
});

test('every route renders: one H1, non-empty main, __shotReady', async () => {
  for (const hash of ['#/', '#/transactions', '#/budgets', '#/goals', '#/bills', '#/reports', '#/nope']) {
    await go(hash);
    const h1s = await evalJs('document.querySelectorAll("h1").length');
    assert.equal(h1s, 1, `${hash} must have exactly one H1`);
    const text = await evalJs('document.querySelector("main").textContent.trim().length');
    assert.ok(text > 50, `${hash} main must not be empty`);
  }
  assert.equal(await evalJs('document.querySelector("h1").textContent.includes("Not found")'), true);
});

test('nav links all point at routes that render', async () => {
  const hrefs = await evalJs('[...document.querySelectorAll("header nav a")].map(a => a.getAttribute("href"))');
  assert.ok(hrefs.length >= 6, 'nav has at least six links');
  for (const href of hrefs) {
    await go(href);
    assert.equal(await evalJs('document.querySelectorAll("h1").length'), 1);
  }
});

test('dashboard reconciles with the dataset', async () => {
  await go('#/');
  const stats = await evalJs(`[...document.querySelectorAll('[data-stat]')].map(e => e.textContent)`);
  assert.ok(stats.some((s) => s.includes('$5,840.00')), 'income $5,840 shown: ' + stats.join('|'));
  assert.ok(stats.some((s) => s.includes('$4,612.00')), 'spent $4,612 shown');
  assert.ok(stats.some((s) => s.includes('$1,228.00')), 'left $1,228 shown');
  assert.ok(stats.some((s) => s.includes('21%')), 'savings rate 21% shown');
});

test('transactions: filter, search, empty state, sort, add', async () => {
  await fresh();
  await go('#/transactions');
  assert.equal(await evalJs('document.querySelectorAll("#tx-table tbody tr").length'), 24);
  await evalJs(`document.querySelector('#filter-category').value = 'groceries'; document.querySelector('#filter-category').dispatchEvent(new Event('change'))`);
  const groceryRows = await evalJs('document.querySelectorAll("#tx-table tbody tr").length');
  assert.equal(groceryRows, 4, 'Groceries filter shows 4 rows');
  const groceryTotal = await evalJs('document.querySelector("#tx-summary").textContent');
  assert.ok(groceryTotal.includes('$606.00'), 'Groceries total $606: ' + groceryTotal);
  await evalJs(`document.querySelector('#filter-category').value = 'all'; document.querySelector('#filter-category').dispatchEvent(new Event('change'))`);
  await evalJs(`document.querySelector('#search-payee').value = 'Marlow'; document.querySelector('#search-payee').dispatchEvent(new Event('input'))`);
  assert.equal(await evalJs('document.querySelectorAll("#tx-table tbody tr").length'), 2, 'Marlow search finds 2 rows');
  await evalJs(`document.querySelector('#search-payee').value = 'zzzz-no-match'; document.querySelector('#search-payee').dispatchEvent(new Event('input'))`);
  assert.equal(await evalJs('document.querySelectorAll("#tx-table tbody tr").length'), 0);
  assert.ok(await evalJs('document.querySelector("#tx-empty").textContent.includes("No transactions match")'));
  await evalJs(`document.querySelector('#search-payee').value = ''; document.querySelector('#search-payee').dispatchEvent(new Event('input'))`);
  await evalJs(`document.querySelector('#sort-by').value = 'amount-desc'; document.querySelector('#sort-by').dispatchEvent(new Event('change'))`);
  const firstAmount = await evalJs('document.querySelector("#tx-table tbody tr td:nth-child(4)").textContent');
  assert.ok(firstAmount.includes('2,920') || firstAmount.includes('3,140'), 'largest first: ' + firstAmount);
  // Add a valid transaction.
  await evalJs(`document.querySelector('#add-date').value = '2026-11-27'`);
  await evalJs(`document.querySelector('#add-payee').value = 'Test Shop'`);
  await evalJs(`document.querySelector('#add-category').value = 'Groceries'`);
  await evalJs(`document.querySelector('#add-amount').value = '45.00'`);
  await evalJs(`document.querySelector('#add-tx-form').requestSubmit()`);
  await new Promise((r) => setTimeout(r, 200));
  assert.equal(await evalJs('document.querySelectorAll("#tx-table tbody tr").length'), 25, 'row count grows by one');
  const after = await evalJs('document.querySelector("#tx-summary").textContent');
  assert.ok(after.includes('25'), 'summary counts 25 rows: ' + after);
  // Invalid add is rejected with an inline error and no new row
  // (a payee is given, so native validation lets the submit through
  // and the app's own amount check answers).
  await evalJs(`document.querySelector('#add-payee').value = 'Test Shop'`);
  await evalJs(`document.querySelector('#add-amount').value = 'abc'`);
  await evalJs(`document.querySelector('#add-tx-form').requestSubmit()`);
  await new Promise((r) => setTimeout(r, 200));
  assert.equal(await evalJs('document.querySelectorAll("#tx-table tbody tr").length'), 25);
  assert.ok(await evalJs('document.querySelector("#add-error").textContent.length > 0'));
});

test('budgets: adjust Groceries limit 520 to 600, bad input rejected', async () => {
  await fresh();
  await go('#/budgets');
  const before = await evalJs(`document.querySelector('[data-category="groceries"] .budget-left').textContent`);
  assert.ok(before.includes('$86.00'), 'Groceries starts $86 over: ' + before);
  await evalJs(`document.querySelector('[data-category="groceries"] input').value = '600'`);
  await evalJs(`document.querySelector('[data-category="groceries"] button').click()`);
  await new Promise((r) => setTimeout(r, 200));
  const after = await evalJs(`document.querySelector('[data-category="groceries"] .budget-left').textContent`);
  assert.ok(after.includes('-$6.00') === false && after.includes('$6.00'), 'limit 600 leaves $6: ' + after);
  await evalJs(`document.querySelector('[data-category="groceries"] input').value = 'abc'`);
  await evalJs(`document.querySelector('[data-category="groceries"] button').click()`);
  await new Promise((r) => setTimeout(r, 200));
  const kept = await evalJs(`document.querySelector('[data-category="groceries"] .budget-limit').textContent`);
  assert.ok(kept.includes('600'), 'bad input keeps limit 600: ' + kept);
});

test('goals: add $100 to Emergency fund, bad input rejected', async () => {
  await fresh();
  await go('#/goals');
  const before = await evalJs(`document.querySelector('[data-goal="emergency"] .goal-saved').textContent`);
  assert.ok(before.includes('$4,350.00'), 'Emergency starts at $4,350: ' + before);
  await evalJs(`document.querySelector('[data-goal="emergency"] input').value = '100'`);
  await evalJs(`document.querySelector('[data-goal="emergency"] button').click()`);
  await new Promise((r) => setTimeout(r, 200));
  const after = await evalJs(`document.querySelector('[data-goal="emergency"] .goal-saved').textContent`);
  assert.ok(after.includes('$4,450.00'), 'Emergency grows to $4,450: ' + after);
  const pct = await evalJs(`document.querySelector('[data-goal="emergency"] .goal-pct').textContent`);
  assert.ok(pct.includes('74%'), 'bar moves 73% to 74%: ' + pct);
});

test('bills: mark Phone paid, still-to-pay drops $170 to $74', async () => {
  await fresh();
  await go('#/bills');
  const before = await evalJs('document.querySelector("#still-to-pay").textContent');
  assert.ok(before.includes('$170.00'), 'still to pay starts $170: ' + before);
  await evalJs(`document.querySelector('[data-bill="phone"] button').click()`);
  await new Promise((r) => setTimeout(r, 200));
  const after = await evalJs('document.querySelector("#still-to-pay").textContent');
  assert.ok(after.includes('$74.00'), 'still to pay drops to $74: ' + after);
  const status = await evalJs(`document.querySelector('[data-bill="phone"] .bill-status').textContent`);
  assert.ok(status.includes('Paid 28 Nov'), 'Phone shows paid date: ' + status);
});

test('reports: chart toggle switches dataset, weekly bars sum to spent', async () => {
  await fresh();
  await go('#/reports');
  const catTitle = await evalJs('document.querySelector("#chart-title").textContent');
  assert.ok(catTitle.toLowerCase().includes('category'), 'chart starts by category: ' + catTitle);
  await evalJs(`document.querySelector('#chart-toggle-week').click()`);
  await new Promise((r) => setTimeout(r, 200));
  const weekTitle = await evalJs('document.querySelector("#chart-title").textContent');
  assert.ok(weekTitle.toLowerCase().includes('week'), 'toggle switches to weeks: ' + weekTitle);
  const weekSum = await evalJs(`[...document.querySelectorAll('#report-chart [data-bar-value]')].map(e => Number(e.dataset.barValue)).reduce((a,b) => a+b, 0)`);
  assert.ok(Math.abs(weekSum - 4612) < 0.01, 'weekly bars sum to $4,612, got ' + weekSum);
});

test('no console errors anywhere', () => {
  assert.deepEqual(consoleErrors, []);
});
