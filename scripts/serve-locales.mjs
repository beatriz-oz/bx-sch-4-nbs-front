// Serves the built site the way it will be published: both languages side by side.
//
//   npm run preview          (builds, then serves on http://localhost:4300)
//
// `ng serve` only compiles one language, so the PT | EN switch cannot work there.
// Here, like the nginx of the deploy:
//   /pt-PT/...  and  /en/...   each language's copy (unknown paths get its index.html: Angular routes them)
//   /v1/...                    forwarded to the API on localhost:8000 (same origin: no CORS needed)
//   /                          sent to the browser's language (Portuguese unless it prefers English)
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, request } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const PORT = 4300;
const API = { host: 'localhost', port: 8000 };
const ROOT = resolve('dist/bx-sch-4-nbs-front/browser');
const LOCALES = ['pt-PT', 'en'];

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function preferredLocale(acceptLanguage = '') {
  const first = acceptLanguage.split(',')[0].trim().toLowerCase();
  return first.startsWith('en') ? 'en' : 'pt-PT';
}

function sendFile(response, file) {
  response.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(response);
}

function proxyToApi(req, response) {
  const upstream = request(
    { ...API, path: req.url, method: req.method, headers: { ...req.headers, host: `${API.host}:${API.port}` } },
    (apiResponse) => {
      response.writeHead(apiResponse.statusCode ?? 502, apiResponse.headers);
      apiResponse.pipe(response);
    },
  );
  upstream.on('error', () => {
    response.writeHead(502, { 'Content-Type': 'text/plain' });
    response.end('The API is not running on localhost:8000.');
  });
  req.pipe(upstream);
}

const server = createServer((req, response) => {
  const path = decodeURIComponent((req.url ?? '/').split('?')[0]);

  if (path.startsWith('/v1/')) {
    proxyToApi(req, response);
    return;
  }

  const locale = LOCALES.find((code) => path === `/${code}` || path.startsWith(`/${code}/`));
  if (!locale) {
    // "/" or an old link without a language: keep the path, add the language.
    response.writeHead(302, { Location: `/${preferredLocale(req.headers['accept-language'])}${path === '/' ? '/' : path}` });
    response.end();
    return;
  }

  const base = join(ROOT, locale);
  const file = normalize(join(ROOT, path));
  // normalize + startsWith: "/en/../../secret" cannot leave the locale folder.
  if (file.startsWith(base) && existsSync(file) && statSync(file).isFile()) {
    sendFile(response, file);
  } else {
    sendFile(response, join(base, 'index.html'));
  }
});

if (!existsSync(ROOT)) {
  console.error(`No build in ${ROOT}. Run "npm run preview" (it builds first).`);
  process.exit(1);
}
server.listen(PORT, () => console.log(`Both languages on http://localhost:${PORT}  (API: ${API.host}:${API.port})`));
