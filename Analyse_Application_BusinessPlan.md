# Analyse Approfondie — Application Business Plan AIDES
## Étude de faisabilité & Conception Full Stack

**Préparé par :** Claude (Cowork Mode)
**Date :** 11 mai 2026
**Version analysée :** business-plan-v20.html + Business Plan-tamplate.html

---

## TABLE DES MATIÈRES

1. Analyse de l'application HTML existante (v20)
2. Analyse du template proposé
3. Améliorations demandées — Analyse détaillée
4. Étude de faisabilité Full Stack (Symfony + React.js + MySQL)
5. Architecture technique proposée
6. Conception de la base de données
7. Architecture API REST (Symfony)
8. Architecture Frontend (React.js)
9. Calculs financiers — Migration
10. Recommandations & prochaines étapes

---

## 1. ANALYSE DE L'APPLICATION HTML EXISTANTE (v20)

### 1.1 Architecture générale

L'application `business-plan-v20.html` est une **Single Page Application (SPA) autonome** — un seul fichier HTML qui regroupe CSS, JavaScript et HTML. Elle fonctionne entièrement côté navigateur, sans serveur.

**3 écrans principaux :**

| Écran | Rôle | Déclencheur |
|---|---|---|
| **Login** (`data-screen="login"`) | Authentification simulée avec utilisateurs prédéfinis | Page d'accueil |
| **Dashboard** (`data-screen="dashboard"`) | Vue d'ensemble projets + entreprises | Après connexion |
| **Editor** (`data-screen="editor"`) | Saisie et consultation du business plan | Clic sur une entreprise |

**Stockage actuel :** `localStorage` du navigateur (clé `bpMada_v12`). Les données sont perdues si l'utilisateur vide son cache ou change de navigateur. Aucune synchronisation entre utilisateurs.

### 1.2 Navigation — Les 13 sections

La sidebar de l'éditeur contient **13 sections de navigation** :

