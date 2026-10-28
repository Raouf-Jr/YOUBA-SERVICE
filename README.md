# YOUBA SERVICE

Application web de gestion pour petites boutiques : ventes du jour, dépenses, stock, investissements, bénéfices, courbes et rapports. Pensée pour le téléphone, utilisable sur ordinateur, gratuite à héberger.

## Fonctionnalités

| Module | Ce qu'il fait |
| --- | --- |
| **Comptes** | Inscription / connexion par e-mail. Chaque boutique ne voit que ses données. Comptes **employés** (saisie des ventes, dépenses et stock, sans accès aux bénéfices ni aux rapports). **Mot de passe oublié** par e-mail (lien valable 1 h, à usage unique) ; le propriétaire peut aussi redéfinir le mot de passe d'un employé. **Protection contre les essais de mots de passe** : après 5 échecs, le compte est bloqué 15 minutes (limites aussi sur l'inscription et les demandes de lien). |
| **Ventes du jour** | Liste des produits avec boutons − / +, prix modifiable (remise), mode de paiement (espèces, Mobile Money, carte…), total en direct. Historique du jour, annulation d'une vente (le stock est remis), navigation par date, mini-graphe des 7 derniers jours. |
| **Produits & stock** | Catalogue avec catégorie, unité, prix de vente / d'achat et marge. Suivi du stock, seuil d'alerte, réapprovisionnement (enregistré automatiquement en dépense « Achat de marchandises »), inventaire, archivage. Valeur du stock. |
| **Dépenses** | Catégories (loyer, transport, électricité…), vue par mois, comparaison avec le mois précédent, répartition par catégorie, modification / suppression. |
| **Investissements** | Équipement, aménagement, stock de départ… Pourcentage déjà remboursé par les bénéfices et date estimée de remboursement complet. |
| **Tableau de bord** | Bénéfice net, chiffre d'affaires, dépenses avec évolution vs période précédente ; courbe CA / dépenses / bénéfice (jour, semaine ou mois selon la période) ; meilleurs produits ; dépenses par catégorie ; objectif mensuel ; alertes de stock. Périodes : aujourd'hui, 7 j, 30 j, ce mois, mois dernier, cette année, tout, ou dates libres. |
| **Rapports** | Compte de résultat simplifié, tableau mois par mois, ventes par produit avec marge, modes de paiement. **Export Excel (CSV)** et **impression / PDF**. |
| **Hors connexion** | Les ventes et les dépenses se saisissent même sans réseau : elles sont gardées sur le téléphone (y compris si l'application est fermée) et envoyées automatiquement au retour de la connexion, sans risque de doublon. Les pages Ventes et Dépenses s'ouvrent sans réseau ; un bandeau indique l'état et le nombre de saisies en attente. |
| **Application mobile** | Installable sur l'écran d'accueil (PWA), mode sombre automatique, interface en français, devises F CFA, €, $, etc. |

## Technique

- **Next.js 16** (App Router, Server Components, Server Actions, Cache Components) + **TypeScript** + **Tailwind CSS 4**
- **PostgreSQL** via **Drizzle ORM** ; en local, base embarquée **PGlite** (aucune installation)
- Authentification maison : mots de passe hachés (scrypt), sessions en base, cookie `httpOnly`
- Hors connexion : service worker (`public/sw.js`) pour ouvrir les pages, file d'attente locale (`src/lib/offline/`) pour les saisies, identifiant unique par saisie côté serveur pour ignorer les renvois
- Graphiques en SVG faits main (pas de bibliothèque lourde), palette de couleurs validée pour le daltonisme
- Tests : **Vitest** (unitaires + intégration sur une vraie base Postgres en mémoire)

## Démarrer en local

Prérequis : **Node.js 20.9 ou plus récent** (`node -v` pour vérifier ; sinon installez la version LTS depuis [nodejs.org](https://nodejs.org), ou `brew install node` sur Mac).

```bash
cd YOUBA-SERVICE
npm install       # une seule fois (et après chaque mise à jour du code)
npm run db:seed   # (facultatif) crée une boutique de démonstration avec 4 mois de données
npm run dev       # puis ouvrez http://localhost:3000
```

Compte de démonstration : **demo@youba.app** / **demo1234**. `Ctrl + C` arrête le serveur.

Pour voir la version téléphone sur l'ordinateur : dans Chrome, clic droit → **Inspecter**, puis l'icône téléphone (mode responsive). Sur un vrai téléphone, testez après la mise en ligne (HTTPS).

> La base locale (PGlite, dans `.data/`) n'accepte qu'un seul programme à la fois : arrêtez `npm run dev` avant de lancer `npm run db:seed`. Pour repartir de zéro : supprimez le dossier `.data`.
>
> Le mode hors connexion (service worker) n'est actif qu'en production : pour l'essayer en local, lancez `npm run build && npm start` et utilisez Chrome.

Autres commandes :

```bash
npm test            # tests
npm run typecheck   # vérification TypeScript
npm run lint        # ESLint
npm run build       # build de production
```

## Mise en ligne gratuite

Il faut deux services, tous deux avec une offre gratuite : une **base de données** (Neon) et un **hébergeur** (Netlify).

### 1. Base de données — Neon

1. Créez un compte sur [neon.com](https://neon.com) puis un projet. Choisissez la région **AWS US East 2 (Ohio)** : c'est là que Netlify fait tourner le serveur de l'application par défaut, et la base doit être à côté (sinon chaque requête traverse l'Atlantique).
2. Dans **Connect**, activez **Connection pooling** et copiez la chaîne de connexion (`postgresql://…-pooler…/neondb?sslmode=require`).

L'offre gratuite (1 Go de stockage) suffit largement pour des années de ventes d'une boutique.

### 2. Hébergement — Netlify

1. Créez un compte sur [netlify.com](https://www.netlify.com) (le plus simple : « Sign up with GitHub »).
2. **Add new project → Import an existing project → GitHub**, autorisez Netlify, puis choisissez le dépôt `YOUBA-SERVICE`.
3. Dans l'écran de configuration :
   - **Branch to deploy** : la branche qui contient le code (celle par défaut du dépôt) ;
   - **Build command** et **Publish directory** : laissez ce que Netlify propose, `netlify.toml` les impose (`npm run build:deploy`, `.next`) ;
   - **Environment variables → Add** : `DATABASE_URL` = la chaîne Neon copiée plus haut.
4. Cliquez sur **Deploy**. Le premier déploiement prend 2 à 4 minutes (il crée aussi les tables dans Neon). Le site est ensuite en ligne à une adresse du type `https://nom-au-hasard.netlify.app`, modifiable dans **Domain management**.
5. Chaque `git push` sur cette branche redéploie automatiquement.

En cas d'échec, ouvrez le déploiement dans **Deploys** : le journal indique l'étape fautive (« DATABASE_URL manquant » = variable oubliée ou mal nommée).

Vercel fonctionne aussi (importez le dépôt, ajoutez `DATABASE_URL`, commande de build `npm run build:deploy`), mais son offre gratuite « Hobby » est réservée à un usage personnel non commercial.

### 3. E-mails (mot de passe oublié) — facultatif mais recommandé

Sans cette étape tout fonctionne, sauf l'envoi du lien « Mot de passe oublié » : le site invite alors à contacter le propriétaire de la boutique ou l'administrateur.

Deux options gratuites, sans nom de domaine à acheter :

- **Brevo** ([brevo.com](https://www.brevo.com/free-smtp-server/), jusqu'à 300 e-mails par jour) : créez un compte, validez l'adresse d'expédition (menu *Expéditeurs*), puis dans *SMTP & API* créez une **clé SMTP**.
  `SMTP_HOST=smtp-relay.brevo.com`, `SMTP_PORT=587`, `SMTP_USER=` l'identifiant SMTP affiché par Brevo, `SMTP_PASS=` la clé SMTP, `MAIL_FROM="YOUBA SERVICE <votre-adresse-validée>"`.
- **Gmail** : activez la validation en deux étapes du compte Google, créez un **mot de passe d'application**, puis
  `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER=` votre adresse Gmail, `SMTP_PASS=` le mot de passe d'application.

Ajoutez ces variables dans Netlify (*Environment variables*) puis redéployez. Les réglages exacts peuvent évoluer : vérifiez-les dans l'interface du fournisseur.

**Dépannage administrateur** : pour changer le mot de passe d'un compte sans e-mail, lancez depuis votre ordinateur, avec `DATABASE_URL` de production :

```bash
DATABASE_URL="postgresql://…" npm run user:reset-password -- adresse@exemple.com NouveauMotDePasse
```

### 4. Première utilisation

Ouvrez l'adresse du site, cliquez sur **Créer ma boutique**, puis suivez les 4 étapes affichées sur le tableau de bord. Sur téléphone : menu du navigateur → **Ajouter à l'écran d'accueil**.

Pour le mode hors connexion : ouvrez une fois les pages **Ventes** et **Dépenses** avec du réseau (c'est fait automatiquement après la connexion). Ensuite, même sans réseau, elles s'ouvrent et acceptent les saisies.

## Structure

```
src/
  app/
    (auth)/            connexion, inscription
    (app)/             pages de l'application (tableau de bord, ventes, dépenses, produits,
                       investissements, rapports + export CSV, paramètres)
    manifest.ts        PWA
  components/          interface (cartes, formulaires, graphique d'évolution, navigation)
  lib/
    actions/           Server Actions (vérifient toujours la session)
    auth/              mots de passe, sessions, contrôle d'accès
    data/              requêtes (toujours filtrées par boutique)
    db/                schéma Drizzle et connexion (Postgres ou PGlite)
    dates.ts, period.ts, stats.ts, format.ts
drizzle/               migrations SQL
scripts/               migrate.ts, seed.ts
tests/                 tests Vitest
```
