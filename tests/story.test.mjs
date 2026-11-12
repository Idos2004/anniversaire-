import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ctx = {};
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL('../public/assets/js/story.js', import.meta.url), 'utf8'), ctx);
const S = ctx.EclatStory;

const FULL = {
  to: 'awa', from: 'Koffi', age: 30, years: 12,
  memory: 'cette nuit à Grand-Bassam où on a attendu le lever du soleil',
  admire: 'ta façon de rester douce avec tout le monde',
  qualities: ['solaire', 'loyal', 'courageux'],
  thanks: 'toutes ces fois où tu as décroché à 2 h du matin',
  joke: 'le gâteau au sel de 2016',
  wish: 'décrocher ce poste à Dakar',
  secret: 'Regarde ta boîte aux lettres samedi.',
  photos: [{ cap: 'Bassam' }, { cap: '' }]
};
const MIN = { to: 'Léa', from: 'Sam', thanks: 'ta patience' };

const BAD = [/undefined/, /null/, /\$\{/, /\{\w/, / {2}/, /\bà le (jour|soir|moment|temps)\b/i, /\bà les\b/i, /\bde le (jour|soir|moment)\b/i, /\bque tu tu\b/, / [.,]/, /\.\./, /\bpour pour\b/, /\bde de\b/];

function check(scenes, label) {
  assert.ok(scenes.length >= 2, label + ' : trop peu de scènes');
  for (const s of scenes) {
    const all = (s.title || '') + ' ' + (s.x || '');
    for (const re of BAD) assert.ok(!re.test(all), `${label} [${s.t}] motif interdit ${re} → ${all}`);
    if (s.x) assert.match(s.x.trim()[0], /[A-ZÀ-ÖØ-Þ«*0-9]/, `${label} [${s.t}] doit commencer par une majuscule : ${s.x}`);
  }
  assert.equal(scenes.filter(s => s.t === 'reveal').length, 1, label + ' : une seule révélation');
  assert.equal(scenes[scenes.length - 1].t, 'closing', label + ' : se termine par le mot de la fin');
}

test('chaque style × relation × genre produit un texte propre', () => {
  for (const style of Object.keys(S.STYLES)) {
    for (const rel of Object.keys(S.RELATIONS)) {
      for (const g of ['f', 'm']) {
        for (const fg of ['f', 'm', '']) {
          for (const [name, base] of [['complet', FULL], ['minimal', MIN]]) {
            const r = S.build({ ...base, rel, g, fg }, style);
            check(r.scenes, `${style}/${rel}/${g}/${fg}/${name}`);
            assert.ok(r.sign.name, 'signature présente');
          }
        }
      }
    }
  }
});

test('aucune scène vide quand les réponses manquent (pas de remplissage générique)', () => {
  const r = S.build({ ...MIN, rel: 'ami', g: 'f' }, 'lettre');
  const types = [...r.scenes].map(s => s.t);
  assert.deepEqual(JSON.parse(JSON.stringify(types)), ['intro', 'thanks', 'reveal', 'closing']);
});

test('les photos sont toutes placées une seule fois', () => {
  for (const style of Object.keys(S.STYLES)) {
    const r = S.build({ ...FULL, rel: 'meilleur', g: 'f' }, style);
    const used = r.scenes.filter(s => s.p >= 0).map(s => s.p).sort();
    assert.deepEqual(JSON.parse(JSON.stringify(used)), [0, 1], style);
  }
});

test('accords en genre', () => {
  const f = S.build({ ...FULL, rel: 'meilleur', g: 'f', fg: 'm' }, 'lettre').scenes.map(s => s.x).join(' ');
  const m = S.build({ ...FULL, rel: 'meilleur', g: 'm', fg: 'm' }, 'lettre').scenes.map(s => s.x).join(' ');
  assert.match(f, /solaire, loyale et courageuse/);
  assert.match(m, /solaire, loyal et courageux/);
  const sec = S.build({ ...FULL, rel: 'ami', g: 'f' }, 'secret').scenes.map(s => s.x).join(' ');
  assert.match(sec, /remerciée pour toutes ces fois/);
  assert.equal(S.build({ ...FULL, rel: 'soeur', fg: 'f' }, 'lettre').sign.lead, 'Ta sœur,');
  assert.equal(S.build({ ...FULL, rel: 'mere', fg: 'm' }, 'lettre').sign.lead, 'Ton fils qui t’aime,');
});

test('normalisation des réponses libres', () => {
  const N = S._norm;
  assert.deepEqual({ ...N.normMemory('Je repense souvent au jour où on a ri') }, { mode: 'np', text: 'le jour où on a ri' });
  assert.equal(N.normMemory('On était à Lomé, il pleuvait.').mode, 's');
  assert.equal(N.a('le jour où'), 'au jour où');
  assert.equal(N.de('les vacances'), 'des vacances');
  assert.equal(N.de('un soir'), 'd’un soir');
  assert.equal(N.normThanks('Merci de m\'avoir appris à nager.'), 'de m’avoir appris à nager');
  assert.equal(N.normThanks('ta patience'), 'pour ta patience');
  assert.equal(N.normThanks('avoir cru en moi'), 'd’avoir cru en moi');
  assert.equal(N.normWish('Je te souhaite de réussir'), 'de réussir');
  assert.equal(N.normWish('réussir ton master'), 'de réussir ton master');
  assert.equal(N.normWish('beaucoup de bonheur'), 'beaucoup de bonheur');
  assert.equal(N.normWish('que tous tes rêves se réalisent !'), 'que tous tes rêves se réalisent');
  assert.equal(N.normWish('plaisir et santé'), 'plaisir et santé');
  assert.equal(N.normAdmire('Tu ne lâches jamais rien'), 'que tu ne lâches jamais rien');
  assert.equal(N.normAdmire('Ce que j\'admire le plus chez toi, c\'est ta force'), 'ta force');
});

test('espaces insécables avant la ponctuation haute', () => {
  const r = S.build({ ...FULL, rel: 'ami', g: 'f' }, 'toast');
  const intro = r.scenes[0].x;
  assert.ok(intro.includes(' :'), intro);
});

test('profondeur et extrait', () => {
  assert.equal(S.depth({}).level, 'Esquisse');
  assert.equal(S.depth(FULL).level, 'Inoubliable');
  const ex = S.excerpt({ ...FULL, rel: 'ami', g: 'f' }, 'lettre', 120);
  assert.ok(ex.length <= 121 && ex.endsWith('…'));
});