| # | Section | ID | Contenu |
|---|---|---|---|
| 1 | Entreprise | `entreprise` | Identité, paramètres financiers (régime fiscal, taux d'actualisation, fonds de roulement) |
| 2 | Produits & Ventes | `produits` | Produits, prix unitaire, quantités mensuelles (12 mois), taux de croissance An 2-5 |
| 3 | Matières premières | `matieres` | Matières, coût unitaire, quantités mensuelles, taux de croissance |
| 4 | Personnel | `personnel` | Postes, nombre de personnes, salaire mensuel, taux de charges sociales |
| 5 | Autres charges | `charges` | Charges courantes, montant mensuel de base, saisonnalité (×12 coefficients), croissance |
| 6 | Investissements | `investissements` | Immobilisations, amortissement linéaire, financement (FP/Emprunt/Subvention), tableau d'amortissement |
| 7 | Projection 5 ans | `projection` | Taux d'inflation annuels An 2 à An 5 |
| 8 | Compte de résultats | `resultats` | Tableau de résultats sur 5 ans (CA, CV, Marge brute, EBITDA, EBIT, EBT, Résultat net) |
| 9 | Trésorerie | `tresorerie` | Plan 5 ans + vision mensuelle An 1 + apports complémentaires saisissables |
| 10 | Bilans | `bilan` | Bilan actif/passif sur 5 ans |
| 11 | Rentabilité | `rentabilite` | Seuil de rentabilité, VAN, TRI, délai de récupération |
| 12 | Plan de financement | `financement` | Tableau de financement consolidé |
| 13 | Synthèse & Export | `synthese` | Résumé global + export JSON/Excel |

### 1.3 Modèle de données — Structure complète d'une entreprise

```json
{
  "meta": {
    "name": "string",
    "secteur": "string",
    "promoteur": "string",
    "projet": "string",
    "devise": "Ar",
    "createdAt": "ISO8601"
  },
  "settings": {
    "infl2": 0,         // Inflation An 2 (%)
    "infl3": 0,         // Inflation An 3 (%)
    "infl4": 0,         // Inflation An 4 (%)
    "infl5": 0,         // Inflation An 5 (%)
    "discountRate": 10, // Taux d'actualisation (VAN)
    "taxRegime": "IR",  // "IR" ou "IS"
    "taxRate": 20,      // Taux IR (% du bénéfice EBT)
    "taxRateIS": 5,     // Taux IS (% du CA)
    "fondsRoulement": 0 // Fonds de roulement initial
  },
  "products": [{
    "name": "string",
    "price": 0,
    "monthly": [0,0,0,0,0,0,0,0,0,0,0,0], // 12 mois
    "growth": [0,0,0,0,0]                   // An 1-5
  }],
  "materials": [{
    "name": "string",
    "unitCost1": 0,
    "monthly": [0,0,0,0,0,0,0,0,0,0,0,0],
    "growth": [0,0,0,0,0]
  }],
  "staff": [{
    "role": "string",
    "monthlySalary": 0,
    "headcount": 1,
    "chargesRate": 13
  }],
  "expenses": [{
    "name": "string",
    "monthlyAmount": 0,
    "seasonality": [1,1,1,1,1,1,1,1,1,1,1,1],
    "inflationGrowth": [0,0,0,0,0]
  }],
  "investments": [{
    "name": "string",
    "category": "string",
    "amount": 0,
    "life": 5,           // Durée d'amortissement (ans)
    "financedEquity": 0,
    "financedLoan": 0,
    "financedGrant": 0,
    "loanRate": 0,
    "loanYears": 5
  }],
  "additionalFunding": [  // 5 entrées (An 1-5)
    { "equity": 0, "loan": 0, "loanRate": 0, "loanYears": 0, "grant": 0 }
  ]
}
```

### 1.4 Formules de calcul — Détail complet

Toutes les formules sont implémentées dans la fonction `calcCompany(c)` :

**Chiffre d'affaires (par année y = 0..4) :**
```
CA_y = Σ produits : (Σ monthly_m) × (1 + growth_1) × ... × (1 + growth_y) × price
```

**Coûts variables :**
```
CV_y = Σ matières : (Σ monthly_m) × (1 + growth_1) × ... × (1 + growth_y) × unitCost1
```

**Personnel (avec inflation) :**
```
Personnel_y = Σ postes : salary × headcount × 12 × (1 + chargesRate/100) × Π (1 + infl_k)
```

**Amortissement (linéaire) :**
```
Amort_y = Σ investissements : amount / life  (si year <= life)
```

**EBITDA = CA - CV - Personnel - Autres charges**
**EBIT = EBITDA - Amortissement**

**Frais financiers (méthode capital restant dû, annuité constante) :**
```
Annuité = L × r × (1+r)^n / ((1+r)^n - 1)
Intérêts_y = CRD_y × r  où CRD_y est le capital restant dû en début d'année y
```

**Impôt :**
```
IS : Impôt = CA × tauxIS
IR : Impôt = max(0, EBT) × tauxIR
```

**Résultat net = EBT - Impôt**

**Flux de trésorerie opérationnel :**
```
OpCF = Résultat net + Amortissement - Remboursement capital
```

**Trésorerie initiale :**
```
T0 = FP + Emprunts + Subventions - Investissements totaux + Fonds de roulement
```

**Trésorerie cumulée An y :**
```
CashCum_y = T0 + Σ (OpCF_k + ApportsAdd_k) pour k=1..y
```

**VAN :**
```
VAN = Σ CF_t / (1 + taux_actualisation)^t
```

**TRI :** Newton-Raphson sur les flux de trésorerie (120 itérations max)

**Seuil de rentabilité :**
```
Seuil = Charges fixes / Taux de marge brute
Taux MB = (CA - CV) / CA
```

### 1.5 Fonctionnalités existantes notables

- **Sauvegarde auto** : via `debounce` (300ms) sur `localStorage` à chaque modification d'input
- **Historique d'activité** : drawer latéral avec log des modifications
- **Mode sombre/clair/auto** : via `data-theme` sur `<html>`
- **Calcul auto** : `calcCompany()` est appelée après chaque modification, avec badge "Calcul…/Calculé"
- **Export** : JSON (données brutes) + Excel (via lib xlsx.js CDN)
- **Import** : fichier JSON pour importer des données
- **Duplication** d'entreprise (deep clone)
- **Multi-utilisateurs simulés** : 3 comptes démo prédéfinis
- **Filtre & recherche** sur le dashboard (par secteur, créateur, statut, tri)
- **Barre de progression** de complétion par entreprise (calculée sur les champs remplis)

### 1.6 Points forts de l'application HTML

1. **Calculs financiers très complets** — modèle professionnel (VAN, TRI, amortissement linéaire, annuité constante)
2. **Design propre** — system de design cohérent avec tokens CSS (variables)
3. **UX fluide** — pas de rechargement, tout en mémoire
4. **Dark mode** bien implémenté
5. **Export Excel** natif

### 1.7 Limites de l'application HTML (justifiant la migration)

1. **Stockage local uniquement** — pas de partage, pas de persistance multi-devices
2. **Authentification simulée** — mots de passe en clair dans le code
3. **Pas de collaboration réelle** — impossible de voir les modifs d'un autre utilisateur
4. **Pas de traçabilité réelle** — l'historique est simulé, pas persisté
5. **Pas de gestion multi-utilisateurs réelle** — un seul utilisateur par navigateur
6. **Pas d'historique des versions** — une seule version des données
7. **Scalabilité** — impossible d'ajouter de nouvelles fonctionnalités serveur
8. **Sécurité** — données non chiffrées, accessibles à tous sur le poste

---

## 2. ANALYSE DU TEMPLATE PROPOSÉ

### 2.1 Structure du template (Business Plan-tamplate.html)

Le template proposé est **architecturalement identique** à la v20, mais avec les améliorations de design suivantes :

**Palette de couleurs — Light mode :**
- Background : `#f6f5f0` (warm neutral — plus chaleureux)
- Surface : `#ffffff`
- Vert primaire : `#5fa92b` (AIDES brand color)
- Accent doré : `#d9a517`

**Dark mode :**
- Background : `#0d100e` (vert très foncé — plus doux que noir pur)
- Vert primaire dark : `#7ec846`

**Améliorations design notables :**
1. **Login card** : plus compact, centré avec gradient de fond
2. **Dashboard** : stat cards avec icônes, grid de projets plus lisible
3. **Editor** : sidebar plus affinée avec `cur-co` (entreprise active visible)
4. **Cards** dans les sections : design card avec header/body cohérent
5. **Tables** : styles améliorés (thead, tfoot, alternance)
6. **Drawers** : historique d'activité en panneau latéral
7. **Modals** : création de projet/entreprise en popup propre
8. **User chip** : avatar avec initiales, popover utilisateur
9. **Calc badge** : indicateur de recalcul animé
10. **KPI cards** : animation de flash sur mise à jour

### 2.2 Ce qui DOIT être conservé (identique) dans la version full stack

- Tous les textes, titres et labels des sections
- Toutes les formules de calcul (exactement telles que dans le HTML)
- Tous les champs de saisie (noms, types, unités)
- La structure des 13 sections de navigation
- Le design system (couleurs, fonts, border-radius, shadows)
- Les exports Excel par section
- L'historique d'activité par entreprise

---

## 3. AMÉLIORATIONS DEMANDÉES — ANALYSE DÉTAILLÉE

### 3.1 Gestion des utilisateurs

**Ce qui est demandé :**
- Login par email/mot de passe (compte individuel)
- Un seul rôle : tous les utilisateurs peuvent créer, modifier, consulter
- Traçabilité : qui a fait la dernière modification, quand
- Pas d'administration complexe (pas d'admin panel pour commencer)

