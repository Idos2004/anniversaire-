/*! Éclat — visionneuse : enveloppe, récit progressif, bougie, surprise, lettre à garder. */
(() => {
  'use strict';

  const D = document;
  const app = D.getElementById('app');
  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const IN_FRAME = window.parent !== window;
  const music = window.EclatMusic ? window.EclatMusic.create() : null;

  const FONTS = {
    lettre: 'family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Caveat:wght@500;700',
    souvenirs: 'family=Lora:ital,wght@0,400;0,500;1,400&family=Caveat:wght@500;700&family=Courier+Prime',
    secret: 'family=Fraunces:opsz,wght@9..144,400;9..144,600&family=DM+Sans:wght@400;500&family=Caveat:wght@500;700',
    toast: 'family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&family=Caveat:wght@500;700'
  };
  const THEME = { lettre: '#efe6d8', souvenirs: '#e8dcc8', secret: '#0e1322', toast: '#fbe3cf' };
  const PALETTE = {
    lettre: ['#b4532a', '#d9a441', '#f3e3c3', '#8e2b25'],
    souvenirs: ['#a8713f', '#e8d3b0', '#6b4a2b', '#c96f4a'],
    secret: ['#e9c46a', '#f6f1e7', '#9fb7ff', '#c9a24a'],
    toast: ['#e2553f', '#2a9d8f', '#f4a261', '#ffd166', '#7b5cff']
  };
  const seul = g => (g === 'm' ? 'seul' : g === 'f' ? 'seule' : 'seul·e');
  const COPY = {
    lettre: { kicker: () => 'Une lettre est arrivée pour toi.', candle: 'Fais un vœu… puis souffle la bougie.', cover: ['P.-S.', 'Il reste une dernière chose. Déplie-moi.'] },
    souvenirs: { kicker: () => 'Quelques souvenirs t’attendent.', candle: 'Fais un vœu… puis souffle.', cover: ['Une photo à développer', 'Touche-la pour la révéler.'] },
    secret: { kicker: g => `Un secret t’attend. Ouvre-le quand tu seras ${seul(g)}.`, candle: 'Fais un vœu. Personne ne le saura.', cover: ['Le vrai secret', 'Touche pour l’ouvrir.'] },
    toast: { kicker: () => 'Quelqu’un a préparé un discours rien que pour toi.', candle: 'Fais un vœu… et souffle fort !', cover: ['Un cadeau sur la table', 'Touche pour l’ouvrir.'] }
  };
  const ICON_SOUND = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  const ICON_MUTE = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 9.5l5 5m0-5l-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

  let card = null;
  let S = {};

  /* ------------------------------------------------------------ utilitaires */

  function el(tag, cls, text) {
    const n = D.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  const wait = ms => new Promise(r => S.timers.push(setTimeout(r, ms)));
  function later(fn, ms) { S.timers.push(setTimeout(fn, ms)); }
  function clearTimers() { (S.timers || []).forEach(clearTimeout); S.timers = []; }

  function splitSentences(p) {
    const out = [];
    let cur = '';
    for (let k = 0; k < p.length; k++) {
      cur += p[k];
      if ('.!?…'.indexOf(p[k]) > -1) {
        while (k + 1 < p.length && '.!?…»”)'.indexOf(p[k + 1]) > -1) cur += p[++k];
        if (p[k + 1] === ' ' || p[k + 1] === '\n') { out.push(cur.trim()); cur = ''; }
      }
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }

  function textBlock(x, start) {
    const wrap = el('div', 'txt');
    let d = start || 0;
    String(x || '').split(/\n{2,}/).forEach(par => {
      if (!par.trim()) return;
      const p = el('p');
      splitSentences(par).forEach(sen => {
        const s = el('span', 's', sen + ' ');
        s.style.animationDelay = d.toFixed(2) + 's';
        p.append(s);
        d += 0.32 + Math.min(1.7, sen.length * 0.018);
      });
      wrap.append(p);
    });
    wrap.end = d;
    return wrap;
  }

  function ensureFonts(style) {
    if (D.querySelector(`link[data-fonts="${style}"]`)) return;
    const l = el('link');
    l.rel = 'stylesheet';
    l.href = `https://fonts.googleapis.com/css2?${FONTS[style]}&display=swap`;
    l.dataset.fonts = style;
    D.head.append(l);
  }

  function photoSrc(i) {
    const p = card.photos[i];
    if (!p) return '';
    if (p.src) return p.src;
    return card.id ? `/api/photo?id=${encodeURIComponent(card.id)}&n=${i}` : '';
  }

  function polaroid(i, tilt) {
    const src = photoSrc(i);
    if (!src) return null;
    const f = el('figure', 'polaroid');
    f.style.setProperty('--tilt', (tilt || -2) + 'deg');
    const img = new Image();
    img.decoding = 'async';
    img.alt = card.photos[i].cap || 'Un souvenir en photo';
    img.onerror = () => f.remove();
    img.src = src;
    f.append(img);
    if (card.photos[i].cap) f.append(el('figcaption', '', card.photos[i].cap));
    return f;
  }

  let confettiP = null;
  function confetti(power) {
    if (REDUCE) return;
    if (!confettiP) {
      confettiP = window.confetti ? Promise.resolve(window.confetti) : new Promise(res => {
        const s = el('script');
        s.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js';
        s.async = true;
        s.onload = () => res(window.confetti || null);
        s.onerror = () => res(null);
        D.head.append(s);
      });
    }
    confettiP.then(fn => {
      if (!fn) return;
      const colors = PALETTE[card.style];
      const shapes = card.style === 'secret' ? ['star', 'circle'] : undefined;
      const p = power || 1;
      fn({ particleCount: Math.round(90 * p), spread: 80, startVelocity: 40, origin: { y: 0.55 }, colors, shapes, scalar: 0.95 });
      setTimeout(() => fn({ particleCount: Math.round(45 * p), angle: 60, spread: 60, origin: { x: 0, y: 0.75 }, colors, shapes }), 200);
      setTimeout(() => fn({ particleCount: Math.round(45 * p), angle: 120, spread: 60, origin: { x: 1, y: 0.75 }, colors, shapes }), 340);
    });
  }

  function thanksLink() {
    const msg = card.from
      ? `${card.from}, je viens d’ouvrir ton enveloppe… Merci, vraiment. 🥹💛`
      : 'Je viens d’ouvrir ton enveloppe… Merci, vraiment. 🥹💛';
    return 'https://wa.me/?text=' + encodeURIComponent(msg);
  }

  /* ---------------------------------------------------------------- données */

  const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
  function sanitize(d) {
    if (!d || typeof d !== 'object' || !Array.isArray(d.scenes)) return null;
    const style = ['lettre', 'souvenirs', 'secret', 'toast'].indexOf(d.style) > -1 ? d.style : 'lettre';
    const photos = Array.isArray(d.photos) ? d.photos.slice(0, 3).map(p => ({
      cap: str(p && p.cap, 80),
      src: p && typeof p.src === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(p.src) ? p.src : ''
    })) : [];
    const scenes = d.scenes.slice(0, 20).map(s => ({
      t: str(s && s.t, 20) || 'intro',
      title: str(s && s.title, 160),
      x: str(s && s.x, 2000),
      p: s && Number.isInteger(s.p) && s.p >= 0 && s.p < photos.length ? s.p : -1
    })).filter(s => s.x || s.title || s.t === 'photo' || s.t === 'countdown');
    if (!scenes.length) return null;
    return {
      id: /^[A-Za-z0-9]{4,12}$/.test(d.id || '') ? d.id : '',
      style, scenes, photos,
      to: str(d.to, 40) || 'toi',
      from: str(d.from, 40),
      g: d.g === 'm' || d.g === 'f' ? d.g : '',
      sign: { lead: str(d.sign && d.sign.lead, 80), name: str(d.sign && d.sign.name, 60) },
      music: ['boite', 'piano', 'none'].indexOf(d.music) > -1 ? d.music : 'boite',
      created: Number(d.created) || 0
    };
  }

  function bytesFromB64(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function fromLegacy(d) {
    const to = str(d.recipient, 40) || 'toi';
    const isBirthday = /^birthday/.test(String(d.template || '')) || d.occasion === 'birthday';
    const hasPhoto = typeof d.photo === 'string' && /^data:image\//.test(d.photo);
    const scenes = [{ t: 'intro', title: str(d.headline, 90) || 'Pour ' + to, x: str(d.message, 700), p: hasPhoto ? 0 : -1 }];
    if (isBirthday) scenes.push({ t: 'reveal', title: 'Joyeux anniversaire, ' + to, x: '' });
    scenes.push({ t: 'closing', title: '', x: str(d.strong, 180) || ' ' });
    return {
      style: 'lettre', to, from: str(d.sender, 40), scenes,
      sign: { lead: d.sender ? 'Avec affection,' : '', name: str(d.sender, 40) },
      music: d.music === 'none' ? 'none' : 'boite',
      photos: hasPhoto ? [{ cap: '', src: d.photo }] : []
    };
  }

  async function fromHash() {
    let h = location.hash;
    try { h = decodeURIComponent(h); } catch (e) { /* hash déjà décodé */ }
    if (h.indexOf('#d=') === 0 && 'DecompressionStream' in window) {
      const stream = new Blob([bytesFromB64(h.slice(3))]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return JSON.parse(await new Response(stream).text());
    }
    if (h.indexOf('#j=') === 0) return JSON.parse(new TextDecoder().decode(bytesFromB64(h.slice(3))));
    const m = h.match(/^#(?:data|carte)=(.+)$/);
    if (m) return fromLegacy(JSON.parse(new TextDecoder().decode(bytesFromB64(m[1]))));
    return null;
  }

  async function readCard() {
    const tag = D.getElementById('card-data');
    if (tag) {
      try { const d = JSON.parse(tag.textContent); if (d) return d; } catch (e) { /* ignore */ }
    }
    try { return await fromHash(); } catch (e) { return null; }
  }

  /* --------------------------------------------------------------- enveloppe */

  function mount(data, opts) {
    clearTimers();
    if (music) music.stop();
    card = data;
    S = { i: 0, mode: 'envelope', blown: {}, opened: {}, timers: [], ready: false, preview: !!(opts && opts.preview) };
    D.body.dataset.style = card.style;
    ensureFonts(card.style);
    const meta = D.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = THEME[card.style];
    app.textContent = '';
    app.append(el('div', 'backdrop'));
    if (S.preview) app.append(el('span', 'preview-badge', 'Aperçu'));
    buildEnvelope();
    buildStory();
    if (opts && opts.at === 'story') { openNow(); }
  }

  function buildEnvelope() {
    const screen = el('section', 'env-screen');
    const kicker = el('p', 'env-kicker', COPY[card.style].kicker(card.g));
    const env = el('div', 'env');
    env.setAttribute('role', 'presentation');
    const letter = el('div', 'env-letter');
    letter.append(el('span', 'l-to', 'Pour ' + card.to), el('i'), el('i'), el('i'), el('i'));
    const pocketWrap = el('div', 'env-pocket-wrap');
    const pocket = el('div', 'env-pocket');
    const date = new Date(card.created || Date.now());
    const pm = el('span', 'postmark');
    pm.append(el('b', '', date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).replace('.', '').toUpperCase()), el('small', '', String(date.getFullYear())));
    pocket.append(el('span', 'env-to', 'Pour ' + card.to), pm);
    if (card.from) pocket.append(el('span', 'env-from', 'de la part de ' + card.from));
    pocketWrap.append(pocket);
    const flap = el('div', 'env-flap');
    flap.append(el('div', 'flap-out'), el('div', 'flap-in'));
    const seal = el('button', 'seal');
    seal.type = 'button';
    seal.setAttribute('aria-label', 'Ouvrir l’enveloppe');
    seal.append(el('span', '', (card.from || '♥').charAt(0).toUpperCase()));
    env.append(el('div', 'env-back'), letter, pocketWrap, flap, seal);
    const hint = el('p', 'env-hint', 'Touche le sceau pour ouvrir');
    screen.append(kicker, env, hint);
    env.addEventListener('click', open);
    app.append(screen);
    S.envScreen = screen;
    S.envLabels = { kicker, letterTo: letter.firstChild, to: pocket.querySelector('.env-to'), seal: seal.firstChild };
  }

  async function open() {
    if (S.mode !== 'envelope' || S.opening) return;
    S.opening = true;
    if (music && card.music !== 'none') music.start(card.music);
    if (navigator.vibrate) try { navigator.vibrate(12); } catch (e) { /* facultatif */ }
    preloadPhotos();
    app.classList.add('is-opening');
    await wait(REDUCE ? 50 : 1900);
    app.classList.add('is-leaving');
    await wait(REDUCE ? 50 : 450);
    showStory();
  }

  function openNow() {
    app.classList.add('is-opening', 'is-leaving');
    showStory(true);
  }

  function preloadPhotos() {
    card.photos.forEach((p, i) => { const src = photoSrc(i); if (src && !p.src) { const im = new Image(); im.src = src; } });
  }

  /* ------------------------------------------------------------------ récit */

  function buildStory() {
    const story = el('section', 'story');
    story.setAttribute('aria-live', 'polite');
    const top = el('header', 'story-top');
    const bars = el('div', 'bars');
    card.scenes.forEach(() => bars.append(el('i')));
    const mute = el('button', 'icon-btn mute');
    mute.type = 'button';
    mute.setAttribute('aria-label', 'Couper le son');
    mute.innerHTML = ICON_SOUND;
    mute.hidden = card.music === 'none';
    mute.addEventListener('click', e => {
      e.stopPropagation();
      if (!music) return;
      music.setMuted(!music.muted);
      mute.innerHTML = music.muted ? ICON_MUTE : ICON_SOUND;
      mute.setAttribute('aria-label', music.muted ? 'Activer le son' : 'Couper le son');
    });
    top.append(bars, mute);
    const body = el('div', 'story-body');
    const nav = el('footer', 'story-nav');
    const prev = el('button', 'icon-btn nav-prev', '←');
    prev.type = 'button';
    prev.setAttribute('aria-label', 'Passage précédent');
    const next = el('button', 'btn primary nav-next', 'Continuer');
    next.type = 'button';
    prev.addEventListener('click', e => { e.stopPropagation(); go(S.i - 1); });
    next.addEventListener('click', e => { e.stopPropagation(); advance(); });
    nav.append(prev, next);
    story.append(top, body, nav);

    body.addEventListener('click', e => {
      if (e.target.closest('button, a, input, textarea')) return;
      if (S.swiped) { S.swiped = false; return; }
      const r = body.getBoundingClientRect();
      if (e.clientX - r.left < r.width * 0.28 && S.i > 0 && S.ready) go(S.i - 1);
      else advance();
    });
    let x0 = null, y0 = null;
    body.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    body.addEventListener('touchend', e => {
      if (x0 == null) return;
      const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      x0 = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        S.swiped = true;
        if (dx < 0) advance(); else if (S.i > 0) go(S.i - 1);
      }
    }, { passive: true });

    app.append(story);
    S.story = story; S.body = body; S.bars = bars; S.prev = prev; S.next = next;
  }

  function showStory(instant) {
    S.mode = 'story';
    S.story.classList.add('on');
    if (S.envScreen) S.envScreen.setAttribute('aria-hidden', 'true');
    go(0, instant);
    S.next.focus({ preventScroll: true });
  }

  function setReady(v) {
    S.ready = v;
    S.story.classList.toggle('ready', v);
  }

  function advance() {
    if (S.mode !== 'story') return;
    if (!S.ready) {
      const sc = S.body.querySelector('.scene');
      if (!sc) return;
      const locked = sc.dataset.gate && !sc.classList.contains('blown') && !sc.classList.contains('opened');
      if (!locked) { clearTimers(); sc.classList.add('done'); setReady(true); }
      return;
    }
    if (S.i < card.scenes.length - 1) go(S.i + 1);
  }

  function go(i, instant) {
    if (i < 0 || i >= card.scenes.length) return;
    clearTimers();
    S.i = i;
    [...S.bars.children].forEach((b, k) => { b.className = k < i ? 'done' : k === i ? 'now' : ''; });
    S.prev.style.visibility = i > 0 ? 'visible' : 'hidden';
    const last = i === card.scenes.length - 1;
    S.next.hidden = last;
    S.next.textContent = card.scenes[i + 1] && card.scenes[i + 1].t === 'reveal' ? 'Et maintenant…' : 'Continuer';
    setReady(false);
    const old = S.body.querySelector('.scene');
    const draw = () => {
      S.body.textContent = '';
      const node = renderScene(card.scenes[i], i, instant || REDUCE);
      S.body.append(node);
      S.body.scrollTop = 0;
    };
    if (old && !instant && !REDUCE) {
      old.classList.add('leaving');
      later(draw, 260);
    } else draw();
  }

  function renderScene(s, idx, instant) {
    const node = el('article', 'scene t-' + s.t);
    const pageNo = el('span', 'page-no', 'page ' + (idx + 1));
    node.append(pageNo);
    let end = 0.4;

    if (s.t === 'reveal') return renderReveal(node, s, idx, instant);
    if (s.t === 'secret') return renderSecret(node, s, idx, instant);

    if (s.t === 'fact') node.append(el('p', 'numeral', s.title));
    else if (s.title) node.append(el('h2', 'scene-title', s.title));

    if (s.p >= 0) {
      const pol = polaroid(s.p, idx % 2 ? 2.5 : -2.5);
      if (pol) node.append(pol);
      end = 0.9;
    }

    if (s.x && s.x.trim()) {
      const t = textBlock(s.x, s.p >= 0 ? 0.9 : 0.25);
      node.append(t);
      end = t.end;
    }

    if (s.t === 'countdown') {
      const c = el('div', 'count');
      c.setAttribute('aria-hidden', 'true');
      node.append(c);
      node.dataset.gate = '1';
      if (instant) { setReady(true); return node; }
      later(async () => {
        for (const n of ['3', '2', '1']) {
          c.textContent = '';
          c.append(el('span', '', n));
          await wait(950);
        }
        go(S.i + 1);
      }, (end + 0.6) * 1000);
      return node;
    }

    if (s.t === 'closing') renderClosing(node, end, instant);

    if (instant) { node.classList.add('done'); setReady(true); }
    else later(() => { setReady(true); node.classList.add('done'); }, (end + 0.5) * 1000);
    return node;
  }

  function renderReveal(node, s, idx, instant) {
    const zone = el('div', 'candle-zone');
    const prompt = el('p', 'candle-prompt', COPY[card.style].candle);
    const candle = el('button', 'candle');
    candle.type = 'button';
    candle.setAttribute('aria-label', 'Souffler la bougie');
    candle.innerHTML = '<span class="glow"></span><span class="smoke"><i></i><i></i><i></i></span><span class="flame"></span><span class="wick"></span><span class="stick"></span>';
    const hint = el('p', 'candle-hint', 'Touche la flamme');
    zone.append(prompt, candle, hint);
    const title = el('h2', 'reveal-title', s.title);
    node.append(zone, title);
    const t = s.x && s.x.trim() ? textBlock(s.x, 1.1) : null;
    if (t) node.append(t);
    node.dataset.gate = '1';

    const finish = () => { node.classList.add('done'); setReady(true); };
    if (S.blown[idx]) {
      node.classList.add('blown', 'done');
      setReady(true);
      return node;
    }
    candle.addEventListener('click', e => {
      e.stopPropagation();
      if (node.classList.contains('blown')) return;
      S.blown[idx] = true;
      node.classList.add('blown');
      if (music && card.music !== 'none') music.melody();
      later(() => confetti(1.3), 350);
      if (navigator.vibrate) try { navigator.vibrate([10, 40, 10]); } catch (err) { /* facultatif */ }
      later(finish, ((t ? t.end : 0.8) + 0.8) * 1000);
    });
    if (instant && S.preview) { /* l'aperçu attend aussi le souffle */ }
    return node;
  }

  function renderSecret(node, s, idx, instant) {
    const box = el('button', 'secret-box');
    box.type = 'button';
    box.append(el('span', 'sc-title', COPY[card.style].cover[0]), el('span', 'sc-hint', COPY[card.style].cover[1]));
    const content = el('div', 'secret-content');
    if (s.title) content.append(el('h2', 'scene-title', s.title));
    const t = textBlock(s.x, 0.35);
    content.append(t);
    node.append(box, content);
    node.dataset.gate = '1';
    if (S.opened[idx]) {
      node.classList.add('opened', 'done');
      setReady(true);
      return node;
    }
    box.addEventListener('click', e => {
      e.stopPropagation();
      S.opened[idx] = true;
      node.classList.add('opened');
      confetti(0.6);
      later(() => { node.classList.add('done'); setReady(true); }, (t.end + 0.6) * 1000);
    });
    return node;
  }

  function renderClosing(node, end, instant) {
    if (card.sign.lead || card.sign.name) {
      const sign = el('div', 'sign');
      if (card.sign.lead) sign.append(el('p', 'sign-lead', card.sign.lead));
      if (card.sign.name) sign.append(el('p', 'sign-name', card.sign.name));
      sign.style.animationDelay = (instant ? 0 : end + 0.3) + 's';
      node.append(sign);
    }
    const actions = el('div', 'end-actions');
    actions.style.animationDelay = (instant ? 0 : end + 1.4) + 's';
    const reread = el('button', 'btn primary', 'Relire toute la lettre');
    reread.type = 'button';
    reread.addEventListener('click', e => { e.stopPropagation(); keepsake(); });
    actions.append(reread);
    if (!S.preview) {
      const thanks = el('a', 'btn', card.from ? 'Remercier ' + card.from : 'Dire merci');
      thanks.href = thanksLink();
      thanks.target = '_blank';
      thanks.rel = 'noopener';
      const mine = el('a', 'btn ghost', 'Créer ma propre carte');
      mine.href = '/';
      actions.append(thanks, mine);
    }
    node.append(actions);
    if (!instant) later(() => confetti(0.35), (end + 0.6) * 1000);
  }

  /* ----------------------------------------------------- la lettre à garder */

  function keepsake() {
    clearTimers();
    S.mode = 'keepsake';
    const old = app.querySelector('.keepsake');
    if (old) old.remove();
    const wrap = el('section', 'keepsake');
    const paper = el('article', 'ks-paper');
    paper.append(el('p', 'ks-kicker', 'Pour ' + card.to));
    card.scenes.forEach(s => {
      if (s.t === 'countdown' || s.t === 'teaser') return;
      const block = el('div', 'ks-block ks-' + s.t);
      if (s.t === 'reveal') block.append(el('h2', 'ks-reveal', s.title));
      else if (s.t === 'fact') block.append(el('p', 'ks-num', s.title));
      else if (s.title && s.t === 'intro' && card.style === 'lettre') block.append(el('p', 'ks-salut', s.title));
      else if (s.title) block.append(el('h3', 'ks-title', s.title));
      if (s.p >= 0) { const p = polaroid(s.p, -1.5); if (p) block.append(p); }
      if (s.x && s.x.trim()) s.x.split(/\n{2,}/).forEach(par => block.append(el('p', 'ks-p', par)));
      paper.append(block);
    });
    if (card.sign.lead || card.sign.name) {
      const sign = el('div', 'sign static');
      if (card.sign.lead) sign.append(el('p', 'sign-lead', card.sign.lead));
      if (card.sign.name) sign.append(el('p', 'sign-name', card.sign.name));
      paper.append(sign);
    }
    const bar = el('div', 'ks-actions');
    const replay = el('button', 'btn', 'Rejouer l’ouverture');
    replay.type = 'button';
    replay.addEventListener('click', () => mount(card, { preview: S.preview }));
    const save = el('button', 'btn', 'Garder une copie (PDF)');
    save.type = 'button';
    save.addEventListener('click', () => window.print());
    bar.append(replay, save);
    if (!S.preview) {
      const thanks = el('a', 'btn primary', card.from ? 'Remercier ' + card.from : 'Dire merci');
      thanks.href = thanksLink(); thanks.target = '_blank'; thanks.rel = 'noopener';
      const mine = el('a', 'btn ghost', 'Créer ma propre carte');
      mine.href = '/';
      bar.append(thanks, mine);
    }
    wrap.append(paper, bar);
    app.append(wrap);
    requestAnimationFrame(() => wrap.classList.add('on'));
  }

  function missing() {
    D.body.dataset.style = 'lettre';
    ensureFonts('lettre');
    app.textContent = '';
    app.append(el('div', 'backdrop'));
    const box = el('section', 'missing');
    box.append(el('p', 'env-kicker', 'Oups…'), el('h1', '', 'Cette enveloppe s’est égarée.'),
      el('p', '', 'Le lien est peut-être incomplet. Demande à la personne qui te l’a envoyé de le vérifier… ou prépare ta propre surprise.'));
    const a = el('a', 'btn primary', 'Créer une carte');
    a.href = '/';
    box.append(a);
    app.append(box);
  }

  /* ---------------------------------------------------------- mise à jour */

  function update(data) {
    const prevStyle = card && card.style;
    if (!card || data.style !== prevStyle) return mount(data, { preview: true });
    card = data;
    if (S.mode === 'envelope') {
      S.envLabels.kicker.textContent = COPY[card.style].kicker(card.g);
      S.envLabels.letterTo.textContent = 'Pour ' + card.to;
      S.envLabels.to.textContent = 'Pour ' + card.to;
      S.envLabels.seal.textContent = (card.from || '♥').charAt(0).toUpperCase();
      const bars = S.bars;
      bars.textContent = '';
      card.scenes.forEach(() => bars.append(el('i')));
    } else if (S.mode === 'story') {
      S.bars.textContent = '';
      card.scenes.forEach(() => S.bars.append(el('i')));
      go(Math.min(S.i, card.scenes.length - 1), true);
    } else if (S.mode === 'keepsake') keepsake();
  }

  /* ------------------------------------------------------------- démarrage */

  D.addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input, textarea')) return;
    if (S.mode === 'envelope' && (e.key === 'Enter' || e.key === ' ') && !e.target.closest('button')) { e.preventDefault(); open(); }
    else if (S.mode === 'story') {
      if (e.key === 'ArrowRight' || ((e.key === ' ' || e.key === 'Enter') && !e.target.closest('button, a'))) { e.preventDefault(); advance(); }
      else if (e.key === 'ArrowLeft') go(S.i - 1);
    }
  });
  D.addEventListener('visibilitychange', () => {
    if (!music) return;
    if (D.hidden) music.suspend(); else music.resume();
  });

  window.addEventListener('message', e => {
    if (e.origin !== location.origin || !e.data || typeof e.data !== 'object') return;
    const m = e.data;
    if (m.type === 'eclat:card') {
      const data = sanitize(m.card);
      if (!data) return;
      if (m.reset || !card) mount(data, { preview: true }); else update(data);
    } else if (m.type === 'eclat:pause' && music) music.stop();
  });

  (async () => {
    const raw = await readCard();
    const data = sanitize(raw);
    if (data) mount(data, { preview: false });
    else if (IN_FRAME && D.body.dataset.mode === 'preview') window.parent.postMessage({ type: 'eclat:ready' }, location.origin);
    else missing();
  })();
})();
