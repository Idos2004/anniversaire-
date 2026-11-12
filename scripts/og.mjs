// Génère les images d'aperçu WhatsApp/Open Graph (1200×630 JPEG) et l'icône Apple (180×180).
// Usage : npm run og   (nécessite Chrome ou Edge installé)
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launch } from './lib/chrome.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'assets', 'og');
const template = pathToFileURL(path.join(ROOT, 'scripts', 'og', 'envelope.html')).href;

const chrome = await launch();
try {
  await chrome.viewport(1200, 630, 1);
  for (const style of ['lettre', 'souvenirs', 'secret', 'toast']) {
    await chrome.goto(`${template}?style=${style}`);
    await chrome.eval('document.fonts.ready.then(() => new Promise(r => setTimeout(r, 300)))');
    const jpg = await chrome.shot('jpeg', 86);
    await writeFile(path.join(OUT, `envelope-${style}.jpg`), jpg);
    console.log(`envelope-${style}.jpg  ${(jpg.length / 1024).toFixed(0)} Ko`);
  }
  const icon = pathToFileURL(path.join(ROOT, 'public', 'assets', 'img', 'icon.svg')).href;
  await chrome.viewport(180, 180, 1);
  await chrome.goto(`data:text/html,<style>html,body{margin:0;background:%23f5efe6}</style><img src="${icon}" width="180" height="180">`);
  await chrome.eval('new Promise(r => setTimeout(r, 200))');
  await writeFile(path.join(ROOT, 'public', 'assets', 'img', 'icon-180.png'), await chrome.shot('png'));
  console.log('icon-180.png');
} finally {
  await chrome.close();
}
