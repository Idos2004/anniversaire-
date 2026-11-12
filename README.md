# Éclat — cartes d’anniversaire qui racontent une histoire

Studio guidé → récit personnalisé (4 styles narratifs) → enveloppe animée → lien court `/c/abc1234` avec aperçu WhatsApp.

## Structure
- `public/` : site statique (studio `index.html`, aperçu `apercu.html`, visionneuse `assets/js/card.js`, moteur narratif `assets/js/story.js`).
- `api/` : fonctions Vercel — `cards.js` (création), `card.js` (page `/c/:id` avec Open Graph), `photo.js` (photos).
- Stockage : Upstash Redis via son API REST (offre gratuite), aucune dépendance npm.

## Développement
```bash
npm run dev     # http://localhost:3000 — cartes stockées dans .data/
npm test        # moteur narratif + API + Open Graph
npm run og      # régénère les images d’aperçu (Chrome ou Edge requis)
```

## Déploiement Vercel (gratuit)
1. Importer le dépôt dans Vercel (preset « Other », aucune commande de build).
2. Storage → Marketplace → **Upstash for Redis** → offre *Free* → connecter au projet
   (ajoute `KV_REST_API_URL` et `KV_REST_API_TOKEN`, ou `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`).
3. Redéployer. Tester l’aperçu sur le **domaine de production** (`https://<projet>.vercel.app/c/…`) :
   les URL de prévisualisation Vercel sont protégées par authentification et ne sont pas lisibles par WhatsApp.

Sans stockage configuré, l’application reste utilisable : le lien généré contient la carte (sans photos).
Variable facultative : `PUBLIC_BASE_URL` pour forcer le domaine utilisé dans les liens et les aperçus.