**Implication technique :**
- Table `users` avec email, password_hash (bcrypt), prénom, nom
- JWT ou session Symfony pour l'authentification
- Champ `last_modified_by` + `last_modified_at` sur chaque entité modifiable
- Table `activity_logs` pour l'historique détaillé

### 3.2 Dashboard — Interface principale

**Ce qui est demandé :**
- Vue de tous les projets après login
- Chaque carte projet affiche : liste des entreprises + infos essentielles + % complétion
- Bouton "Nouveau projet", filtres, recherche
- Clic sur entreprise → redirection vers l'éditeur

**Infos essentielles à afficher sur chaque entreprise (résumé dashboard) :**
- Nom de l'entreprise + secteur
- Promoteur
- % de complétion des informations
- Résultat net An 1 (calculé)
- Trésorerie An 1 (calculée)
- Dernière modification (qui + quand)

### 3.3 Sauvegarde automatique

**Ce qui est demandé :**
- Sauvegarde au `blur` (quand on quitte un champ)
- Notification visuelle de confirmation (toast/badge "Sauvegardé ✓")
- Pas de bouton "Enregistrer" explicite dans l'éditeur

**Implication technique :**
- API PATCH sur chaque section (pas de PUT complet à chaque frappe)
- Debounce côté React (300-500ms) avant l'appel API
- Toast notification via une lib légère (react-hot-toast ou similaire)
- Indicateur de statut : "En cours de sauvegarde..." → "Sauvegardé ✓"

### 3.4 Création d'entreprise → Redirection

Après création d'une nouvelle entreprise, redirection automatique vers la section "Entreprise" de l'éditeur de cette entreprise.

### 3.5 Calculs côté client vs serveur

**Recommandation :** Garder les calculs **côté client (React/JavaScript)**. Les calculs sont instantanés et l'expérience utilisateur est meilleure. On stocke en base uniquement les **données brutes** (saisies), et les résultats calculés sont recalculés à chaque chargement et après chaque modification. Cela évite des incohérences entre données stockées et calculées.

---

## 4. ÉTUDE DE FAISABILITÉ FULL STACK

### 4.1 Stack technique — Analyse

| Composant | Technologie | Justification |
|---|---|---|
| Backend | **Symfony 7 (PHP 8.3)** | Framework robuste, API Platform disponible, ORM Doctrine complet, sécurité intégrée |
| Frontend | **React 18 + TypeScript** | SPA dynamique, réactivité, écosystème riche, proche de la logique du HTML existant |
| API | **REST JSON** (via Symfony API) | Simple, bien supporté, correspond aux besoins |
| Base de données | **MySQL 8** | Relationnelle, structurée, bien adaptée aux données hiérarchiques (projets/entreprises) |
| Authentification | **JWT (LexikJWTBundle)** | Stateless, compatible SPA, sécurisé |
| ORM | **Doctrine ORM** | Inclus Symfony, migrations automatiques |
| État React | **Zustand ou Context API** | Léger, suffisant pour ce type d'app |
| Styles | **CSS Modules + variables CSS** | Réutiliser le design system HTML existant |
| Calculs | **JavaScript (côté React)** | Portage direct depuis le HTML, instantané |

### 4.2 Faisabilité — Points favorables

1. **Logique métier bien définie** : toutes les formules sont dans le HTML, il suffit de les porter en TypeScript
2. **UI bien conçue** : le template HTML est prêt, à convertir en composants React
3. **Données structurées** : le modèle JSON du HTML se mappe naturellement en tables MySQL
4. **Pas de temps réel** : pas besoin de WebSocket, des API REST classiques suffisent
5. **Volume de données modéré** : une PME avec 10-50 projets, 20-100 entreprises — aucun problème de performance

