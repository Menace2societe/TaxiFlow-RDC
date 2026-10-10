# TaxiFlow RDC

[![CI](https://github.com/Menace2societe/TaxiFlow-RDC/actions/workflows/ci.yml/badge.svg)](https://github.com/Menace2societe/TaxiFlow-RDC/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20RLS-3ECF8E?logo=supabase&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)
![Tests](https://img.shields.io/badge/tests-Vitest%20%2B%20PGlite-6E9F18?logo=vitest&logoColor=white)
![Vercel](https://img.shields.io/badge/deploy-Vercel-000000?logo=vercel)

Gestion de flotte de **taxis et motos-taxis** pour la République démocratique du Congo.
Les **investisseurs** suivent leurs véhicules et leurs recettes, les **chauffeurs** déclarent leurs
versements depuis le terrain (même sans réseau), et chaque déclaration est contrôlée par le
**kilométrage** pour repérer les recettes sous-déclarées.

Pensé pour Kinshasa : montants en **francs congolais (CDF)** avec le taux USD du jour, heure de
Kinshasa (ou Lubumbashi), numéros **+243**, chauffeurs sans email, interface en français et thème
sombre lisible en plein soleil.

---

## Fonctionnalités

- **Trois espaces, un seul login** : administrateur, investisseur, chauffeur. Le middleware redirige
  chacun vers son tableau de bord selon son rôle.
- **Versements journaliers** : le chauffeur déclare sa recette, l'investisseur **valide ou rejette**
  (motif obligatoire). Les paiements en espèces peuvent être saisis à la main par l'investisseur.
- **Anti-fraude kilométrique** : km de départ / d'arrivée, distance calculée par la base, et entrée
  marquée **suspecte** quand la distance dépasse 50 km pour une recette ≤ 5 000 CDF (montant converti
  en CDF : un versement en USD n'est pas pénalisé). Les alertes s'affichent dans un panneau dédié
  côté investisseur et admin.
- **Mode hors-ligne chauffeur** : sans réseau, le versement est mis en file d'attente sur le téléphone
  et envoyé automatiquement au retour de la connexion.
- **Chauffeurs sans email** : l'investisseur inscrit un chauffeur avec son numéro ; l'app génère un
  **code d'accès** à lui transmettre. Le chauffeur se connecte avec « numéro + code », sans SMS payant,
  puis peut choisir son propre code.
- **Pannes et maintenance** : déclaration de panne → réparation en cours → résolue, et le statut
  du véhicule suit (`en service`, `maintenance`, `repos`).
- **Flotte investisseur** : ajout de véhicules (taxi / moto), affectation d'un chauffeur par son
  numéro, recette du mois par véhicule.
- **Chauffeur-propriétaire** : un chauffeur peut enregistrer son propre véhicule ; ses versements sont
  validés automatiquement.
- **Documents légaux** : carte rose, assurance, permis, contrats… dans un bucket **privé**, ouverts par
  des liens signés valables 1 h, uniquement par l'investisseur et le chauffeur concernés.
- **Taux USD/CDF du jour** : mis à jour automatiquement (cache 6 h), affiché dans les formulaires.
- **Heure locale** : toutes les dates « du jour » suivent le fuseau de la flotte, pas l'UTC.
- **Export CSV** : recettes et versements, prêts pour Excel en français.
- **Tableaux de bord** : KPIs, recettes par semaine, mix taxi / moto, meilleur chauffeur (Recharts).
- **Temps réel** : les pages se rafraîchissent quand un versement, une panne ou un véhicule change.
- **Sécurité en base** : rôle figé à l'inscription, versements « en attente » sauf chauffeur-patron,
  numéros visibles seulement par les personnes liées. C'est garanti par la RLS Postgres, pas seulement
  par l'interface, et vérifié par les tests.

## Architecture

```mermaid
flowchart LR
    D[📱 Chauffeur<br/>/driver] -->|versement, km, panne| SA
    I[💼 Investisseur<br/>/investor] -->|valider, flotte, documents| SA
    A[🛠️ Admin<br/>/dashboard] --> SA
    Q[(File hors-ligne<br/>localStorage)] -.->|au retour du réseau| SA
    D --- Q
    MW[middleware.ts<br/>session + rôle] --> D & I & A
    SA[Server Actions<br/>src/actions] --> DB[(Supabase Postgres<br/>RLS)]
    SA --> ST[(Storage privé<br/>liens signés)]
    SA --> FX[Taux USD/CDF<br/>du jour]
    DB -->|Realtime| RT[SupabaseRealtimeRefresh]
    RT -.-> D & I & A
```

## Parcours d'un versement

```mermaid
sequenceDiagram
    participant C as Chauffeur
    participant App as TaxiFlow
    participant DB as Supabase
    participant I as Investisseur
    C->>App: km départ / arrivée + recette
    App->>DB: daily_entries + payments (pending)
    DB-->>DB: distance_covered, is_suspicious
    DB-->>I: notification temps réel
    I->>App: Valider / Rejeter (motif)
    App->>DB: status = validated | rejected
```

## Stack

| Couche | Choix |
|---|---|
| Front + back | **Next.js 14** (App Router, Server Components, Server Actions), React 18 |
| Langage | TypeScript strict, validation **zod** |
| Base de données | **Supabase** : Postgres, Row Level Security, Auth, Storage, Realtime |
| UI | Tailwind CSS 3, lucide-react, Recharts |
| Dates | date-fns + date-fns-tz (`Africa/Kinshasa`, `Africa/Lubumbashi`) |
| Tests | Vitest + [PGlite](https://pglite.dev) (Postgres embarqué, sans Docker) |
| Hébergement | Vercel |

## Démarrage rapide

**Prérequis** : Node.js 20+, un projet [Supabase](https://supabase.com) (gratuit), et la
[CLI Supabase](https://supabase.com/docs/guides/cli) pour les migrations.

```bash
git clone https://github.com/Menace2societe/TaxiFlow-RDC.git
cd TaxiFlow-RDC
npm install
cp .env.example .env.local      # puis remplir les valeurs
supabase link --project-ref <votre-ref>
supabase db push                # applique supabase/migrations
npm test                        # tests unitaires + migrations
npm run dev                     # http://localhost:3000
```

Créez ensuite un compte sur `/register` (investisseur ou chauffeur).

### Nommer un administrateur

L'inscription publique ne crée que des chauffeurs et des investisseurs. Pour donner le rôle admin,
exécutez dans **Supabase → SQL Editor**, le seul endroit autorisé à changer un rôle :

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'vous@exemple.com');
```

## Configuration (`.env.local`)

| Variable | Où la trouver | Rôle |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | URL du projet (**obligatoire**) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API | Clé publique, soumise à la RLS (**obligatoire**) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API | **Serveur uniquement** : création des comptes chauffeurs par téléphone et de leurs codes d'accès. Ne jamais l'exposer côté client ni la préfixer `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_APP_TIMEZONE` | *(optionnel)* | `Africa/Kinshasa` (défaut, UTC+1) ou `Africa/Lubumbashi` (UTC+2) |
| `USD_CDF_FALLBACK_RATE` | *(optionnel)* | Taux utilisé si l'API de change ne répond pas (défaut `2800`) |
| `DRIVER_LOGIN_EMAIL_DOMAIN` | *(optionnel)* | Domaine des identifiants techniques des chauffeurs (défaut `chauffeurs.taxiflow.invalid`, jamais utilisé pour envoyer un email) |

Sur Vercel, ajoutez les mêmes variables dans *Project → Settings → Environment Variables*.

## Rôles et espaces

| Rôle | Accueil | Ce qu'il peut faire |
|---|---|---|
| **Chauffeur** | `/driver/portal` | Déclarer ses versements et ses km, signaler une panne, voir son contrat et ses documents, changer son code |
| **Chauffeur-propriétaire** | `/driver/portal` | Tout ce qui précède + enregistrer son véhicule et ses documents ; versements validés d'office |
| **Investisseur** | `/investor/dashboard` | Flotte, recrutement des chauffeurs et codes d'accès, validation des versements, recettes, alertes km, maintenance, documents, exports CSV |
| **Admin** | `/dashboard/overview` | Saisie journalière, flotte, rapports et export CSV, utilisateurs |

Le rôle et le statut chauffeur-propriétaire sont choisis **à l'inscription** et ne peuvent plus être
modifiés par l'utilisateur ensuite.

## Scripts

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` / `npm start` | Build et serveur de production |
| `npm test` | Tests unitaires + migrations rejouées sur une base vide, avec tests RLS |
| `npm run typecheck` | Vérification TypeScript |
| `npm run lint` | ESLint (Next.js) |
| `npm run clean` / `npm run build:fresh` | Vide `.next` et le cache, puis rebuild |

## Tests

```bash
npm test
```

- **Unitaires** (`tests/unit`) : numéros RDC, codes d'accès, CSV, redirections sûres, fuseau horaire,
  taux de change, règle anti-fraude.
- **Base de données** (`tests/db`) : toutes les migrations sont rejouées sur un Postgres embarqué,
  puis la RLS est testée en se connectant comme chaque type d'utilisateur. Les tests vérifient qu'on ne
  peut pas devenir admin, changer son rôle, s'auto-valider un versement, lire les numéros d'autres
  chauffeurs ni ouvrir les documents d'un autre investisseur.

La CI GitHub lance typecheck, lint, tests et build à chaque push.

## Structure du projet

```text
src/
  app/
    (auth)/          login (email ou téléphone), register, signup
    (dashboard)/     /dashboard (admin) et /investor (investisseur), routes d'export CSV
    (driver)/        /driver : portail, versements, maintenance, documents, profil
    auth/signout/    route de déconnexion
  actions/           Server Actions : entries, payments, breakdowns, vehicles,
                     investor-fleet, legal-documents, profile, register
  components/        ui/ (design system), shared/, driver/, investor/, auth/
  lib/
    auth/            rôles, requireRole, connexion chauffeur par téléphone
    dashboard/       lectures et agrégations
    entries/         règle anti-fraude kilométrique
    fx/              taux USD/CDF du jour
    legal-documents/ types, bucket privé, liens signés
    supabase/        clients navigateur / serveur / service role, types
    time/            dates en heure de Kinshasa / Lubumbashi
    csv.ts, exports.ts  export CSV
  middleware.ts      session Supabase + redirection par rôle
supabase/migrations/ schéma, RLS, enums, stockage, anti-fraude km
tests/               unit/ (Vitest) et db/ (migrations + RLS sur PGlite)
```

## Feuille de route

**Fiabilité et sécurité**
- [x] Rôles figés à l'inscription et politiques RLS durcies
- [x] Documents privés en liens signés
- [x] Migrations rejouables depuis zéro
- [x] Tests unitaires et RLS
- [ ] `seed.sql` de démo
- [ ] Types générés avec `supabase gen types`
- [ ] Tests e2e Playwright

**Terrain**
- [x] Connexion chauffeur par numéro + code d'accès
- [ ] Code envoyé par **SMS / WhatsApp** au lieu d'être transmis par l'investisseur
- [ ] **PWA installable** (manifest, service worker) pour ouvrir l'app sans réseau
- [ ] Contrôle de continuité du compteur (km de départ = km d'arrivée de la veille)
- [ ] Photo du compteur jointe au versement

**Argent**
- [x] Taux USD/CDF du jour
- [ ] Paiement **Mobile Money** : M-Pesa, Airtel Money, Orange Money
- [ ] Dépenses : carburant, entretien, et **bénéfice net** par véhicule
- [ ] Contrats chauffeur : salarié ou **location-vente** avec suivi du remboursement

**Pilotage**
- [x] Panneau des **entrées suspectes**
- [x] Export **CSV** des recettes et versements
- [ ] Export PDF
- [ ] Alertes d'expiration (assurance, contrôle technique, permis)
- [ ] Notifications WhatsApp / SMS (versement en retard, panne)
- [ ] Vue admin globale et journal d'audit
- [ ] Traduction **lingala** et **swahili**

## Licence

Projet privé, tous droits réservés.
