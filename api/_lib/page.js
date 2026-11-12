// Rend la page d'une carte avec des métadonnées Open Graph lisibles par WhatsApp.
export const ASSET_VERSION = '3';

const FONTS = {
  lettre: 'family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Caveat:wght@500;700',
  souvenirs: 'family=Lora:ital,wght@0,400;0,500;1,400&family=Caveat:wght@500;700&family=Courier+Prime',
  secret: 'family=Fraunces:opsz,wght@9..144,400;9..144,600&family=DM+Sans:wght@400;500&family=Caveat:wght@500;700',
  toast: 'family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&family=Caveat:wght@500;700'
};
const THEME = { lettre: '#efe6d8', souvenirs: '#e8dcc8', secret: '#0e1322', toast: '#fbe3cf' };

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
// JSON sûr à l'intérieur d'une balise <script>.
const safeJson = v => JSON.stringify(v).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

export function describe(card) {
  if (!card) {
    return {
      title: 'Une enveloppe t’attend 💌',
      desc: 'Quelqu’un a pris le temps de t’écrire. Ouvre-la quand tu auras un moment rien qu’à toi.'
    };
  }
  const from = card.from || 'Quelqu’un';
  const pret = card.g === 'm' ? 'prêt' : card.g === 'f' ? 'prête' : 'prêt·e';
  const desc = {
    lettre: `${from} t’a écrit une lettre. Ouvre-la quand tu auras un moment rien qu’à toi.`,
    souvenirs: `${from} a rassemblé quelques souvenirs pour toi. Ouvre l’enveloppe quand tu seras ${pret}.`,
    secret: `${from} te confie un secret. Ne l’ouvre pas devant tout le monde…`,
    toast: `${from} a préparé un petit discours rien que pour toi. Ouvre vite !`
  }[card.style];
  return { title: `${card.to}, une enveloppe t’attend 💌`, desc };
}

export function renderCardPage({ card, id, origin }) {
  const style = card ? card.style : 'lettre';
  const { title, desc } = describe(card);
  const url = card ? `${origin}/c/${id}` : `${origin}/`;
  const image = `${origin}/assets/og/envelope-${style}.jpg`;
  const secure = image.startsWith('https://') ? `\n<meta property="og:image:secure_url" content="${esc(image)}">` : '';
  const data = card ? { ...card, id } : null;
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Éclat">
<meta property="og:locale" content="fr_FR">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(image)}">${secure}
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Une enveloppe scellée à la cire, prête à être ouverte">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(image)}">
<meta name="robots" content="noindex, nofollow">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="${THEME[style]}">
${card ? `<link rel="canonical" href="${esc(url)}">\n` : ''}<link rel="icon" href="/assets/img/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/img/icon-180.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${FONTS[style]}&amp;display=swap" data-fonts="${style}">
<link rel="stylesheet" href="/assets/css/card.css?v=${ASSET_VERSION}">
</head>
<body data-style="${style}">
<div id="app" class="app"></div>
<noscript><p style="padding:24px;font:18px/1.5 Georgia,serif">Cette carte a besoin de JavaScript pour s’ouvrir.</p></noscript>
<script id="card-data" type="application/json">${safeJson(data)}</script>
<script src="/assets/js/music.js?v=${ASSET_VERSION}" defer></script>
<script src="/assets/js/card.js?v=${ASSET_VERSION}" defer></script>
</body>
</html>`;
}
