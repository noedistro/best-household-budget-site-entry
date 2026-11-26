// A tiny static server for app/ (Node 22, standard library only), so the
// site can be run locally without a build step: `node serve.ts` serves
// app/ on http://localhost:8080 (`--port <n>` for another port). It sends
// the MIME types a browser needs, refuses any path outside app/, and
// otherwise does nothing clever: a development convenience, not a web
// server for the internet.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('./app', import.meta.url)));
const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const requested = portIndex === -1 ? 8080 : Number(args[portIndex + 1]);
const port = Number.isInteger(requested) && requested > 0 && requested < 65536 ? requested : 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    response.writeHead(400).end('bad request');
    return;
  }
  const target = resolve(join(root, normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, '')));
  if (!target.startsWith(root + sep) && target !== root) {
    response.writeHead(403).end('forbidden');
    return;
  }
  let file = target;
  try {
    if (statSync(file).isDirectory()) file = join(file, 'index.html');
  } catch {
    response.writeHead(404).end('not found');
    return;
  }
  const type = MIME[extname(file)] ?? 'application/octet-stream';
  response.writeHead(200, { 'content-type': type });
  createReadStream(file).pipe(response);
}).listen(port, () => {
  console.log('Ledger & Larder serving app/ on http://localhost:' + port);
});
