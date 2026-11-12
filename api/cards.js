// POST /api/cards — enregistre une carte et renvoie son lien court.
import { pipeline, storeMode, StoreUnavailable } from './_lib/store.js';
import { validateCard } from './_lib/validate.js';
import { newId, sendJson, readJson, originOf, clientIp } from './_lib/http.js';

const HOURLY_LIMIT = 30;

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return sendJson(res, 204, {}, { Allow: 'POST' });
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'method_not_allowed' }, { Allow: 'POST' });
  if (storeMode === 'none') return sendJson(res, 503, { error: 'storage_unconfigured' });

  let body;
  try {
    body = await readJson(req, 1_200_000);
  } catch (e) {
    return sendJson(res, e.status === 413 ? 413 : 400, { error: e.status === 413 ? 'too_large' : 'invalid_json' });
  }
  const { card, images, error } = validateCard(body);
  if (error) return sendJson(res, 400, { error });

  try {
    const bucket = `rl:${clientIp(req)}:${Math.floor(Date.now() / 3_600_000)}`;
    const [count] = await pipeline([['INCR', bucket], ['EXPIRE', bucket, '3700']]);
    if (count > HOURLY_LIMIT) return sendJson(res, 429, { error: 'rate_limited' });

    for (let attempt = 0; attempt < 5; attempt++) {
      const id = newId(7);
      const stored = { ...card, created: Date.now() };
      const [ok] = await pipeline([['SET', `card:${id}`, JSON.stringify(stored), 'NX']]);
      if (ok !== 'OK') continue; // collision improbable : on retente
      if (images.length) await pipeline(images.map((b64, i) => ['SET', `card:${id}:p${i}`, b64]));
      return sendJson(res, 201, { id, url: `${originOf(req)}/c/${id}` });
    }
    return sendJson(res, 500, { error: 'id_collision' });
  } catch (e) {
    if (e instanceof StoreUnavailable) return sendJson(res, 503, { error: 'storage_unconfigured' });
    console.error('[cards] store error', e && e.message);
    return sendJson(res, 502, { error: 'storage_error' });
  }
}
