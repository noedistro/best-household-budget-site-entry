// Ledger & Larder — unit tests for the pure money math in app/budgetMath.js.
// Written first (TDD): these tests define the behaviour the implementation
// must satisfy. Run with: node --test tests/budgetMath.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toCents,
  formatMoney,
  parseAmount,
  sumByType,
  spendingByCategory,
  categoryStatus,
  goalProgress,
  monthsToGoal,
  weeklyTotals,
} from '../app/budgetMath.js';

test('toCents: dollars to integer cents without float drift', () => {
  assert.equal(toCents(12.34) + toCents(0.01), 1235);
  assert.equal(toCents(0), 0);
  assert.equal(toCents(999999.99), 99999999);
  assert.equal(toCents(0.1) + toCents(0.2), 30);
  assert.equal(toCents(NaN), 0);
  assert.equal(toCents('12.34'), 0);
});

test('formatMoney: commas, two decimals, negatives, bad input', () => {
  assert.equal(formatMoney(0), '$0.00');
  assert.equal(formatMoney(1234.5), '$1,234.50');
  assert.equal(formatMoney(-12), '-$12.00');
  assert.equal(formatMoney(999999.99), '$999,999.99');
  assert.equal(formatMoney(NaN), '$0.00');
  assert.equal(formatMoney('abc'), '$0.00');
  assert.equal(formatMoney(1228), '$1,228.00');
});

test('parseAmount: form input validation', () => {
  assert.equal(parseAmount('45.00'), 4500);
  assert.equal(parseAmount('45'), 4500);
  assert.equal(parseAmount('0.01'), 1);
  assert.equal(parseAmount(''), null);
  assert.equal(parseAmount('abc'), null);
  assert.equal(parseAmount('-5'), null);
  assert.equal(parseAmount('0'), null);
  assert.equal(parseAmount('12.345'), null);
  assert.equal(parseAmount('  12.50  '), 1250);
  assert.equal(parseAmount(null), null);
});

test('sumByType: empty list is zero, income and spending separate', () => {
  assert.equal(sumByType([], 'spending'), 0);
  assert.equal(sumByType([], 'income'), 0);
  const rows = [
    { type: 'spending', amount: 10.5 },
    { type: 'income', amount: 100 },
    { type: 'spending', amount: 0.01 },
  ];
  assert.equal(sumByType(rows, 'spending'), 10.51);
  assert.equal(sumByType(rows, 'income'), 100);
});

test('spendingByCategory: groups, unknown bucket, duplicates counted', () => {
  const rows = [
    { type: 'spending', category: 'Groceries', amount: 10 },
    { type: 'spending', category: 'Groceries', amount: 20 },
    { type: 'spending', category: 'Mystery', amount: 5 },
    { type: 'spending', category: null, amount: 7 },
    { type: 'income', category: 'Groceries', amount: 999 },
    { type: 'spending', category: 'Groceries', amount: 0 },
  ];
  const out = spendingByCategory(rows, ['Groceries', 'Dining out']);
  assert.equal(out.Groceries, 30);
  assert.equal(out['Dining out'], 0);
  assert.equal(out.Uncategorised, 12);
  assert.deepEqual(spendingByCategory([], ['Groceries']), { Groceries: 0 });
});

test('categoryStatus: boundaries 80 and 100, zero limit guard', () => {
  assert.equal(categoryStatus(79.9, 100).state, 'under');
  assert.equal(categoryStatus(80, 100).state, 'near');
  assert.equal(categoryStatus(99.99, 100).state, 'near');
  assert.equal(categoryStatus(100, 100).state, 'at');
  assert.equal(categoryStatus(100.01, 100).state, 'over');
  assert.equal(categoryStatus(0, 100).state, 'under');
  assert.equal(categoryStatus(0, 100).pct, 0);
  assert.equal(categoryStatus(5, 0).state, 'over');
  assert.equal(categoryStatus(0, 0).state, 'under');
  assert.equal(categoryStatus(606, 520).state, 'over');
  assert.equal(categoryStatus(606, 520).overBy, 86);
});

test('goalProgress: rounding, cap at target, zero monthly saving', () => {
  const g = goalProgress(4350, 6000, 310);
  assert.equal(g.pct, 73);
  assert.equal(g.left, 1650);
  assert.equal(g.months, 6);
  assert.equal(goalProgress(0, 1000, 100).pct, 0);
  assert.equal(goalProgress(1000, 1000, 100).pct, 100);
  assert.equal(goalProgress(1000, 1000, 100).months, 0);
  const over = goalProgress(1200, 1000, 100);
  assert.equal(over.pct, 100);
  assert.equal(over.left, 0);
  assert.equal(over.surplus, 200);
  const stuck = goalProgress(100, 1000, 0);
  assert.equal(stuck.months, null);
  assert.equal(goalProgress(1120, 1800, 140).pct, 62);
  assert.equal(goalProgress(410, 650, 90).pct, 63);
});

test('monthsToGoal: rounds up, exact division stays exact', () => {
  assert.equal(monthsToGoal(1650, 310), 6);
  assert.equal(monthsToGoal(600, 300), 2);
  assert.equal(monthsToGoal(1, 100), 1);
  assert.equal(monthsToGoal(0, 100), 0);
  assert.equal(monthsToGoal(100, 0), null);
  assert.equal(monthsToGoal(100, -5), null);
});

test('weeklyTotals: four weeks sum to the month, boundaries land once', () => {
  const rows = [
    { type: 'spending', date: '2026-11-07', amount: 10 },
    { type: 'spending', date: '2026-11-08', amount: 20 },
    { type: 'spending', date: '2026-11-14', amount: 40 },
    { type: 'spending', date: '2026-11-15', amount: 80 },
    { type: 'spending', date: '2026-11-21', amount: 160 },
    { type: 'spending', date: '2026-11-22', amount: 320 },
    { type: 'spending', date: '2026-11-28', amount: 5 },
    { type: 'income', date: '2026-11-06', amount: 9999 },
  ];
  const weeks = weeklyTotals(rows, 2026, 11);
  assert.deepEqual(weeks, [10, 60, 240, 325]);
  assert.equal(weeks.reduce((a, b) => a + b, 0), 635);
  assert.deepEqual(weeklyTotals([], 2026, 11), [0, 0, 0, 0]);
  // Malformed dates never crash and never count.
  const bad = weeklyTotals([{ type: 'spending', date: '2026-13-40', amount: 50 }], 2026, 11);
  assert.deepEqual(bad, [0, 0, 0, 0]);
});
