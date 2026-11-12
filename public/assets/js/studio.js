/*! Éclat — studio de création */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const Story = window.EclatStory;
  const DRAFT = 'eclat:draft:v3';
  const SENT = 'eclat:sent:v3';
  const ls = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* idem */ } }
  };
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  const blank = () => ({ rel: '', g: '', to: '', age: '', years: '', from: '', fg: '', memory: '', admire: '', qualities: [], thanks: '', joke: '', wish: '', secret: '' });
  const state = { step: 0, maxStep: 1, a: blank(), style: 'lettre', music: 'boite', photos: [], variants: {}, scenes: null, genKey: '', sign: null, signEdited: false, frameReady: false, demo: false, result: null };

  const MEMORY_PH = {
    friend: 'ce soir où on a raté le dernier bus et marché deux heures sous la pluie en riant',
    best: 'nos nuits à refaire le monde sur le toit, avec un seul paquet de biscuits pour deux',
    love: 'notre premier rendez-vous, et ce fou rire qui a tout changé',
    parent: 'tes chansons du dimanche matin, quand toute la maison sentait le café',
    sibling: 'nos cabanes de draps dans le salon et nos disputes pour la dernière part de gâteau',
    child: 'le jour où tu as fait tes premiers pas jusqu’à mes bras',
    elder: 'les après-midis dans ta cour, tes histoires et ton jus de bissap bien frais',
    work: 'ce rush de fin d’année où on a tenu grâce à tes blagues et au café',
    other: 'ce jour où tu m’as tendu la main sans que je le demande'
  };
  const DEMO = {
    rel: 'meilleur', g: 'f', to: 'Awa', age: '27', years: '12', from: 'Koffi', fg: 'm',
    memory: 'cette nuit à Grand-Bassam où on a attendu le lever du soleil en refaisant le monde',
    admire: 'ta façon de rester douce avec tout le monde, même quand la vie ne l’est pas avec toi',
    qualities: ['solaire', 'loyal', 'courageux'],
    thanks: 'toutes ces fois où tu as décroché à 2 h du matin sans poser de questions',
    joke: 'le fameux gâteau au sel de 2016',
    wish: 'de décrocher ce poste à Dakar et de garder ce rire qui fait du bien à tout le monde',
    secret: 'Regarde ta boîte aux lettres samedi matin. Je n’en dis pas plus.'
  };

  /* ------------------------------------------------------------ utilitaires */

  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => t.classList.remove('show'), 3200);
  }
  const group = () => (Story.RELATIONS[state.a.rel] || Story.RELATIONS.autre).group;
  const gender = () => (Story.RELATIONS[state.a.rel] && Story.RELATIONS[state.a.rel].g) || state.a.g;
  const answers = () => Object.assign({}, state.a, { photos: state.photos.map(p => ({ cap: p.cap })) });
  const genKey = () => JSON.stringify([state.a, state.style, state.photos.length]);

  function cardData(withSrc) {
    const gen = Story.build(answers(), state.style, state.variants);
    const useEdited = state.scenes && state.genKey === genKey();
    const scenes = (useEdited ? state.scenes : gen.scenes).map(s => ({ t: s.t, title: s.title, x: s.x, p: s.p }));
    const sign = useEdited && state.sign ? state.sign : (state.signEdited && state.sign ? state.sign : gen.sign);
    const c = gen.ctx;
    return {
      style: gen.style, to: c.to, from: c.from, g: c.g, fg: c.fg, rel: c.rel, age: c.age,
      scenes, sign: { lead: sign.lead, name: sign.name || c.from }, music: state.music,
      photos: state.photos.map(p => (withSrc ? { cap: p.cap, src: p.src } : { cap: p.cap }))
    };
  }

  /* ---------------------------------------------------------------- aperçu */

  const frame = $('frame');
  const preview = $('preview');
  function ensureFrame() { if (!frame.getAttribute('src')) frame.src = '/apercu.html'; }
  function post(msg) { if (state.frameReady && frame.contentWindow) frame.contentWindow.postMessage(msg, location.origin); }
  function sendPreview(reset) {
    if (!state.frameReady) return;
    const card = state.demo ? demoCard() : cardData(true);
    post({ type: 'eclat:card', card, reset: !!reset });
  }
  const schedulePreview = debounce(() => sendPreview(false), 350);
  function demoCard() {
    const g = Story.build(DEMO, 'lettre');
    return { style: 'lettre', to: 'Awa', from: 'Koffi', g: 'f', scenes: g.scenes, sign: g.sign, music: 'boite', photos: [] };
  }
  window.addEventListener('message', e => {
    if (e.origin !== location.origin || !e.data || e.source !== frame.contentWindow) return;
    if (e.data.type === 'eclat:ready') { state.frameReady = true; sendPreview(true); }
  });
  function openPreview() {
    ensureFrame();
    preview.classList.add('is-open');
    document.body.classList.add('locked');
    sendPreview(true);
  }
  function closePreview() {
    preview.classList.remove('is-open');
    document.body.classList.remove('locked');
    post({ type: 'eclat:pause' });
    if (state.demo) { state.demo = false; sendPreview(true); }
  }
  $('close-preview').addEventListener('click', closePreview);
  $('replay').addEventListener('click', () => sendPreview(true));
  document.querySelectorAll('[data-preview]').forEach(b => b.addEventListener('click', openPreview));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && preview.classList.contains('is-open')) closePreview(); });

  /* ----------------------------------------------------------- navigation */

  function show(step, opts) {
    state.step = step;
    if (step >= 1 && step <= 4) state.maxStep = Math.max(state.maxStep, step);
    $('home').hidden = step !== 0;
    $('wizard').hidden = step === 0;
    for (let i = 1; i <= 5; i++) $('step-' + i).hidden = i !== step;
    $('steps').hidden = !(step >= 1 && step <= 4);
    document.querySelectorAll('#steps li').forEach(li => {
      const n = Number(li.dataset.step);
      li.classList.toggle('on', n === step);
      li.classList.toggle('done', n < step || n <= state.maxStep);
    });
    document.body.classList.toggle('docked', step >= 1 && step <= 4);
    if (step === 0 || step === 5) post({ type: 'eclat:pause' });
    $('fab').hidden = !(step >= 2 && step <= 3);
    if (step >= 1 && step <= 4) ensureFrame();
    if (step === 2) enterStory();
    if (step === 3) renderStyles();
    if (step === 4) enterReview();
    document.querySelectorAll('[data-bind="to"]').forEach(n => { n.textContent = state.a.to.trim() || (gender() === 'm' ? 'lui' : 'elle'); });
    if (!opts || !opts.fromPop) history.pushState({ step }, '', step === 0 ? location.pathname : location.pathname + '#etape-' + step);
    window.scrollTo({ top: 0, behavior: opts && opts.fromPop ? 'auto' : 'smooth' });
    if (step >= 1 && step <= 4) { saveDraft(); schedulePreview(); }
  }
  window.addEventListener('popstate', e => {
    if (preview.classList.contains('is-open')) closePreview();
    const s = e.state && Number.isInteger(e.state.step) ? e.state.step : 0;
    show(s === 5 ? 0 : s, { fromPop: true });
  });
  document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', () => show(Math.max(1, state.step - 1))));
  document.querySelectorAll('[data-home]').forEach(b => b.addEventListener('click', () => show(0)));
  document.querySelectorAll('#steps li').forEach(li => li.addEventListener('click', () => {
    const n = Number(li.dataset.step);
    if (n <= state.maxStep && n !== state.step && (n < state.step || validate(state.step))) show(n);
  }));

  /* ------------------------------------------------------- 1. pour qui */

  function renderRelations() {
    const box = $('rel-chips');
    box.textContent = '';
    Object.entries(Story.RELATIONS).forEach(([k, r]) => {
      const b = el('button', 'chip', r.chip);
      b.type = 'button';
      b.dataset.rel = k;
      b.setAttribute('aria-pressed', String(state.a.rel === k));
      b.addEventListener('click', () => chooseRelation(k));
      box.append(b);
    });
  }
  function autoName() {
    const R = Story.RELATIONS[state.a.rel];
    if (!R || !R.call) return '';
    return Array.isArray(R.call) ? (state.a.g === 'm' ? R.call[0] : state.a.g === 'f' ? R.call[1] : '') : R.call;
  }
  function chooseRelation(k) {
    const before = autoName();
    state.a.rel = k;
    const R = Story.RELATIONS[k];
    if (R.g) state.a.g = R.g;
    const name = $('to');
    if (!name.value.trim() || name.value === before) { name.value = autoName(); state.a.to = name.value; }
    syncStep1();
    onChange();
  }
  function syncStep1() {
    const R = Story.RELATIONS[state.a.rel];
    document.querySelectorAll('#rel-chips .chip').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.rel === state.a.rel)));
    $('g-field').hidden = !!(R && R.g);
    const familyName = R && /^(parent|elder)$/.test(R.group);
    $('to-label').textContent = familyName ? 'Comment l’appelez-vous ?' : 'Son prénom';
    $('to').placeholder = familyName ? (autoName() || 'Mamie') : 'Awa';
    $('years-field').hidden = !R || !/^(friend|best|love|work|other)$/.test(R.group);
    document.querySelectorAll('input[name="g"]').forEach(i => { i.checked = i.value === state.a.g; });
    document.querySelectorAll('input[name="fg"]').forEach(i => { i.checked = i.value === state.a.fg; });
  }

  /* ------------------------------------------------------ 2. l'histoire */

  function renderQualities() {
    const box = $('q-chips');
    box.textContent = '';
    const f = gender() !== 'm';
    Object.entries(Story.QUALITIES).forEach(([k, q]) => {
      const b = el('button', 'chip', f ? q[1] : q[0]);
      b.type = 'button';
      b.dataset.q = k;
      b.setAttribute('aria-pressed', String(state.a.qualities.includes(k)));
      b.addEventListener('click', () => {
        const list = state.a.qualities;
        const i = list.indexOf(k);
        if (i > -1) list.splice(i, 1);
        else if (list.length >= 3) return toast('Trois mots maximum : retirez-en un pour en choisir un autre.');
        else list.push(k);
        b.setAttribute('aria-pressed', String(list.includes(k)));
        $('q-count').textContent = list.length + ' / 3';
        onChange();
      });
      box.append(b);
    });
    $('q-count').textContent = state.a.qualities.length + ' / 3';
  }
  function enterStory() {
    $('memory').placeholder = MEMORY_PH[group()] || MEMORY_PH.other;
    renderQualities();
    updateDepth();
  }
  function updateDepth() {
    const d = Story.depth(state.a);
    $('depth-fill').style.width = Math.round(Math.min(1, d.score / d.max) * 100) + '%';
    $('depth-level').textContent = d.level;
    const pron = gender() === 'm' ? 'lui' : 'elle';
    const tips = {
      memory: 'Commencez par un souvenir précis : c’est le cœur de la carte.',
      joke: 'Ajoutez un détail rien qu’à vous : un surnom, une blague, une chanson…',
      admire: `Dites ce que vous admirez chez ${pron}.`,
      thanks: 'Un merci concret touche toujours plus qu’un compliment.',
      wish: 'Un vœu personnel pour cette nouvelle année ?',
      qualities: `Choisissez trois mots qui ${pron === 'lui' ? 'lui' : 'lui'} ressemblent.`,
      secret: 'Une surprise finale ? C’est la touche inoubliable.'
    };
    $('depth-tip').textContent = d.next ? tips[d.next] : 'Votre lettre a tout pour émouvoir.';
    $('depth').dataset.level = String(Math.min(4, Math.floor(d.score / 2)));
  }

  /* --------------------------------------------------------- 3. le récit */

  function renderStyles() {
    const box = $('styles');
    box.textContent = '';
    Object.entries(Story.STYLES).forEach(([k, s]) => {
      const b = el('button', 'style-card');
      b.type = 'button';
      b.dataset.style = k;
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(state.style === k));
      const sw = el('span', 'sw sw-' + k);
      sw.append(el('i'));
      const body = el('span', 'st-body');
      body.append(el('span', 'st-mood', s.mood), el('span', 'st-name', s.name), el('span', 'st-desc', s.desc));
      const ex = Story.excerpt(answers(), k, 180);
      if (ex) body.append(el('span', 'st-ex', '« ' + ex + ' »'));
      b.append(sw, body);
      b.addEventListener('click', () => {
        state.style = k;
        box.querySelectorAll('.style-card').forEach(c => c.setAttribute('aria-checked', String(c.dataset.style === k)));
        onChange(true);
      });
      box.append(b);
    });
    document.querySelectorAll('input[name="music"]').forEach(i => { i.checked = i.value === state.music; });
    renderPhotos();
  }

  function renderPhotos() {
    const box = $('photos');
    box.textContent = '';
    state.photos.forEach((p, i) => {
      const row = el('div', 'photo-row');
      const img = el('img');
      img.src = p.src;
      img.alt = '';
      const cap = el('input');
      cap.maxLength = 60;
      cap.placeholder = i === 0 ? 'Légende (ex. : Grand-Bassam, 2019)' : 'Légende facultative';
      cap.value = p.cap;
      cap.setAttribute('aria-label', 'Légende de la photo ' + (i + 1));
      cap.addEventListener('input', () => { p.cap = cap.value; schedulePreview(); });
      const del = el('button', 'icon', '✕');
      del.type = 'button';
      del.setAttribute('aria-label', 'Retirer la photo ' + (i + 1));
      del.addEventListener('click', () => { state.photos.splice(i, 1); renderPhotos(); onChange(); });
      row.append(img, cap, del);
      box.append(row);
    });
    $('add-photo').hidden = state.photos.length >= 3;
  }

  async function compress(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
      let max = 1080, q = 0.82, out = '';
      for (let k = 0; k < 9; k++) {
        const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.naturalWidth * s));
        c.height = Math.max(1, Math.round(img.naturalHeight * s));
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        out = c.toDataURL('image/jpeg', q);
        if (out.length <= 230000) return out;
        if (q > 0.56) q -= 0.08; else max = Math.round(max * 0.82);
      }
      return null;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  $('photo-input').addEventListener('change', async e => {
    const files = [...(e.target.files || [])].slice(0, 3 - state.photos.length);
    e.target.value = '';
    for (const f of files) {
      if (!/^image\//.test(f.type)) { toast('Ce fichier n’est pas une image.'); continue; }
      try {
        const src = await compress(f);
        if (!src) { toast('Cette photo est trop lourde, essayez-en une autre.'); continue; }
        state.photos.push({ src, cap: '' });
      } catch (err) {
        toast('Impossible de lire cette photo (format non pris en charge).');
      }
    }
    renderPhotos();
    onChange();
  });

  document.querySelectorAll('input[name="music"]').forEach(i => i.addEventListener('change', () => { state.music = i.value; stopTest(); onChange(); }));
  let tester = null, testTimer = null;
  function stopTest() { if (tester) tester.stop(); clearTimeout(testTimer); $('music-test').textContent = '▶ Écouter'; }
  $('music-test').addEventListener('click', () => {
    if (tester && tester.playing) return stopTest();
    if (state.music === 'none') return toast('Choisissez une ambiance pour l’écouter.');
    tester = tester || window.EclatMusic.create();
    if (!tester.start(state.music)) return toast('Le son n’est pas pris en charge par ce navigateur.');
    $('music-test').textContent = 'Ⅱ Arrêter';
    testTimer = setTimeout(stopTest, 9000);
  });

  /* ------------------------------------------------------- 4. relecture */

  const REROLL = new Set(['intro', 'memory', 'joke', 'portrait', 'thanks', 'wish', 'closing']);
  function ensureScenes() {
    const key = genKey();
    if (state.scenes && state.genKey === key) return;
    if (state.scenes && state.scenes.some(s => s.edited)) {
      const ok = confirm('Votre histoire ou le récit a changé. Réécrire la lettre ? Vos retouches seront remplacées.');
      if (!ok) { state.genKey = key; return; }
    }
    const gen = Story.build(answers(), state.style, state.variants);
    state.scenes = gen.scenes.map(s => Object.assign({}, s, { edited: false }));
    state.genKey = key;
    if (!state.signEdited) state.sign = Object.assign({}, gen.sign);
  }
  function enterReview() {
    ensureScenes();
    renderScenes();
    $('sign-lead').value = state.sign.lead;
    $('sign-name').value = state.sign.name;
  }
  function autosize(t) { t.style.height = 'auto'; t.style.height = t.scrollHeight + 2 + 'px'; }
  function renderScenes() {
    const ol = $('scenes');
    ol.textContent = '';
    state.scenes.forEach((s, i) => {
      const li = el('li', 'scene-item t-' + s.t);
      const head = el('div', 'scene-head');
      const label = Story.LABELS[s.t] || s.t;
      head.append(el('span', 'scene-label', label));
      if (s.title && s.t !== 'photo') head.append(el('span', 'scene-title', s.title));
      if (REROLL.has(s.t)) {
        const b = el('button', 'reroll', '↻');
        b.type = 'button';
        b.title = 'Autre formulation';
        b.setAttribute('aria-label', 'Autre formulation pour « ' + label + ' »');
        b.addEventListener('click', () => reroll(i));
        head.append(b);
      }
      li.append(head);
      if (s.p >= 0 && state.photos[s.p]) {
        const im = el('img', 'scene-thumb');
        im.src = state.photos[s.p].src;
        im.alt = '';
        li.append(im);
      }
      if (s.t === 'photo') {
        const cap = el('input');
        cap.placeholder = 'Légende de la photo';
        cap.maxLength = 60;
        cap.value = state.photos[s.p] ? state.photos[s.p].cap : '';
        cap.addEventListener('input', () => { if (state.photos[s.p]) state.photos[s.p].cap = cap.value; schedulePreview(); });
        li.append(cap);
      } else {
        const ta = el('textarea');
        ta.value = s.x;
        ta.rows = 3;
        ta.maxLength = 1500;
        if (s.t === 'reveal') ta.placeholder = 'Une phrase sous « Joyeux anniversaire » (facultatif)';
        ta.setAttribute('aria-label', label);
        ta.addEventListener('input', () => { s.x = ta.value; s.edited = true; autosize(ta); schedulePreview(); });
        li.append(ta);
        requestAnimationFrame(() => autosize(ta));
      }
      ol.append(li);
    });
  }
  function reroll(i) {
    const s = state.scenes[i];
    if (s.edited && !confirm('Remplacer votre version de ce passage ?')) return;
    const nth = state.scenes.slice(0, i).filter(x => x.t === s.t).length;
    state.variants[s.t] = (state.variants[s.t] || 0) + 1;
    const fresh = Story.build(answers(), state.style, state.variants).scenes.filter(x => x.t === s.t)[nth];
    if (!fresh || fresh.x === s.x) { toast('Pas d’autre formulation pour ce passage : vous pouvez le réécrire librement.'); return; }
    s.x = fresh.x;
    s.title = fresh.title;
    s.edited = false;
    renderScenes();
    schedulePreview();
  }
  ['sign-lead', 'sign-name'].forEach(id => $(id).addEventListener('input', () => {
    state.sign = { lead: $('sign-lead').value, name: $('sign-name').value };
    state.signEdited = true;
    schedulePreview();
  }));

  /* ------------------------------------------------------- validation */

  function fail(step, msg, focus) {
    $('err-' + step).textContent = msg;
    if (focus) $(focus).focus();
    return false;
  }
  function validate(step) {
    if (step === 1) {
      $('err-1').textContent = '';
      if (!state.a.rel) return fail(1, 'Choisissez qui est cette personne pour vous.');
      if (!gender()) return fail(1, 'Indiquez « il » ou « elle » pour accorder les mots justes.');
      if (!state.a.to.trim()) return fail(1, 'Indiquez son prénom (ou comment vous l’appelez).', 'to');
      if (!state.a.from.trim()) return fail(1, 'Indiquez votre prénom : il signera la lettre.', 'from');
    }
    if (step === 2) {
      $('err-2').textContent = '';
      if (!['memory', 'admire', 'thanks'].some(k => state.a[k].trim().length > 2)) {
        return fail(2, 'Racontez au moins un souvenir, une admiration ou un merci : c’est ce qui rend la carte unique.', 'memory');
      }
    }
    if (step === 4) {
      $('err-4').textContent = '';
      if (!state.scenes || !state.scenes.some(s => s.x.trim())) return fail(4, 'La lettre est vide.');
    }
    return true;
  }
  $('step-1').addEventListener('submit', e => { e.preventDefault(); if (validate(1)) show(2); });
  $('step-2').addEventListener('submit', e => { e.preventDefault(); if (validate(2)) show(3); });
  $('to-review').addEventListener('click', () => { stopTest(); show(4); });

  /* ------------------------------------------------------ liaisons champs */

  function onChange(reset) {
    if (state.step === 2) updateDepth();
    saveDraft();
    if (reset) sendPreview(true); else schedulePreview();
  }
  document.querySelectorAll('[data-a]').forEach(input => {
    const key = input.dataset.a;
    const ev = input.type === 'radio' ? 'change' : 'input';
    input.addEventListener(ev, () => {
      if (input.type === 'radio' && !input.checked) return;
      state.a[key] = input.value;
      if (key === 'g') {
        const name = $('to');
        const R = Story.RELATIONS[state.a.rel];
        if (R && Array.isArray(R.call) && (!name.value.trim() || R.call.includes(name.value))) { name.value = autoName(); state.a.to = name.value; }
      }
      document.querySelectorAll('[data-bind="to"]').forEach(n => { n.textContent = state.a.to.trim() || 'cette personne'; });
      onChange();
    });
  });

  const saveDraft = debounce(() => {
    if (state.demo) return;
    ls.set(DRAFT, { a: state.a, style: state.style, music: state.music, step: Math.min(state.step || 1, 4), at: Date.now() });
  }, 400);

  function fillForm() {
    document.querySelectorAll('[data-a]').forEach(input => {
      const v = state.a[input.dataset.a];
      if (input.type === 'radio') input.checked = input.value === v;
      else input.value = v == null ? '' : v;
    });
    syncStep1();
  }

  /* --------------------------------------------------------- 5. envoi */

  function b64url(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  async function localLink(card) {
    const light = Object.assign({}, card, { photos: [], scenes: card.scenes.filter(s => s.t !== 'photo').map(s => Object.assign({}, s, { p: -1 })), created: Date.now() });
    const bytes = new TextEncoder().encode(JSON.stringify(light));
    if ('CompressionStream' in window) {
      const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
      return location.origin + '/c/local#d=' + b64url(new Uint8Array(await new Response(stream).arrayBuffer()));
    }
    return location.origin + '/c/local#j=' + b64url(bytes);
  }

  function describe(card) {
    const from = card.from || 'Quelqu’un';
    const pret = card.g === 'm' ? 'prêt' : 'prête';
    return {
      title: `${card.to}, une enveloppe t’attend 💌`,
      desc: {
        lettre: `${from} t’a écrit une lettre. Ouvre-la quand tu auras un moment rien qu’à toi.`,
        souvenirs: `${from} a rassemblé quelques souvenirs pour toi. Ouvre l’enveloppe quand tu seras ${pret}.`,
        secret: `${from} te confie un secret. Ne l’ouvre pas devant tout le monde…`,
        toast: `${from} a préparé un petit discours rien que pour toi. Ouvre vite !`
      }[card.style]
    };
  }

  $('seal').addEventListener('click', async () => {
    if (!validate(4)) return;
    const btn = $('seal');
    const card = cardData(false);
    if (!card.sign.name) card.sign.name = card.from;
    btn.disabled = true;
    btn.textContent = 'Scellement…';
    let url = '', fallback = false;
    try {
      const r = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card, images: state.photos.map(p => p.src) })
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.url) url = j.url;
      else if (r.status === 429) throw new Error('Beaucoup de cartes ont été créées depuis cette connexion. Réessayez dans une heure.');
      else if (r.status === 400 || r.status === 413) throw new Error('Cette carte n’a pas pu être enregistrée (' + (j.error || 'données invalides') + '). Essayez avec moins de photos ou un texte plus court.');
      else fallback = true;
    } catch (err) {
      if (!(err instanceof TypeError)) {
        btn.disabled = false;
        btn.textContent = 'Sceller l’enveloppe';
        $('err-4').textContent = err.message;
        return;
      }
      fallback = true;
    }
    if (fallback) url = await localLink(card);
    btn.disabled = false;
    btn.textContent = 'Sceller l’enveloppe';
    state.result = { url, card, fallback };
    if (!fallback) {
      const sent = ls.get(SENT, []);
      sent.unshift({ url, to: card.to, style: card.style, at: Date.now() });
      ls.set(SENT, sent.slice(0, 12));
    }
    ls.del(DRAFT);
    post({ type: 'eclat:pause' });
    renderShare();
    show(5);
  });

  function waHref(text) { return 'https://wa.me/?text=' + encodeURIComponent(text); }
  function renderShare() {
    const { url, card, fallback } = state.result;
    const short = url.replace(/^https?:\/\//, '');
    const link = $('short-url');
    link.href = url;
    link.textContent = fallback ? short.slice(0, 48) + '…' : short;
    $('open-card').href = url;
    $('fallback-note').hidden = !fallback;
    const msg = `${card.to}, j’ai glissé quelque chose pour toi dans cette enveloppe. Ouvre-la quand tu auras un moment rien qu’à toi 💌\n\n${url}`;
    $('share-msg').value = msg;
    $('wa').href = waHref(msg);
    const d = describe(card);
    $('wa-img').src = '/assets/og/envelope-' + card.style + '.jpg';
    $('wa-title').textContent = d.title;
    $('wa-desc').textContent = d.desc;
    $('wa-host').textContent = location.host;
    $('wa-text').textContent = msg;
    $('qr').textContent = '';
    document.querySelector('details.qr').open = false;
  }
  $('share-msg').addEventListener('input', () => {
    const v = $('share-msg').value;
    $('wa').href = waHref(v);
    $('wa-text').textContent = v;
  });
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); toast('Lien copié !'); }
    catch (e) { window.prompt('Copiez ce lien :', text); }
  }
  $('copy').addEventListener('click', () => copy(state.result.url));
  $('native-share').addEventListener('click', async () => {
    const { url, card } = state.result;
    if (navigator.share) {
      try { await navigator.share({ title: describe(card).title, text: `${card.to}, une enveloppe t’attend 💌`, url }); } catch (e) { /* partage annulé */ }
    } else copy(url);
  });
  document.querySelector('details.qr').addEventListener('toggle', e => {
    if (!e.target.open || $('qr').childElementCount) return;
    const draw = () => {
      try {
        const qr = window.qrcode(0, 'M');
        qr.addData(state.result.url);
        qr.make();
        $('qr').innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
      } catch (err) { $('qr').textContent = 'Ce lien est trop long pour un QR code.'; }
    };
    if (window.qrcode) return draw();
    const s = el('script');
    s.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js';
    s.onload = draw;
    s.onerror = () => { $('qr').textContent = 'QR code indisponible hors connexion.'; };
    document.head.append(s);
  });
  $('new-card').addEventListener('click', () => {
    resetAll();
    show(1);
  });

  function resetAll() {
    state.a = blank();
    state.style = 'lettre';
    state.music = 'boite';
    state.photos = [];
    state.variants = {};
    state.scenes = null;
    state.genKey = '';
    state.sign = null;
    state.signEdited = false;
    state.maxStep = 1;
    fillForm();
    renderRecent();
    sendPreview(true);
  }

  /* ------------------------------------------------------------- accueil */

  function renderRecent() {
    const sent = ls.get(SENT, []);
    $('recent').hidden = !sent.length;
    const ul = $('recent-list');
    ul.textContent = '';
    sent.forEach(s => {
      const li = el('li');
      const a = el('a', '', 'Pour ' + s.to);
      a.href = s.url;
      a.target = '_blank';
      a.rel = 'noopener';
      const meta = el('span', 'meta', (Story.STYLES[s.style] || {}).name + ' · ' + new Date(s.at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }));
      const b = el('button', 'btn small', 'Copier le lien');
      b.type = 'button';
      b.addEventListener('click', () => copy(s.url));
      li.append(a, meta, b);
      ul.append(li);
    });
  }

  function renderResume() {
    const d = ls.get(DRAFT, null);
    const box = $('resume');
    if (!d || !d.a || !d.a.to) { box.hidden = true; $('start').textContent = 'Commencer ma lettre'; return; }
    box.hidden = false;
    box.textContent = '';
    box.append(document.createTextNode('Une lettre pour ' + d.a.to + ' est en cours. '));
    const reset = el('button', 'link', 'Recommencer à zéro');
    reset.type = 'button';
    reset.addEventListener('click', () => { ls.del(DRAFT); resetAll(); renderResume(); });
    box.append(reset);
    $('start').textContent = 'Reprendre ma lettre';
  }

  $('start').addEventListener('click', () => {
    const d = ls.get(DRAFT, null);
    if (d && d.a) {
      state.a = Object.assign(blank(), d.a);
      state.style = Story.STYLES[d.style] ? d.style : 'lettre';
      state.music = ['boite', 'piano', 'none'].includes(d.music) ? d.music : 'boite';
      fillForm();
      show(Math.min(Math.max(1, d.step || 1), 3));
    } else show(1);
  });
  $('demo').addEventListener('click', () => {
    state.demo = true;
    openPreview();
  });

  /* ----------------------------------------------------------- démarrage */

  renderRelations();
  fillForm();
  renderRecent();
  renderResume();
  history.replaceState({ step: 0 }, '', location.pathname);
})();
