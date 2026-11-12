// Serveur local qui reproduit Vercel : fichiers de public/, fonctions de api/, réécriture /c/:id.
// Usage : npm run dev  (PORT=3000 par défaut). Les cartes sont stockées dans .data/store.json.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(ROOT, 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8'
};
const cache = {};
async function fn(name) {
  if (!/^[a-z]+$/.test(name)) return null;
  if (!cache[name]) {
    try { cache[name] = (await import(pathToFileURL(path.join(ROOT, 'api', name + '.js')).href)).default; } catch { return null; }
  }
  return cache[name];
}

export function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const card = url.pathname.match(/^\/c\/([^/]+)\/?$/);
      if (card) {
        req.url = '/api/card?id=' + encodeURIComponent(card[1]);
        return (await fn('card'))(req, res);
      }
      const api = url.pathname.match(/^\/api\/([a-z]+)$/);
      if (api) {
        const h = await fn(api[1]);
        if (h) return h(req, res);
      }
      let p = decodeURIComponent(url.pathname);
      if (p.endsWith('/')) p += 'index.html';
      const file = path.normalize(path.join(PUB, p));
      if (!file.startsWith(PUB)) { res.statusCode = 403; return res.end(); }
      const data = await readFile(file);
      res.setHeader('Content-Type', MIME[path.extname(file).toLowerCase()] || 'application/octet-stream');
      res.end(data);
    } catch (e) {
      if (e.code === 'ENOENT' || e.code === 'EISDIR') { res.statusCode = 404; res.end('Introuvable'); return; }
      console.error(e);
      res.statusCode = 500;
      res.end('Erreur serveur');
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT) || 3000;
  createServer().listen(port, () => console.log(`Éclat en local → http://localhost:${port}`));
}