### 4.3 Points de vigilance / Complexité

1. **Calculs chaînés** : les formules sont interdépendantes (trésorerie dépend de l'emprunt qui dépend des investissements, etc.). Le portage doit être rigoureux et testé
2. **Tableaux de données dynamiques** : les sections Produits, Matières, Personnel, etc. ont des lignes ajoutables/supprimables avec des champs mensuels (12 colonnes) — nécessite une gestion de state React soignée
3. **Sauvegarde granulaire** : chaque section doit avoir son endpoint PATCH pour ne pas envoyer toute la donnée à chaque modification
4. **Calcul du % de complétion** : à définir (nombre de champs non vides / total champs)
5. **Sécurité** : validation côté serveur de toutes les données numériques

### 4.4 Estimation de développement

| Phase | Description | Durée estimée |
|---|---|---|
| Phase 1 | Setup (Symfony + React + MySQL + auth JWT) | 1 semaine |
| Phase 2 | API Symfony (toutes les entités CRUD) | 2 semaines |
| Phase 3 | Interface Dashboard (projets, entreprises) | 1 semaine |
| Phase 4 | Éditeur React (13 sections, formulaires) | 3 semaines |
| Phase 5 | Calculs financiers en TypeScript | 1 semaine |
| Phase 6 | Sauvegarde auto + notifications | 3 jours |
| Phase 7 | Tests, corrections, déploiement | 1 semaine |
| **TOTAL** | | **~9-10 semaines** |

---

## 5. ARCHITECTURE TECHNIQUE PROPOSÉE

### 5.1 Vue d'ensemble

```
┌─────────────────────────────────────────────────┐
│                 NAVIGATEUR                       │
│  React 18 + TypeScript + CSS Variables          │
│  ┌─────────────┐  ┌──────────────────────────┐  │
│  │  Dashboard  │  │    Éditeur entreprise    │  │
│  │  (projets + │  │  (13 sections + calculs) │  │
│  │  entreprises│  │                          │  │
│  └─────────────┘  └──────────────────────────┘  │
│         │                    │                   │
│    HTTP/JSON (JWT)      HTTP/JSON (JWT)           │
└─────────────────────────────────────────────────┘
              │                    │
┌─────────────────────────────────────────────────┐
│              SYMFONY 7 (PHP 8.3)                 │
│  ┌──────────────┐  ┌────────────────────────┐   │
│  │ AuthController│  │  API REST Controllers  │   │
│  │ (JWT login)  │  │  (Projects, Companies, │   │
│  │              │  │   Products, Staff, etc) │   │
│  └──────────────┘  └────────────────────────┘   │
│           │                    │                  │
│  ┌──────────────────────────────────────────┐    │
│  │           Doctrine ORM                   │    │
│  └──────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
              │
┌─────────────────────────────────────────────────┐
│                MySQL 8                           │
│  projects, companies, company_settings,          │
│  products, materials, staff, expenses,           │
│  investments, additional_funding,                │
│  users, activity_logs                            │
└─────────────────────────────────────────────────┘
```

### 5.2 Structure des dossiers — Backend (Symfony)

```
business-plan-api/
├── src/
│   ├── Controller/
│   │   ├── AuthController.php
│   │   ├── ProjectController.php
│   │   ├── CompanyController.php
│   │   ├── ProductController.php
│   │   ├── MaterialController.php
│   │   ├── StaffController.php
│   │   ├── ExpenseController.php
│   │   ├── InvestmentController.php
│   │   ├── AdditionalFundingController.php
│   │   └── ActivityLogController.php
│   ├── Entity/
│   │   ├── User.php
│   │   ├── Project.php
│   │   ├── Company.php
│   │   ├── CompanySettings.php
│   │   ├── Product.php
│   │   ├── Material.php
│   │   ├── StaffMember.php
│   │   ├── Expense.php
│   │   ├── Investment.php
│   │   ├── AdditionalFunding.php
│   │   └── ActivityLog.php
│   ├── Repository/
│   └── Security/
├── config/
└── migrations/
```

### 5.3 Structure des dossiers — Frontend (React)

```
business-plan-frontend/
├── src/
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   └── EditorPage.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppBar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── TopBar.tsx
│   │   ├── dashboard/
│   │   │   ├── ProjectCard.tsx
│   │   │   ├── CompanyRow.tsx
│   │   │   └── StatCard.tsx
│   │   ├── editor/
│   │   │   ├── sections/
│   │   │   │   ├── EntrepriseSection.tsx
│   │   │   │   ├── ProduitsSection.tsx
│   │   │   │   ├── MatieresSection.tsx
│   │   │   │   ├── PersonnelSection.tsx
│   │   │   │   ├── ChargesSection.tsx
│   │   │   │   ├── InvestissementsSection.tsx
│   │   │   │   ├── ProjectionSection.tsx
│   │   │   │   ├── ResultatsSection.tsx
│   │   │   │   ├── TresorerieSection.tsx
│   │   │   │   ├── BilanSection.tsx
│   │   │   │   ├── RentabiliteSection.tsx
│   │   │   │   ├── FinancementSection.tsx
│   │   │   │   └── SyntheseSection.tsx
│   │   │   └── KpiCards.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Modal.tsx
│   │       ├── Toast.tsx
│   │       └── ProgressBar.tsx
│   ├── lib/
│   │   ├── calculations.ts   ← Portage exact des formules HTML
│   │   ├── api.ts           ← Appels HTTP Axios
│   │   └── utils.ts         ← fmt(), fmtN(), esc(), etc.
│   ├── store/
│   │   ├── authStore.ts
│   │   └── companyStore.ts
│   └── styles/
│       └── variables.css    ← Tokens CSS (repris du HTML)
```

---

## 6. CONCEPTION DE LA BASE DE DONNÉES

### 6.1 Schéma entité-relation (description)

```
users ──< projects (créateur)
users ──< companies (créateur, dernier modificateur)
projects ──< companies
companies ──1 company_settings
companies ──< products
companies ──< materials
companies ──< staff_members
companies ──< expenses
companies ──< investments
companies ──< additional_fundings (5 lignes par compagnie)
companies ──< activity_logs
users ──< activity_logs
```

### 6.2 Tables — Schéma MySQL complet

#### TABLE : `users`
```sql
CREATE TABLE users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(180) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  is_active     TINYINT(1) DEFAULT 1,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME NULL,
  INDEX idx_email (email)
) ENGINE=InnoDB CHARACTER SET utf8mb4;
```

#### TABLE : `projects`
```sql
CREATE TABLE projects (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  description TEXT NULL,
  created_by  INT UNSIGNED NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_created_by (created_by)
) ENGINE=InnoDB CHARACTER SET utf8mb4;
```

#### TABLE : `companies`
```sql
CREATE TABLE companies (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id       INT UNSIGNED NOT NULL,
  name             VARCHAR(255) NOT NULL,
  secteur          VARCHAR(255) NULL,
  promoteur        VARCHAR(255) NULL,
  devise           VARCHAR(10) DEFAULT 'Ar',
  created_by       INT UNSIGNED NOT NULL,
  last_modified_by INT UNSIGNED NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (last_modified_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_project (project_id)
) ENGINE=InnoDB CHARACTER SET utf8mb4;
```

#### TABLE : `company_settings`
```sql
CREATE TABLE company_settings (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id      INT UNSIGNED NOT NULL UNIQUE,
  infl2           DECIMAL(6,2) DEFAULT 0,
  infl3           DECIMAL(6,2) DEFAULT 0,
  infl4           DECIMAL(6,2) DEFAULT 0,
  infl5           DECIMAL(6,2) DEFAULT 0,
  discount_rate   DECIMAL(6,2) DEFAULT 10,
  tax_regime      ENUM('IR','IS') DEFAULT 'IR',
  tax_rate        DECIMAL(6,2) DEFAULT 20,
  tax_rate_is     DECIMAL(6,2) DEFAULT 5,
  fonds_roulement BIGINT DEFAULT 0,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARACTER SET utf8mb4;
```

#### TABLE : `products`
```sql
CREATE TABLE products (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id      INT UNSIGNED NOT NULL,
  name            VARCHAR(255) NOT NULL DEFAULT 'Produit',
  price           BIGINT DEFAULT 0,
  -- Quantités mensuelles An 1 (JSON array de 12 valeurs)
  monthly_qty     JSON NOT NULL DEFAULT ('[]'),
  -- Taux de croissance An 1-5 (JSON array de 5 valeurs)
  growth_rates    JSON NOT NULL DEFAULT ('[]'),
  sort_order      SMALLINT DEFAULT 0,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  INDEX idx_company (company_id)
) ENGINE=InnoDB CHARACTER SET utf8mb4;
```

**Note sur l'usage de JSON pour les arrays :** MySQL 8 supporte nativement JSON. Les tableaux de 12 mois et 5 années sont stockés en JSON car leur structure est fixe et les accéder individuellement n'est pas nécessaire (ils sont toujours traités en bloc).

#### TABLE : `materials`
```sql
CREATE TABLE materials (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id   INT UNSIGNED NOT NULL,
  name         VARCHAR(255) NOT NULL DEFAULT 'Matière',
  unit_cost    BIGINT DEFAULT 0,
  monthly_qty  JSON NOT NULL DEFAULT ('[]'),  -- 12 valeurs
  growth_rates JSON NOT NULL DEFAULT ('[]'),  -- 5 valeurs
  sort_order   SMALLINT DEFAULT 0,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  INDEX idx_company (company_id)
) ENGINE=InnoDB CHARACTER SET utf8mb4;
```

#### TABLE : `staff_members`
```sql
CREATE TABLE staff_members (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id      INT UNSIGNED NOT NULL,
  role_name       VARCHAR(255) NOT NULL DEFAULT 'Poste',
  monthly_salary  BIGINT DEFAULT 0,
  headcount       SMALLINT DEFAULT 1,
  charges_rate    DECIMAL(6,2) DEFAULT 13,
  sort_order      SMALLINT DEFAULT 0,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  INDEX idx_company (company_id)
) ENGINE=InnoDB CHARACTER SET utf8mb4;
```

#### TABLE : `expenses`
```sql
CREATE TABLE expenses (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id      INT UNSIGNED NOT NULL,
  name            VARCHAR(255) NOT NULL DEFAULT 'Charge',
  monthly_amount  BIGINT DEFAULT 0,
  -- Coefficients de saisonnalité (JSON array de 12 valeurs, défaut 1 chaque)
  seasonality     JSON NOT NULL DEFAULT ('[]'),
  -- Taux de croissance An 1-5 (JSON array)
  inflation_growth JSON NOT NULL DEFAULT ('[]'),
  sort_order      SMALLINT DEFAULT 0,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  INDEX idx_company (company_id)
) ENGINE=InnoDB CHARACTER SET utf8mb4;
```

#### TABLE : `investments`
```sql
CREATE TABLE investments (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id       INT UNSIGNED NOT NULL,
  name             VARCHAR(255) NOT NULL DEFAULT 'Immobilisation',
  category         VARCHAR(255) NULL,
  amount           BIGINT DEFAULT 0,
  useful_life      SMALLINT DEFAULT 5,     -- Durée d'amortissement (ans)
  financed_equity  BIGINT DEFAULT 0,
  financed_loan    BIGINT DEFAULT 0,
  financed_grant   BIGINT DEFAULT 0,
  loan_rate        DECIMAL(6,2) DEFAULT 0, -- Taux d'intérêt (%)
  loan_years       SMALLINT DEFAULT 5,     -- Durée remboursement (ans)
  sort_order       SMALLINT DEFAULT 0,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  INDEX idx_company (company_id)
) ENGINE=InnoDB CHARACTER SET utf8mb4;
```

#### TABLE : `additional_fundings`
```sql
CREATE TABLE additional_fundings (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id   INT UNSIGNED NOT NULL,
  year_number  TINYINT NOT NULL,       -- 1 à 5
  equity       BIGINT DEFAULT 0,
  loan         BIGINT DEFAULT 0,
  loan_rate    DECIMAL(6,2) DEFAULT 0,
  loan_years   SMALLINT DEFAULT 1,
  grant        BIGINT DEFAULT 0,
  UNIQUE KEY uk_company_year (company_id, year_number),
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB CHARACTER SET utf8mb4;
```

#### TABLE : `activity_logs`
```sql
CREATE TABLE activity_logs (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  company_id    INT UNSIGNED NOT NULL,
  user_id       INT UNSIGNED NOT NULL,
  section       VARCHAR(50) NOT NULL,       -- 'entreprise', 'produits', etc.
  action        VARCHAR(30) NOT NULL,       -- 'update', 'add_row', 'delete_row'
  entity_type   VARCHAR(50) NULL,           -- 'product', 'material', etc.
  entity_id     INT UNSIGNED NULL,
  field_name    VARCHAR(100) NULL,          -- nom du champ modifié
  old_value     TEXT NULL,
  new_value     TEXT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_company_date (company_id, created_at DESC),
  INDEX idx_user (user_id)
) ENGINE=InnoDB CHARACTER SET utf8mb4;
```

### 6.3 Indexation et performance

**Index stratégiques :**
- `companies.project_id` : requête dashboard (toutes entreprises d'un projet)
- `activity_logs (company_id, created_at DESC)` : historique chronologique par entreprise
- `users.email` : login
- `products/materials/staff/expenses/investments.company_id` : chargement d'une entreprise

**Vue calculée — % complétion (optionnel en base) :**
Le pourcentage de complétion peut être calculé côté React au moment du chargement. Il n'est pas nécessaire de le stocker en base (trop couplé à la logique de l'interface).

**Choix BIGINT pour les montants :**
Les montants sont en Ariary (monnaie malgache). Les valeurs peuvent dépasser 2 milliards (INT max). BIGINT évite tout overflow. Pas de DECIMAL car les montants sont des entiers.

---

## 7. ARCHITECTURE API REST (SYMFONY)

### 7.1 Endpoints principaux

```
POST   /api/auth/login                → JWT token
GET    /api/auth/me                   → Profil utilisateur connecté

GET    /api/projects                  → Liste projets
POST   /api/projects                  → Créer un projet
PATCH  /api/projects/{id}             → Modifier un projet
DELETE /api/projects/{id}             → Supprimer un projet

GET    /api/projects/{id}/companies   → Entreprises d'un projet (dashboard)
POST   /api/projects/{id}/companies   → Créer une entreprise

GET    /api/companies/{id}            → Toutes données entreprise (chargement éditeur)
PATCH  /api/companies/{id}/meta       → Modifier identité entreprise
PATCH  /api/companies/{id}/settings   → Modifier paramètres financiers
DELETE /api/companies/{id}            → Supprimer

POST   /api/companies/{id}/products           → Ajouter un produit
PATCH  /api/products/{id}                     → Modifier un produit
DELETE /api/products/{id}                     → Supprimer
PATCH  /api/companies/{id}/products/reorder   → Réordonner

POST   /api/companies/{id}/materials          → (idem)
PATCH  /api/materials/{id}
DELETE /api/materials/{id}

POST   /api/companies/{id}/staff              → (idem)
PATCH  /api/staff/{id}
DELETE /api/staff/{id}

POST   /api/companies/{id}/expenses           → (idem)
PATCH  /api/expenses/{id}
DELETE /api/expenses/{id}

POST   /api/companies/{id}/investments        → (idem)
PATCH  /api/investments/{id}
DELETE /api/investments/{id}

PATCH  /api/companies/{id}/additional-funding → Mise à jour apports complémentaires

GET    /api/companies/{id}/activity           → Historique modifications (50 dernières)

GET    /api/users                             → Liste utilisateurs (pour afficher qui a modifié)
```

### 7.2 Format de réponse — Chargement d'une entreprise

```json
GET /api/companies/{id}
{
  "id": 1,
  "project": { "id": 1, "name": "Seza" },
  "meta": {
    "name": "Fabricateur des meubles",
    "secteur": "Menoiserie",
    "promoteur": "Mr Jean",
    "devise": "Ar"
  },
  "settings": { "infl2": 3, "infl3": 3, ... },
  "products": [ { "id": 1, "name": "Meuble salon", "price": 500000, "monthlyQty": [...], "growthRates": [...] } ],
  "materials": [ ... ],
  "staff": [ ... ],
  "expenses": [ ... ],
  "investments": [ ... ],
  "additionalFunding": [ { "yearNumber": 1, "equity": 0, ... }, ... ],
  "lastModifiedBy": { "id": 2, "firstName": "Hery", "lastName": "Rakoto" },
  "updatedAt": "2026-05-11T10:30:00Z"
}
```

---

## 8. ARCHITECTURE FRONTEND (REACT)

### 8.1 Flux de données et gestion d'état

```
AuthStore (Zustand)
  └── user: { id, email, firstName, lastName }
  └── token: string (JWT, stocké en memory + cookie httpOnly)

CompanyStore (Zustand)
  └── company: CompanyData | null      ← données brutes depuis API
  └── results: CompanyResults | null   ← calculé localement
  └── saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  └── actions: loadCompany(), patchField(), addRow(), deleteRow()
```

### 8.2 Logique de sauvegarde automatique (hook custom)

```typescript
// useAutoSave.ts
function useAutoSave(sectionKey: string, data: any, companyId: number) {
  const debouncedData = useDebounce(data, 400);

  useEffect(() => {
    setSaveStatus('saving');
    api.patch(`/companies/${companyId}/${sectionKey}`, debouncedData)
       .then(() => setSaveStatus('saved'))
       .catch(() => setSaveStatus('error'));
  }, [debouncedData]);
}
```

### 8.3 Portage des calculs en TypeScript

Le fichier `calculations.ts` sera une traduction directe de la fonction `calcCompany()` du HTML. Toutes les formules seront identiques, avec typage TypeScript :

```typescript
interface CompanyData {
  meta: CompanyMeta;
  settings: CompanySettings;
  products: Product[];
  materials: Material[];
  staff: StaffMember[];
  expenses: Expense[];
  investments: Investment[];
  additionalFunding: AdditionalFunding[];
}

interface CompanyResults {
  revenue: number[];           // [An1, An2, An3, An4, An5]
  variableCosts: number[];
  personnel: number[];
  otherExpenses: number[];
  depreciation: number[];
  ebitda: number[];
  ebit: number[];
  interestCharges: number[];
  ebt: number[];
  tax: number[];
  netIncome: number[];
  opCashFlow: number[];
  cashCum: number[];
  caMonthly: number[];         // [Jan..Déc] An 1
  treasuryMonthly: number[];
  van: number;
  tri: number;
  payback: number | null;
  breakEven: number;
  marginRate: number;
  // ...
}

function calcCompany(c: CompanyData): CompanyResults { ... }
```

### 8.4 Gestion de la complétion

```typescript
function calcCompletion(company: CompanyData): number {
  let filled = 0, total = 0;

  // Identité
  ['name','secteur','promoteur'].forEach(f => {
    total++;
    if (company.meta[f]) filled++;
  });

  // Produits (au moins 1 avec données)
  total += 2;
  if (company.products.length > 0) filled++;
  if (company.products.some(p => p.price > 0 && p.monthlyQty.some(v => v > 0))) filled++;

  // Matières
  total += 1;
  if (company.materials.some(m => m.unitCost > 0)) filled++;

  // Personnel
  total += 1;
  if (company.staff.some(s => s.monthlySalary > 0)) filled++;

  // Investissements
  total += 1;
  if (company.investments.some(i => i.amount > 0)) filled++;

  return Math.round((filled / total) * 100);
}
```

---

## 9. CALCULS FINANCIERS — STRATÉGIE DE MIGRATION

### 9.1 Approche retenue : Calculs côté client uniquement

Les calculs restent **100% côté React (JavaScript/TypeScript)**. La base de données ne stocke que les **données de saisie brutes**. Les résultats (CA, résultat net, trésorerie, VAN, TRI…) sont calculés dynamiquement après chaque chargement ou modification.

**Avantages :**
- Instantané (pas d'aller-retour serveur pour recalculer)
- Fidélité parfaite aux formules existantes
- Pas de risque d'incohérence entre données stockées et calculées

**Structure du calcul dans React :**
```typescript
// Dans le store ou un useMemo
const results = useMemo(() => calcCompany(company), [company]);
```

### 9.2 Données affichées sur le dashboard (sans recalcul complet)

Pour le dashboard, on affiche un **résumé léger** sans charger toute la donnée. Options :
- Soit stocker les KPI clés (CA An1, Résultat net An1) en table `company_snapshots` mise à jour après chaque save
- Soit calculer en PHP côté Symfony à la demande pour le dashboard

**Recommandation :** Table `company_snapshots` avec les 3-4 KPI essentiels, mise à jour automatiquement par le backend à chaque PATCH de données.

```sql
CREATE TABLE company_snapshots (
  company_id      INT UNSIGNED PRIMARY KEY,
  revenue_y1      BIGINT DEFAULT 0,
  net_income_y1   BIGINT DEFAULT 0,
  cash_cum_y1     BIGINT DEFAULT 0,
  break_even      BIGINT DEFAULT 0,
  completion_pct  TINYINT DEFAULT 0,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);
```

---

## 10. RECOMMANDATIONS & PROCHAINES ÉTAPES

### 10.1 Ordre de développement recommandé

**Étape 1 — Fondations (Semaine 1)**
- Créer le projet Symfony + React (monorepo ou repos séparés)
- Configurer MySQL, les entités Doctrine, les migrations
- Implémenter l'authentification JWT (login/logout)
- Créer les utilisateurs de base en base de données

**Étape 2 — API Backend (Semaines 2-3)**
- Implémenter tous les endpoints CRUD (projets, entreprises, sous-entités)
- Ajouter la journalisation d'activité automatique dans les controllers
- Tests des endpoints avec Postman/Insomnia

**Étape 3 — Dashboard React (Semaine 4)**
- Interface de login
- Dashboard avec liste de projets et entreprises
- Modal de création projet/entreprise
- Navigation vers l'éditeur

**Étape 4 — Éditeur et sections (Semaines 5-7)**
- Layout éditeur (sidebar + topbar + contenu)
- Chaque section dans l'ordre : Entreprise → Produits → Matières → Personnel → Charges → Investissements
- Tableaux dynamiques (add/delete row)
- Sections de résultats (lecture seule, calculées)

**Étape 5 — Finalisation (Semaine 8)**
- Sauvegarde automatique + notifications toast
- Mode sombre/clair
- Export Excel (xlsxjs côté React)
- Tests utilisateurs + corrections

### 10.2 Décisions techniques à prendre

| Question | Recommandation |
|---|---|
| Authentification | JWT (LexikJWTBundle) — stateless, adapté SPA |
| Stockage JWT côté client | Cookie httpOnly (sécurisé) ou localStorage (simple mais moins sécurisé) |
| Calculs backend pour dashboard | Table `company_snapshots` — simple et performant |
| Gestion état React | Zustand — léger, simple, adapté |
| Routing React | React Router v6 |
| HTTP client | Axios |
| Notifications | react-hot-toast |
| Tableaux de données | Composants custom (pas de lib externe — style fidèle au HTML) |
| Environnement | Docker (PHP + MySQL + Nginx) pour reproductibilité |

### 10.3 Questions à clarifier avant de démarrer le code

1. **Hébergement** : Serveur dédié ? VPS ? Hébergement partagé PHP ? (impact sur le déploiement Symfony)
2. **Nombre d'utilisateurs** : Combien d'utilisateurs simultanés attendus ? (dimensionnement serveur)
3. **Création d'utilisateurs** : Auto-inscription ouverte ? Ou administrateur qui crée les comptes manuellement ?
4. **Export PDF** : Est-ce qu'un export PDF du business plan est prévu ? (nécessite une lib supplémentaire)
5. **Langue** : L'application reste entièrement en français ?
6. **Devise** : Uniquement Ariary (Ar) ou multi-devises ?
7. **Logo** : Le logo `logo-aides.jpg` doit être intégré dans les assets du projet

---

## ANNEXE — Correspondance Données HTML → Tables MySQL

| Objet JSON (HTML) | Table MySQL | Remarques |
|---|---|---|
| `APP.companies[i].meta` | `companies` | name, secteur, promoteur → colonnes directes |
| `APP.companies[i].settings` | `company_settings` | 1:1 avec companies |
| `APP.companies[i].products[j]` | `products` | monthly[] et growth[] → colonnes JSON |
| `APP.companies[i].materials[j]` | `materials` | idem |
| `APP.companies[i].staff[j]` | `staff_members` | |
| `APP.companies[i].expenses[j]` | `expenses` | seasonality[] → JSON |
| `APP.companies[i].investments[j]` | `investments` | |
| `APP.companies[i].additionalFunding[y]` | `additional_fundings` | 5 lignes par company |
| `APP.companies[i].results` | Calculé côté client | Jamais stocké en base |
| `USERS` (simulé HTML) | `users` | Avec vrai hash bcrypt |
| Historique activité (simulé) | `activity_logs` | Persisté en base |

---

*Document généré automatiquement — Business Plan AIDES Full Stack Analysis*
*Prêt pour discussion et démarrage du développement*
