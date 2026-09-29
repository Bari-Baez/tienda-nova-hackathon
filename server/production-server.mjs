import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { handleClaimsApi, announceDashboardToken } from './claims-api.mjs';

const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 4173);
const distDir = resolve(process.cwd(), 'dist');
const realDistDir = await realpath(distDir).catch(() => distDir);
const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.json': 'application/json; charset=utf-8',
};

function notFound(res) {
  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end('Not found');
}

async function serveStatic(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return notFound(res);
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname);
  } catch {
    return notFound(res);
  }
  const segments = pathname.split('/');
  if (pathname.includes('\0') || pathname.includes('\\') || segments.includes('..')) return notFound(res);
  if (segments.some((segment) => segment.startsWith('.')) || ['server', 'scripts', 'src', 'node_modules'].includes(segments[1])) return notFound(res);
  if (pathname.startsWith('/api/') || pathname === '/api') return notFound(res);
  const relativePath = pathname.replace(/^\/+/, '');
  const candidate = resolve(distDir, relativePath);
  if (candidate !== distDir && !candidate.startsWith(`${distDir}${sep}`)) return notFound(res);
  let filePath = candidate;
  let fileStat = await stat(filePath).catch(() => null);
  if (!fileStat?.isFile()) {
    // Client-side routes are served by index.html; missing files retain a real 404.
    if (extname(pathname)) return notFound(res);
    filePath = resolve(distDir, 'index.html');
    fileStat = await stat(filePath).catch(() => null);
    if (!fileStat?.isFile()) return notFound(res);
  }
  const realFilePath = await realpath(filePath).catch(() => null);
  if (!realFilePath || !realFilePath.startsWith(`${realDistDir}${sep}`)) return notFound(res);
  const bytes = await readFile(filePath);
  res.statusCode = 200;
  res.setHeader('Content-Type', mimeTypes[extname(filePath).toLowerCase()] || 'application/octet-stream');
  res.setHeader('Content-Length', bytes.length);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', filePath.endsWith('index.html') ? 'no-store' : 'public, max-age=3600');
  res.end(req.method === 'HEAD' ? undefined : bytes);
}

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT debe ser un entero entre 1 y 65535.');
}
if (!(await stat(resolve(distDir, 'index.html')).catch(() => null))?.isFile()) {
  throw new Error('Falta dist/index.html. Ejecute npm run build antes de npm run start.');
}

createServer(async (req, res) => {
  try {
    if (await handleClaimsApi(req, res)) return;
    await serveStatic(req, res);
  } catch {
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('Server error');
    } else {
      res.destroy();
    }
  }
}).listen(port, host, () => {
  announceDashboardToken();
  console.info(`Servidor local: http://${host}:${port}`);
});
