// GET /c/:id (réécrit vers /api/card?id=:id) — page de la carte, rendue côté serveur
// pour que WhatsApp, Telegram, Facebook… lisent titre, description et image d'aperçu.
import { get, storeMode } from './_lib/store.js';
import { ID_RE, originOf, queryOf } from './_lib/http.js';
import { renderCardPage } from './_lib/page.js';

export default async function handler(req, res) {
  const q = queryOf(req);
  let id = String(q.id || '');
  if (!id) {
    const m = String(req.url || '').match(/\/c\/([^/?#]+)/);
    if (m) id = decodeURIComponent(m[1]);
  }

  let card = null;
  let failed = false;
  if (ID_RE.test(id) && storeMode !== 'none') {
    try {
      const raw = await get(`card:${id}`);
      if (raw) card = JSON.parse(raw);
    } catch (e) {
      failed = true;
      console.error('[card] store error', e && e.message);
    }
  }

  // /c/local#… : carte transportée dans le lien (secours sans stockage).
  const local = id === 'local';
  res.statusCode = card || local ? 200 : failed ? 503 : 404;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  // Une carte ne change plus une fois scellée : le CDN de Vercel peut la garder longtemps.
  res.setHeader('Cache-Control', card
    ? 'public, max-age=300, s-maxage=31536000, stale-while-revalidate=86400'
    : 'public, max-age=0, s-maxage=30');
  res.end(renderCardPage({ card, id, origin: originOf(req) }));
}
