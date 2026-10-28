# YOUBA SERVICE

Petite application web pour suivre **ce qui rentre et ce qui sort** dans la boutique, produit par produit, jour après jour. Une seule boutique, un seul compte : le commerçant ouvre le lien, se connecte, et c'est tout. Pensée pour le téléphone, utilisable sur ordinateur, gratuite à héberger.

## Ce que fait l'application

Quatre onglets, et toujours les mêmes mots :

- **Recette** = l'argent qui rentre ; **Dépense** = l'argent qui sort pour un produit ;
- **Bénéfice** = recettes − dépenses ;
- **Dépense sur le bénéfice** = argent pris sur le bénéfice de toute la boutique (loyer, électricité, maison…) ;
- **Capital actuel** = investissement de départ + bénéfice − dépenses sur le bénéfice.

| Onglet | Ce qu'on y fait |
| --- | --- |
| **Saisie** | On choisit la date (aujourd'hui par défaut), on note pour chaque produit sa **recette** et sa **dépense**, puis **Enregistrer**. Juste en dessous : le **bilan de la journée** (bénéfice par produit et total). Une journée se corrige en la rouvrant. |
| **Bilan** | Le **capital actuel** de toute la boutique, avec le calcul écrit ligne par ligne, le **capital de chaque produit**, et les **dépenses sur le bénéfice** (on en ajoute ou on en supprime ici). |
| **Produits** | On ajoute ses produits avec leur **investissement de départ**. Si on tenait déjà un cahier : le **bénéfice déjà fait** et la date du calcul, l'application continue à partir de là. Dernières journées, arrêt (le produit quitte la saisie mais reste dans le bilan) ou suppression. |
| **Rapports** | Ce qui s'est passé sur une période (ce mois, mois dernier, cette année, tout, ou dates libres), pour toute la boutique ou un seul produit : le calcul, la courbe, le tableau par produit, et le **téléchargement Excel** (.xlsx). |

L'icône ⚙ en haut ouvre les **Réglages** : fond **clair, sombre ou automatique** (aussi avec le bouton lune/soleil), nom de la boutique, monnaie, mot de passe, déconnexion.

En plus :

- **Sans réseau**, la page Saisie s'ouvre quand même (si elle a déjà été ouverte une fois) : les chiffres sont gardés sur le téléphone et partent tout seuls au retour du réseau.
- **Installable** sur l'écran d'accueil du téléphone, comme une application.
- Protection contre les essais de mots de passe (5 échecs → 15 minutes d'attente).

## Pour un autre commerçant

Même modèle, autre nom : déployez une deuxième copie (nouveau site Netlify + nouvelle base Neon), choisissez son identifiant et son mot de passe avec `ADMIN_USERNAME` / `ADMIN_PASSWORD`, puis changez le nom de la boutique dans **Réglages**.

## Technique

- **Next.js 16** (App Router, Server Components, Server Actions, Cache Components) + **TypeScript** + **Tailwind CSS 4**
- **PostgreSQL** via **Drizzle ORM** ; en local, base embarquée **PGlite** (aucune installation)
- Connexion maison : mot de passe haché (scrypt), sessions en base, cookie `httpOnly`
- Sans réseau : service worker (`public/sw.js`) pour ouvrir la page, file d'attente locale (`src/lib/offline/`) pour les journées ; renvoyer une journée la remplace, sans doublon
- Export Excel écrit à la main (`src/lib/xlsx.ts`, petite dépendance `fflate` pour le zip)
- Graphique en SVG fait main, couleurs lisibles en clair comme en sombre
- Tests : **Vitest** (dont une vraie base Postgres en mémoire)

## Lancer en local (Mac, Windows, Linux)

Prérequis : **Node.js 20.9 ou plus récent** (`node -v` pour vérifier ; sinon installez la version LTS depuis [nodejs.org](https://nodejs.org), ou `brew install node` sur Mac).

Tapez ces commandes une par une (Entrée après chacune) :

```bash
cd YOUBA-SERVICE
git pull
npm install
rm -rf .data
npm run db:seed
npm run dev
```

Puis ouvrez **http://localhost:3000** et connectez-vous avec **youba** / **youba1234**. `Ctrl + C` arrête le serveur.

- `npm install` : à refaire après chaque `git pull` ;
- `rm -rf .data` : efface la base locale (produits, chiffres et compte) ;
- `npm run db:seed` : prépare la base avec **seulement le compte**, sans aucun produit.

Autres commandes utiles :

- `npm run db:clear -- --oui` : vide la boutique (produits, journées, dépenses sur le bénéfice) mais **garde le compte** ;
- `npm run db:seed -- --demo` : ajoute 4 produits de démonstration avec 3 mois de chiffres (`--demo --reset` pour les recréer).

Pour voir la version téléphone sur l'ordinateur : dans Chrome, clic droit → **Inspecter**, puis l'icône téléphone.

> La base locale (dans `.data/`) n'accepte qu'un seul programme à la fois : arrêtez `npm run dev` avant `npm run db:seed` ou `npm run db:clear`. Si un jour elle ne s'ouvre plus (le terminal le dit), `rm -rf .data` puis `npm run db:seed`.
>
> Le mode sans réseau (service worker) n'est actif qu'en production : pour l'essayer en local, `npm run build` puis `npm start`.

Vérifications : `npm test`, `npm run typecheck`, `npm run lint`.

## Mise en ligne gratuite

Deux services gratuits : une **base de données** (Neon) et un **hébergeur** (Netlify).

### 1. Base de données — Neon

1. Créez un compte sur [neon.com](https://neon.com) puis un projet, région **AWS US East 2 (Ohio)** (à côté des serveurs Netlify).
2. Dans **Connect**, activez **Connection pooling** et copiez la chaîne de connexion (`postgresql://…-pooler…/neondb?sslmode=require`).

### 2. Hébergement — Netlify

1. Créez un compte sur [netlify.com](https://www.netlify.com) (« Sign up with GitHub »).
2. **Add new project → Import an existing project → GitHub**, puis choisissez le dépôt `YOUBA-SERVICE`.
3. Dans l'écran de configuration :
   - **Branch to deploy** : la branche qui contient cette version ;
   - **Build command** et **Publish directory** : laissez ce que propose Netlify (`netlify.toml` impose `npm run build:deploy` et `.next`) ;
   - **Environment variables → Add**, trois variables :
     - `DATABASE_URL` = la chaîne Neon ;
     - `ADMIN_USERNAME` = l'identifiant de Youba, par exemple `youba` ;
     - `ADMIN_PASSWORD` = son mot de passe (8 caractères au moins).
4. **Deploy**. Le premier déploiement prend 2 à 4 minutes (il crée aussi les tables). Le site est ensuite en ligne à une adresse du type `https://nom-au-hasard.netlify.app`, modifiable dans **Domain management**.
5. Chaque `git push` sur cette branche redéploie automatiquement.

Le compte est créé au premier passage sur la page de connexion, à partir de `ADMIN_USERNAME` / `ADMIN_PASSWORD`. Ensuite, Youba peut changer son mot de passe dans **Réglages** (modifier les variables n'a plus d'effet).

### Base déjà utilisée par l'ancienne version

Si une base Neon a déjà servi à la version complète précédente, le déploiement échoue avec « La base contient déjà des tables d'une autre version ». Dans Neon, ouvrez **SQL Editor** et exécutez :

```sql
DROP SCHEMA IF EXISTS drizzle CASCADE;
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```

Cela efface tout le contenu de la base. Relancez ensuite le déploiement dans Netlify (**Deploys → Trigger deploy**).

### Mot de passe oublié

Depuis votre ordinateur, avec la chaîne Neon :

```bash
DATABASE_URL="postgresql://…" npm run user:reset-password -- youba NouveauMotDePasse
```

### Première utilisation

Envoyez le lien à Youba. Sur son téléphone : ouvrir le lien, se connecter, puis menu du navigateur → **Ajouter à l'écran d'accueil**. Ensuite : **Produits → Ajouter un produit**, puis chaque jour **Saisie**, et le **Bilan** pour voir où en est la boutique.

Pour vider la boutique en ligne (en gardant le compte), depuis votre ordinateur :

```bash
DATABASE_URL="postgresql://…" npm run db:clear -- --oui
```

## Structure

```
src/
  app/
    (auth)/connexion   page de connexion
    (app)/saisie       saisie du jour + bilan de la journée
    (app)/bilan        capital actuel, capital par produit, dépenses sur le bénéfice
    (app)/produits     liste, ajout, fiche produit (investissement, bénéfice d'avant)
    (app)/rapports     résultat d'une période + export Excel (rapports/export)
    (app)/reglages     apparence, boutique, mot de passe
  components/          interface (cartes, formulaires, graphique, navigation, thème)
  lib/
    actions/           Server Actions (vérifient toujours la session)
    auth/              mots de passe, sessions
    data/              requêtes (produits, journées, bilan et rapports, dépenses sur le bénéfice)
    db/                schéma Drizzle et connexion (Postgres ou PGlite)
    offline/           file d'attente des journées saisies sans réseau
    xlsx.ts            export Excel
drizzle/               migrations SQL
scripts/               migrate.ts, seed.ts, clear.ts, reset-password.ts
tests/                 tests Vitest
```
