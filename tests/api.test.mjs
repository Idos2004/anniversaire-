import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dataDir = mkdtempSync(path.join(tmpdir(), 'eclat-test-'));
process.env.ECLAT_DATA_DIR = dataDir;
delete process.env.KV_REST_API_URL;
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.VERCEL;

const { createServer } = await import('../scripts/dev.mjs');
let server, base;

before(async () => {
  server = createServer();
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); rmSync(dataDir, { recursive: true, force: true }); });

// JPEG 1×1 valide
const JPEG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
const card = (over = {}) => ({
  style: 'secret', to: 'Awa <script>', from: 'Koffi', g: 'f', fg: 'm', rel: 'meilleur', age: 27,
  scenes: [
    { t: 'intro', title: 'Avant de commencer', x: 'Trouve un endroit calme.', p: -1 },
    { t: 'memory', title: '', x: 'Tu te souviens ?', p: 0 },
    { t: 'reveal', title: 'Joyeux anniversaire, Awa', x: '', p: -1 },
    { t: 'closing', title: '', x: 'Voilà.', p: -1 }
  ],
  sign: { lead: 'Ton complice,', name: 'Koffi' }, music: 'boite', photos: [{ cap: 'Bassam' }],
  ...over
});
const post = body => fetch(base + '/api/cards', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.0.0.' + Math.floor(Math.random() * 200) }, body: JSON.stringify(body) });

let created;

test('création : lien court /c/xxxxxxx', async () => {
  const r = await post({ card: card(), images: [JPEG] });
  assert.equal(r.status, 201);
  created = await r.json();
  assert.match(created.id, /^[2-9a-km-zA-HJ-NP-Z]{7}$/);
  assert.equal(created.url, `${base}/c/${created.id}`);
});

test('page de carte : métadonnées Open Graph pour WhatsApp', async () => {
  const r = await fetch(`${base}/c/${created.id}`, { headers: { 'User-Agent': 'WhatsApp/2.23.20 A' } });
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /text\/html/);
  const html = await r.text();
  const meta = p => (html.match(new RegExp(`<meta property="${p}" content="([^"]*)"`)) || [])[1];
  assert.equal(meta('og:title'), 'Awa &lt;script&gt;, une enveloppe t’attend 💌');
  assert.equal(meta('og:description'), 'Koffi te confie un secret. Ne l’ouvre pas devant tout le monde…');
  assert.equal(meta('og:image'), `${base}/assets/og/envelope-secret.jpg`);
  assert.equal(meta('og:url'), `${base}/c/${created.id}`);
  assert.ok(html.indexOf('og:image') < 1500, 'balises OG en tête de document');
  assert.ok(!html.includes('<script>"'), 'pas d’injection');
  assert.ok(!/Awa <script>/.test(html), 'nom échappé dans le HTML et le JSON');
  const img = await fetch(meta('og:image'));
  assert.equal(img.status, 200);
  assert.ok(Number((await img.arrayBuffer()).byteLength) < 300_000, 'image d’aperçu < 300 Ko');
});

test('photo servie séparément, en cache long', async () => {
  const r = await fetch(`${base}/api/photo?id=${created.id}&n=0`);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'image/jpeg');
  assert.match(r.headers.get('cache-control'), /immutable/);
  assert.equal((await fetch(`${base}/api/photo?id=${created.id}&n=1`)).status, 404);
  assert.equal((await fetch(`${base}/api/photo?id=../x&n=0`)).status, 404);
});

test('carte inconnue : 404 avec page lisible', async () => {
  const r = await fetch(`${base}/c/zzzzzzz`);
  assert.equal(r.status, 404);
  assert.match(await r.text(), /enveloppe t’attend/);
  assert.equal((await fetch(`${base}/c/local`)).status, 200);
});

test('validation stricte', async () => {
  assert.equal((await post({ card: card({ style: 'neon' }) })).status, 400);
  assert.equal((await post({ card: card({ to: '' }) })).status, 400);
  assert.equal((await post({ card: card({ scenes: [{ t: 'evil', x: 'a' }] }) })).status, 400);
  assert.equal((await post({ card: card(), images: ['data:image/svg+xml;base64,PHN2Zz4='] })).status, 400);
  assert.equal((await fetch(base + '/api/cards')).status, 405);
  const r = await post({ card: card({ scenes: [{ t: 'photo', p: 2 }, { t: 'closing', x: 'ok' }] }) });
  assert.equal(r.status, 201, 'les scènes photo sans image sont ignorées');
});

test('limite de création par heure', async () => {
  const send = () => fetch(base + '/api/cards', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '203.0.113.9' }, body: JSON.stringify({ card: card() }) });
  let last;
  for (let i = 0; i < 31; i++) last = await send();
  assert.equal(last.status, 429);
});

test('pages statiques servies', async () => {
  for (const p of ['/', '/apercu.html', '/assets/js/card.js', '/assets/js/studio.js', '/assets/img/icon-180.png']) {
    assert.equal((await fetch(base + p)).status, 200, p);
  }
});
