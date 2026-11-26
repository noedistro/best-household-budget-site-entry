// Ledger & Larder — entrypoint (Node 22, standard library only).
//
// The site is plain static files in app/ (one index.html, hand-written CSS
// and ES modules, the dataset held in its own file) plus 3–4 screenshots in
// screenshots/. This program hands the site in: it copies app/ and
// screenshots/ from beside this file into the output directory and writes
// output/dossier.json, the summary the judge reads, using the vendored
// make.fun library (vendor/makefun-frontend.ts, the kit's copy, unchanged).
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The output directory itself is never removed: the grader mounts it as a
// volume, and deleting a mounted directory fails (this exact failure
// rejected an earlier entry at grade time). Only the contents of the app/
// and screenshots/ folders inside it are cleared, one entry at a time,
// before the fresh copy lands. Two runs therefore write identical bytes.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Clear the entries inside a directory, leaving the directory itself alone.
function clearContents(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    rmSync(join(dir, entry), { recursive: true, force: true });
  }
}

mkdirSync(out, { recursive: true });
const appOut = join(out, 'app');
const shotsOut = join(out, 'screenshots');
mkdirSync(appOut, { recursive: true });
mkdirSync(shotsOut, { recursive: true });
clearContents(appOut);
clearContents(shotsOut);
cpSync(join(here, 'app'), appOut, { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), shotsOut, { recursive: true });
}

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 16777216 }),
);
