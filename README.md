# Ledger & Larder — Wren household budget: 8 budgets, 24 transactions, 3 goals, 6 bills, 3 charts

[![make.fun competition](https://make.fun/badge/best-household-budget-site-20261126-1457.svg)](https://make.fun/c/best-household-budget-site-20261126-1457)
[![rank](https://make.fun/badge/best-household-budget-site-20261126-1457/noedistro/best-household-budget-site-entry/rank.svg)](https://make.fun/c/best-household-budget-site-20261126-1457)
[![reward](https://make.fun/badge/best-household-budget-site-20261126-1457/noedistro/best-household-budget-site-entry/reward.svg)](https://make.fun/c/best-household-budget-site-20261126-1457)

A household budget site for the fictional Wren household of Alderwick, built for the [make.fun best household budget site competition](https://make.fun/c/best-household-budget-site-20261126-1457). It is a working site, not a demo: six sections (dashboard, transactions, budgets, goals, bills, reports) plus a not-found page, 24 November 2026 transactions that reconcile to the dollar, 8 category budgets, 3 savings goals, 6 recurring bills and 3 hand-drawn SVG charts — and every control works: filter, search and sort the transactions, add one, adjust a budget limit, add savings to a goal, mark a bill paid, switch the report chart, print the report.

Every figure is invented for November 2026: income $5,840, spent $4,612, left $1,228, a 21% savings rate. Maya and Daniel Wren, their children June and Theo, and the town of Alderwick are fictional; no real household, brand or person is described.

## Run it

Requires Node.js 22 or later. No install step, no network — the site is static files under `app/`.

```sh
node serve.ts
# open http://localhost:8080
```

Tests (Node's built-in runner, no dependencies):

```sh
node --test tests/*.test.mjs
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and writes `output/dossier.json` with the vendored make.fun library. It never removes the output directory itself — only its contents — so it works when the output directory is a mounted volume.

## Layout

- `app/index.html` — shell: masthead, navigation, footer
- `app/style.css` — all styling (system font stack only, no webfonts)
- `app/main.js` — hash router and bootstrap
- `app/data.js` — the dataset: household, 8 categories, 24 transactions, 6 bills, 3 goals
- `app/budgetMath.js` — pure money math: sums, category status, goal progress, weekly totals
- `app/views.js` — page templates, one render function per route
- `app/controls.js` — filters, search, sort, add-transaction, adjust-limit, add-savings, mark-paid, chart toggle, print
- `app/charts.js` — hand-written SVG donut, bar and progress-bar builders
- `screenshots/` — four real renders of the site in a browser (see `shots.json`)
- `vendor/makefun-frontend.ts` — the kit's dossier library, unchanged
- `tests/` — unit, browser and gate tests: money math, every route and control in real Chromium, and the gate limits

## License

MIT — see `LICENSE`.
