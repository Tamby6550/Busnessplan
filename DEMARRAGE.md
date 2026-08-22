# BusinessPlan AI — Guide de démarrage

## Prérequis

| Outil | Version | Vérification |
|-------|---------|-------------|
| WampServer (Apache + MySQL) | MySQL 9.1.0 | `mysql --version` |
| PHP | 8.2+ | `php -v` |
| Composer | 2.x | `composer --version` |
| Node.js | 18+ | `node -v` |
| npm | 9+ | `npm -v` |

## Installation en une seule commande

Double-cliquez sur **`setup.bat`** à la racine du projet.

Le script va :
1. Vérifier PHP, Composer et Node.js
2. Installer les dépendances Composer (`business-plan-api/`)
3. Générer les clés JWT RSA (OpenSSL requis dans PATH)
4. Créer la base de données `business_plan_aides` dans MySQL
5. Exécuter les migrations Doctrine
6. Créer l'utilisateur admin par défaut
7. Installer les dépendances npm (`business-plan-front/`)

## Démarrage manuel

### Backend Symfony

```bash
cd business-plan-api
php -S localhost:8000 -t public
```

> Si vous utilisez Symfony CLI : `symfony serve --port=8000`

### Frontend React

```bash
cd business-plan-front
npm run dev
```

Ouvrez **http://localhost:3000** dans votre navigateur.

## Identifiants par défaut

| Champ | Valeur |
|-------|--------|
| Email | `admin@businessplan.mg` |
| Mot de passe | `Admin@2026` |

## Structure du projet

```
BusinessPlan/
├── setup.bat                        ← Script d'installation
├── DEMARRAGE.md                     ← Ce fichier
│
├── business-plan-api/               ← Backend Symfony 7.1
│   ├── src/
│   │   ├── Command/                 ← Commandes console (CreateAdminUserCommand)
│   │   ├── Controller/
│   │   │   ├── Auth/                ← LoginController, GetCurrentUserController
│   │   │   ├── Project/             ← CRUD projets
│   │   │   ├── Company/             ← CRUD + duplicate entreprises
│   │   │   ├── Product/             ← CRUD produits
│   │   │   ├── Material/            ← CRUD matières premières
│   │   │   ├── StaffMember/         ← CRUD postes salariaux
│   │   │   ├── Expense/             ← CRUD charges
│   │   │   ├── Investment/          ← CRUD investissements
│   │   │   ├── AdditionalFunding/   ← Mise à jour apports An 1-5
│   │   │   ├── ActivityLog/         ← Journal d'activité
│   │   │   └── User/                ← Gestion utilisateurs
│   │   ├── Entity/                  ← 12 entités Doctrine (PHP Attributes)
│   │   ├── Manager/                 ← Logique métier séparée par domaine
│   │   └── Repository/              ← Requêtes DQL optimisées (pas de N+1)
│   ├── config/
│   │   ├── packages/
│   │   │   ├── doctrine.yaml        ← MySQL 9.1.0, sql_mode fix
│   │   │   ├── security.yaml        ← JWT + bcrypt cost 13
│   │   │   ├── lexik_jwt_authentication.yaml
│   │   │   └── nelmio_cors.yaml     ← CORS pour le frontend React
│   │   └── jwt/                     ← Clés RSA générées par setup.bat
│   └── .env                         ← DATABASE_URL, JWT_PASSPHRASE
│
└── business-plan-front/             ← Frontend React 18 + TypeScript + Vite
    ├── src/
    │   ├── api/api.ts               ← Couche HTTP centralisée
    │   ├── calculations/
    │   │   └── calculations.ts      ← Moteur financier 100% client-side
    │   ├── components/
    │   │   ├── dashboard/           ← ProjectCard, CompanyCard, modales
    │   │   ├── editor/
    │   │   │   ├── sections/        ← 8 sections de l'éditeur
    │   │   │   ├── EditorSidebar
    │   │   │   └── MonthlyQtyRow
    │   │   └── layout/              ← AppSidebar
    │   ├── pages/
    │   │   ├── LoginPage.tsx
    │   │   ├── DashboardPage.tsx
    │   │   └── EditorPage.tsx
    │   ├── stores/
    │   │   ├── authStore.ts         ← Zustand — token JWT + user
    │   │   └── companyStore.ts      ← Zustand — état éditeur
    │   ├── styles/
    │   │   ├── globals.css          ← Reset + composants
    │   │   └── variables.css        ← Design tokens CSS
    │   └── types/index.ts           ← Toutes les interfaces TypeScript
    └── vite.config.ts               ← Proxy /api → localhost:8000

```

## API — Endpoints principaux

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/auth/login` | Connexion → retourne JWT |
| GET | `/api/auth/me` | Profil utilisateur connecté |
| GET | `/api/projects` | Liste tous les projets |
| POST | `/api/projects` | Créer un projet |
| PUT | `/api/projects/{id}` | Modifier un projet |
| DELETE | `/api/projects/{id}` | Supprimer un projet |
| GET | `/api/companies/{id}` | Charger une entreprise complète |
| POST | `/api/projects/{id}/companies` | Créer une entreprise |
| PATCH | `/api/companies/{id}/meta` | Modifier métadonnées |
| PATCH | `/api/companies/{id}/settings` | Modifier paramètres économiques |
| POST | `/api/companies/{id}/duplicate` | Dupliquer une entreprise |
| DELETE | `/api/companies/{id}` | Supprimer une entreprise |
| POST | `/api/companies/{id}/products` | Ajouter un produit |
| PATCH | `/api/products/{id}` | Modifier un produit |
| DELETE | `/api/products/{id}` | Supprimer un produit |
| *(même pattern pour materials, staff-members, expenses, investments)* | | |
| PUT | `/api/companies/{id}/additional-fundings` | Mettre à jour apports An 1-5 |
| GET | `/api/companies/{id}/activity-logs` | Journal d'activité |

## Génération du schéma SQL (première fois)

Si `setup.bat` ne parvient pas à exécuter les migrations :

```bash
cd business-plan-api
php bin/console doctrine:schema:update --force
```

Ou pour générer une vraie migration :

```bash
php bin/console doctrine:migrations:diff
php bin/console doctrine:migrations:migrate
```

## Variables d'environnement (.env)

```env
DATABASE_URL="mysql://root:@127.0.0.1:3306/business_plan_aides?serverVersion=9.1.0&charset=utf8mb4"
JWT_SECRET_KEY=%kernel.project_dir%/config/jwt/private.pem
JWT_PUBLIC_KEY=%kernel.project_dir%/config/jwt/public.pem
JWT_PASSPHRASE=BusinessPlanAides2026
```

Modifiez `DATABASE_URL` si votre MySQL utilise un mot de passe root différent.
