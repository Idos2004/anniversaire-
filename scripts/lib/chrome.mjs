// Pilote Chrome/Edge en mode headless via le protocole DevTools (WebSocket natif de Node ≥ 22).
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'
].filter(Boolean);

export async function launch() {
  const exe = CANDIDATES.find(p => existsSync(p));
  if (!exe) throw new Error('Chrome introuvable (définissez CHROME_PATH)');
  const port = 9300 + Math.floor(Math.random() * 600);
  const dir = mkdtempSync(path.join(tmpdir(), 'eclat-chrome-'));
  const proc = spawn(exe, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, '--no-first-run',
    '--no-default-browser-check', '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });
  let target;
  for (let i = 0; i < 80 && !target; i++) {
    await new Promise(r => setTimeout(r, 150));
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page'); } catch { /* pas prêt */ }
  }
  if (!target) { proc.kill(); throw new Error('Chrome ne répond pas'); }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let seq = 0;
  const pending = new Map(), listeners = new Map();
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); }
    else if (m.method && listeners.has(m.method)) listeners.get(m.method).forEach(f => f(m.params));
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
  const once = method => new Promise(res => { const arr = listeners.get(method) || []; const f = p => { arr.splice(arr.indexOf(f), 1); res(p); }; arr.push(f); listeners.set(method, arr); });
  const on = (method, f) => { const arr = listeners.get(method) || []; arr.push(f); listeners.set(method, arr); };
  await send('Page.enable'); await send('Runtime.enable');
  return {
    send, once, on,
    async viewport(width, height, scale = 1, mobile = false) { await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile }); },
    async goto(url) { const l = once('Page.loadEventFired'); await send('Page.navigate', { url }); await l; },
    async eval(expr) { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; },
    async shot(format = 'png', quality) { const r = await send('Page.captureScreenshot', { format, quality, captureBeyondViewport: false }); return Buffer.from(r.data, 'base64'); },
    async close() { try { ws.close(); } catch {} proc.kill(); await new Promise(r => setTimeout(r, 300)); try { rmSync(dir, { recursive: true, force: true }); } catch {} }
  };
}
