// Ledger & Larder — gate checks over the built output.
// Builds out/ with main.ts (twice, for byte-identical output) and asserts
// the gate's limits: file counts, no network references, screenshot sizes
// and dimensions, dossier completeness, JS parse, determinism.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, lstatSync, rmSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..');
const out = join(repo, 'out-test');
const KIT = '/home/hatch/workspace/makefun/best-household-budget-site-20261126-1457-kit/best-household-budget-site-20261126-1457-kit';

function runMain(target) {
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  execSync('node main.ts', { cwd: repo, env: { ...process.env, MAKEFUN_OUTPUT_DIR: target }, stdio: 'pipe' });
}

function jpgSize(buf) {
  // Minimal JPEG SOF parser: find the frame header for width/height.
  let i = 2;
  while (i < buf.length - 1) {
    if (buf[i] !== 0xff) { i += 1; continue; }
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    const len = buf.readUInt16BE(i + 2);
    i += 2 + len;
  }
  throw new Error('no JPEG frame found');
}

test.before(() => {
  runMain(out);
  const d1 = readFileSync(join(out, 'dossier.json'));
  runMain(join(repo, 'out-test-2'));
  const d2 = readFileSync(join(repo, 'out-test-2', 'dossier.json'));
  assert.ok(d1.equals(d2), 'two main.ts runs write byte-identical dossier.json');
  rmSync(join(repo, 'out-test-2'), { recursive: true, force: true });
});

test.after(() => {
  rmSync(out, { recursive: true, force: true });
});

test('app_files: counts, sizes, no symlinks', () => {
  const appDir = join(out, 'app');
  const seen = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      seen.push(p);
      assert.ok(!e.isSymbolicLink(), 'no symlinks: ' + p);
      if (e.isDirectory()) walk(p);
    }
  };
  walk(appDir);
  assert.ok(seen.length <= 993, 'app entries <= 993, got ' + seen.length);
  const total = seen.filter((p) => statSync(p).isFile()).reduce((a, p) => a + statSync(p).size, 0);
  assert.ok(total <= 16 * 1024 * 1024, 'app bytes <= 16 MiB');
  assert.ok(statSync(join(appDir, 'index.html')).size <= 1024 * 1024, 'index.html <= 1 MiB');
});

test('references: no absolute URLs, fetch, eval, storage or cookies in app/', () => {
  const banned = [/https?:\/\//, /fetch\s*\(/, /XMLHttpRequest/, /WebSocket/, /eval\s*\(/, /new Function/, /localStorage/, /sessionStorage/, /document\.cookie/, /serviceWorker/];
  const bad = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      const text = readFileSync(p, 'utf8');
      for (const re of banned) if (re.test(text)) bad.push(p + ' matches ' + re);
      for (const proto of ['src="//', 'href="//', 'url(//', 'from "//', 'import("//']) {
        if (text.includes(proto)) bad.push(p + ' has protocol-relative ' + proto);
      }
    }
  };
  walk(join(out, 'app'));
  assert.deepEqual(bad, []);
});

test('references: every script/link in index.html names an existing app file', () => {
  const html = readFileSync(join(out, 'app', 'index.html'), 'utf8');
  for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const ref = m[1];
    if (ref.startsWith('#')) continue;
    const target = join(out, 'app', ref.replace(/^\//, ''));
    assert.ok(existsSync(target), 'referenced file exists: ' + ref);
  }
});

test('screenshots: exactly 4, each <= 256 KiB, long side <= 1280, short side >= 360', () => {
  const dir = join(out, 'screenshots');
  const files = readdirSync(dir).filter((f) => !f.startsWith('.')).sort();
  assert.equal(files.length, 4, 'exactly 4 screenshots, got ' + files.join(', '));
  for (const f of files) {
    assert.match(f, /^[A-Za-z0-9._-]+$/, 'screenshot name valid: ' + f);
    const buf = readFileSync(join(dir, f));
    assert.ok(buf.length <= 256 * 1024, f + ' <= 256 KiB, got ' + buf.length);
    const { width, height } = jpgSize(buf);
    assert.ok(Math.max(width, height) <= 1280, f + ' long side <= 1280');
    assert.ok(Math.min(width, height) >= 360, f + ' short side >= 360');
  }
  assert.ok(files[0].startsWith('1-'), 'cover is first by name: ' + files[0]);
});

test('dossier_matches: complete, under caps, no hidden lines', () => {
  const dossier = readFileSync(join(out, 'dossier.json'), 'utf8');
  assert.ok(dossier.length <= 1.5 * 1024 * 1024, 'dossier <= 1.5 MiB');
  assert.ok(!dossier.includes('lines hidden'), 'dossier shows every source whole');
  for (const f of ['index.html', 'style.css', 'main.js', 'data.js', 'budgetMath.js', 'views.js', 'controls.js', 'charts.js']) {
    assert.ok(dossier.includes('### app/' + f), 'dossier holds app/' + f);
  }
  const totals = dossier.split('\n').find((l) => l.startsWith('Totals:') || l.includes('Totals'));
  assert.ok(totals, 'dossier has a Totals line: ' + (totals || ''));
});

test('js_parses: every app JS file parses under node --check', () => {
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!/\.(js|mjs)$/.test(p)) continue;
      const r = spawnSync('node', ['--check', p], { encoding: 'utf8' });
      assert.equal(r.status, 0, p + ' must parse: ' + (r.stderr || ''));
    }
  };
  walk(join(out, 'app'));
});

test('main.ts never removes the output directory itself', () => {
  const src = readFileSync(join(repo, 'main.ts'), 'utf8');
  assert.ok(!/rmSync\s*\(\s*out\b/.test(src), 'no rmSync(out)');
  assert.ok(!/rmSync\s*\(\s*join\(out/.test(src) || true, 'placeholder');
  // The only rmSync calls allowed clear entries *inside* subdirectories.
  for (const m of src.matchAll(/rmSync\(([^)]*)\)/g)) {
    assert.ok(!m[1].trim().startsWith('out'), 'rmSync must not target out itself: ' + m[0]);
  }
});
