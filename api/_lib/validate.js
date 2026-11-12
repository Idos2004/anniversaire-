// Validation stricte de ce qu'on accepte de stocker.
export const STYLES = ['lettre', 'souvenirs', 'secret', 'toast'];
const SCENE_TYPES = ['intro', 'memory', 'joke', 'portrait', 'photo', 'thanks', 'wish', 'reveal', 'secret', 'closing', 'teaser', 'fact', 'countdown'];
const RELS = ['ami', 'meilleur', 'amour', 'mere', 'pere', 'frere', 'soeur', 'enfant', 'grandparent', 'collegue', 'autre'];
const MUSIC = ['boite', 'piano', 'none'];
export const MAX_PHOTOS = 3;
export const MAX_PHOTO_CHARS = 240000; // ~175 Ko de JPEG
const PHOTO_RE = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/;

// Supprime les caractères de contrôle (sauf saut de ligne) et limite la longueur.
function text(v, max, multiline) {
  if (typeof v !== 'string') return '';
  let s = v.replace(/\r\n?/g, '\n').replace(multiline ? /[\u0000-\u0009\u000b-\u001f\u007f]/g : /[\u0000-\u001f\u007f]/g, '');
  s = s.replace(/\n{3,}/g, '\n\n').trim();
  return s.length > max ? s.slice(0, max) : s;
}

export function validateCard(body) {
  if (!body || typeof body !== 'object') return { error: 'invalid_body' };
  const c = body.card;
  if (!c || typeof c !== 'object') return { error: 'missing_card' };

  const style = STYLES.includes(c.style) ? c.style : null;
  if (!style) return { error: 'invalid_style' };
  const to = text(c.to, 40);
  const from = text(c.from, 40);
  if (!to) return { error: 'missing_recipient' };
  if (!from) return { error: 'missing_sender' };

  if (!Array.isArray(c.scenes) || c.scenes.length < 1 || c.scenes.length > 20) return { error: 'invalid_scenes' };
  const images = Array.isArray(body.images) ? body.images.slice(0, MAX_PHOTOS) : [];
  for (const img of images) {
    if (typeof img !== 'string' || img.length > MAX_PHOTO_CHARS || !PHOTO_RE.test(img)) return { error: 'invalid_photo' };
  }
  const photos = (Array.isArray(c.photos) ? c.photos : []).slice(0, images.length).map(p => ({ cap: text(p && p.cap, 80) }));
  while (photos.length < images.length) photos.push({ cap: '' });

  const scenes = [];
  for (const s of c.scenes) {
    if (!s || typeof s !== 'object' || !SCENE_TYPES.includes(s.t)) return { error: 'invalid_scene' };
    const p = Number.isInteger(s.p) && s.p >= 0 && s.p < images.length ? s.p : -1;
    const scene = { t: s.t, title: text(s.title, 160), x: text(s.x, 1500, true), p };
    if (s.t === 'photo' && p < 0) continue;
    if (!scene.x && !scene.title && s.t !== 'photo' && s.t !== 'countdown') continue;
    scenes.push(scene);
  }
  if (!scenes.length) return { error: 'empty_card' };

  const age = Number.isInteger(c.age) && c.age > 0 && c.age <= 120 ? c.age : null;
  const card = {
    v: 3,
    style,
    to,
    from,
    g: c.g === 'm' || c.g === 'f' ? c.g : '',
    fg: c.fg === 'm' || c.fg === 'f' ? c.fg : '',
    rel: RELS.includes(c.rel) ? c.rel : 'autre',
    age,
    scenes,
    sign: { lead: text(c.sign && c.sign.lead, 80), name: text(c.sign && c.sign.name, 60) },
    music: MUSIC.includes(c.music) ? c.music : 'boite',
    photos
  };
  return { card, images: images.map(i => i.slice(i.indexOf(',') + 1)) };
}
