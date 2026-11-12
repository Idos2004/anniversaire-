import { randomInt } from 'node:crypto';

// Alphabet sans caractères ambigus (0/O, 1/l/I) : 55^7 ≈ 1,5 billion d'identifiants.
const ALPHABET = '23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
export const ID_RE = /^[A-Za-z0-9]{6,10}$/;

export function newId(length = 7) {
  let id = '';
  for (let i = 0; i < length; i++) id += ALPHABET[randomInt(ALPHABET.length)];
  return id;
}

export function sendJson(res, status, data, headers = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(data));
}

export async function readJson(req, limit) {
  // Sur Vercel, le corps JSON est déjà analysé ; en local, on lit le flux.
  if (req.body !== undefined && req.body !== null && req.body !== '') {
    if (typeof req.body === 'string') return JSON.parse(req.body);
    if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString('utf8'));
    return req.body;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) { const e = new Error('too_large'); e.status = 413; throw e; }
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || 'null');
}

function first(v) {
  return String(Array.isArray(v) ? v[0] : v || '').split(',')[0].trim();
}

export function originOf(req) {
  const fixed = process.env.PUBLIC_BASE_URL;
  if (fixed) return fixed.replace(/\/+$/, '');
  const host = first(req.headers['x-forwarded-host']) || first(req.headers.host) || 'localhost:3000';
  const safeHost = /^[a-z0-9.-]+(:\d+)?$/i.test(host) ? host : 'localhost';
  let proto = first(req.headers['x-forwarded-proto']);
  if (!proto) proto = /^(localhost|127\.|\[::1\])/.test(safeHost) ? 'http' : 'https';
  return `${proto === 'http' ? 'http' : 'https'}://${safeHost}`;
}

export function clientIp(req) {
  return first(req.headers['x-forwarded-for']) || first(req.headers['x-real-ip']) || req.socket?.remoteAddress || 'unknown';
}

export function queryOf(req) {
  if (req.query && typeof req.query === 'object') return req.query;
  return Object.fromEntries(new URL(req.url || '/', 'http://x').searchParams);
}
