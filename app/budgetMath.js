// Ledger & Larder — pure money math. No DOM, no imports, no side
// effects, so every function here is unit-testable in plain Node.
// All arithmetic runs in integer cents to dodge float drift.

export function toCents(amount) {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return 0;
  return Math.round(amount * 100);
}

export function fromCents(cents) {
  return cents / 100;
}

export function formatMoney(amount) {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return '$0.00';
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  const whole = Math.floor(abs);
  const cents = Math.round((abs - whole) * 100);
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return sign + '$' + grouped + '.' + String(cents).padStart(2, '0');
}

// Validate a money string typed into a form. Returns integer cents,
// or null when the input is not a positive amount with at most 2 decimals.
export function parseAmount(raw) {
  if (typeof raw !== 'string') return null;
  const text = raw.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const cents = Math.round(Number(text) * 100);
  return cents > 0 ? cents : null;
}

// Sum of one type ('spending' or 'income') in dollars.
export function sumByType(transactions, type) {
  let cents = 0;
  for (const row of transactions || []) {
    if (row && row.type === type) cents += toCents(row.amount);
  }
  return fromCents(cents);
}

// Spending per category in dollars. Every category in `known` starts at
// zero; rows whose category is not known fall into 'Uncategorised'.
export function spendingByCategory(transactions, known) {
  const out = {};
  for (const name of known || []) out[name] = 0;
  for (const row of transactions || []) {
    if (!row || row.type !== 'spending') continue;
    const name = row.category && Object.prototype.hasOwnProperty.call(out, row.category)
      ? row.category
      : 'Uncategorised';
    out[name] = (out[name] || 0) + fromCents(toCents(row.amount));
  }
  return out;
}

// Budget status for one category. Boundaries: under 80% is 'under',
// 80% up to (not including) 100% is 'near', exactly 100% is 'at',
// over 100% is 'over'. A zero limit with any spending is 'over'.
export function categoryStatus(spent, limit) {
  const spentCents = toCents(spent);
  const limitCents = toCents(limit);
  if (limitCents <= 0) {
    return { pct: spentCents > 0 ? Infinity : 0, state: spentCents > 0 ? 'over' : 'under', overBy: fromCents(spentCents) };
  }
  const pct = (spentCents / limitCents) * 100;
  let state = 'under';
  if (pct >= 100 && spentCents > limitCents) state = 'over';
  else if (spentCents === limitCents) state = 'at';
  else if (pct >= 80) state = 'near';
  return { pct, state, overBy: fromCents(Math.max(0, spentCents - limitCents)) };
}

export function monthsToGoal(left, monthly) {
  if (left <= 0) return 0;
  if (typeof monthly !== 'number' || !Number.isFinite(monthly) || monthly <= 0) return null;
  return Math.ceil(toCents(left) / toCents(monthly));
}

// Goal progress: pct is rounded to a whole percent and capped at 100,
// left is what remains (never negative), surplus is the overshoot.
export function goalProgress(saved, target, monthly) {
  const savedCents = toCents(saved);
  const targetCents = toCents(target);
  const pct = targetCents > 0 ? Math.min(100, Math.round((savedCents / targetCents) * 100)) : 0;
  const left = fromCents(Math.max(0, targetCents - savedCents));
  const surplus = fromCents(Math.max(0, savedCents - targetCents));
  return { pct, left, surplus, months: monthsToGoal(left, monthly) };
}

// Spending per week of a month, in dollars: days 1-7, 8-14, 15-21, 22-end.
// Income rows and malformed dates never count.
export function weeklyTotals(transactions, year, month) {
  const weeks = [0, 0, 0, 0];
  for (const row of transactions || []) {
    if (!row || row.type !== 'spending' || typeof row.date !== 'string') continue;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(row.date);
    if (!match) continue;
    const y = Number(match[1]);
    const m = Number(match[2]);
    const d = Number(match[3]);
    if (y !== year || m !== month || d < 1 || d > 31) continue;
    const real = new Date(Date.UTC(y, m - 1, d));
    if (real.getUTCFullYear() !== y || real.getUTCMonth() !== m - 1 || real.getUTCDate() !== d) continue;
    const week = d <= 7 ? 0 : d <= 14 ? 1 : d <= 21 ? 2 : 3;
    weeks[week] += toCents(row.amount);
  }
  return weeks.map((c) => fromCents(c));
}
