// Stockage clé-valeur : Upstash Redis (API REST, offre gratuite) en production,
// fichier JSON local en développement. Aucune dépendance npm.
import { promises as fs } from 'node:fs';
import path from 'node:path';

// Variables injectées par l’intégration Upstash, avec ou sans préfixe personnalisé
// (KV_REST_API_URL, STORAGE_KV_REST_API_URL, UPSTASH_REDIS_REST_URL…).
function findRest(env) {
  for (const [suffix, tokenSuffix] of [['KV_REST_API_URL', 'KV_REST_API_TOKEN'], ['REDIS_REST_URL', 'REDIS_REST_TOKEN']]) {
    for (const key of Object.keys(env).sort((a, b) => a.length - b.length)) {
      if (!key.endsWith(suffix) || !env[key]) continue;
      const token = env[key.slice(0, -suffix.length) + tokenSuffix];
      if (token) return { url: env[key], token };
    }
  }
  return { url: '', token: '' };
}
const REST = findRest(process.env);
const REST_URL = REST.url.replace(/\/+$/, '');
const REST_TOKEN = REST.token;

export const storeMode = REST_URL && REST_TOKEN ? 'redis' : process.env.VERCEL ? 'none' : 'file';

export class StoreUnavailable extends Error {}

async function redisPipeline(commands) {
  const res = await fetch(`${REST_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands)
  });
  if (!res.ok) throw new Error(`redis_http_${res.status}`);
  const out = await res.json();
  return out.map(r => {
    if (r && r.error) throw new Error(r.error);
    return r ? r.result : null;
  });
}

/* ---------- fichier local (développement uniquement) ---------- */
const DATA_DIR = process.env.ECLAT_DATA_DIR || path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');
let mem = null;
let writing = Promise.resolve();

async function load() {
  if (mem) return mem;
  try { mem = JSON.parse(await fs.readFile(DATA_FILE, 'utf8')); } catch { mem = {}; }
  return mem;
}
function persist() {
  writing = writing.then(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(mem));
  });
  return writing;
}
async function filePipeline(commands) {
  const db = await load();
  const now = Date.now();
  const alive = k => db[k] && (!db[k].exp || db[k].exp > now);
  let dirty = false;
  const out = commands.map(([cmd, key, ...args]) => {
    switch (String(cmd).toUpperCase()) {
      case 'GET': return alive(key) ? db[key].v : null;
      case 'SET': {
        const nx = args.some(a => String(a).toUpperCase() === 'NX');
        if (nx && alive(key)) return null;
        db[key] = { v: String(args[0]) };
        dirty = true;
        return 'OK';
      }
      case 'INCR': {
        const n = (alive(key) ? parseInt(db[key].v, 10) || 0 : 0) + 1;
        db[key] = { v: String(n), exp: alive(key) ? db[key].exp : 0 };
        dirty = true;
        return n;
      }
      case 'EXPIRE':
        if (!alive(key)) return 0;
        db[key].exp = now + Number(args[0]) * 1000;
        dirty = true;
        return 1;
      default: throw new Error('unsupported_' + cmd);
    }
  });
  if (dirty) await persist();
  return out;
}

export async function pipeline(commands) {
  if (storeMode === 'redis') return redisPipeline(commands);
  if (storeMode === 'file') return filePipeline(commands);
  throw new StoreUnavailable('storage_unconfigured');
}

export async function get(key) {
  const [v] = await pipeline([['GET', key]]);
  return v;
}
