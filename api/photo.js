// GET /api/photo?id=…&n=0..2 — renvoie une photo de la carte (JPEG), mise en cache par le CDN.
import { get, storeMode } from './_lib/store.js';
import { ID_RE, queryOf } from './_lib/http.js';

export default async function handler(req, res) {
  const q = queryOf(req);
  const id = String(q.id || '');
  const n = String(q.n || '');
  if (!ID_RE.test(id) || !/^[0-2]$/.test(n) || storeMode === 'none') {
    res.statusCode = 404;
    return res.end();
  }
  try {
    const b64 = await get(`card:${id}:p${n}`);
    if (!b64) {
      res.statusCode = 404;
      res.setHeader('Cache-Control', 'public, s-maxage=60');
      return res.end();
    }
    const buf = Buffer.from(b64, 'base64');
    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Length', buf.length);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Robots-Tag', 'noindex');
    return res.end(buf);
  } catch (e) {
    console.error('[photo] store error', e && e.message);
    res.statusCode = 503;
    return res.end();
  }
}
