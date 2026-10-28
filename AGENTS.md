<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## YOUBA SERVICE — repères pour contribuer

- Une seule boutique par déploiement : ses réglages sont la ligne unique de `settings` (id 1). Le premier compte vient de `ADMIN_USERNAME` / `ADMIN_PASSWORD` (`ensureFirstUser`).
- Données : `src/lib/data/*` (fonctions pures qui prennent `db`). Une journée = une ligne `entries` par produit et par date (recette, dépense) ; `saveDay` fixe les valeurs, donc un renvoi ne crée pas de doublon. Les dépenses sur le bénéfice (`general_expenses`) ne sont liées à aucun produit ; `shopBalance` calcule le capital actuel.
- Vocabulaire de l'interface, à garder identique partout : recette, dépense, bénéfice, dépense sur le bénéfice, investissement de départ, capital actuel.
- Actions serveur : `src/lib/actions/*` — chacune vérifie la session (`requireUser` / `getCurrentUser`) avant d'agir.
- Schéma : `src/lib/db/schema.ts`. Après modification : `npm run db:generate` puis commit du dossier `drizzle/`.
- Pages : `src/app/(app)/*` — le contenu qui lit la session est toujours dans un `<Suspense>` (Cache Components).
- Vérifications : `npm run typecheck && npm run lint && npm test`.
- Hors connexion : la Saisie passe par la file locale (`src/lib/offline/`) puis par l'action `saveDay`. Après toute modification de `public/sw.js`, incrémentez `VERSION`.
