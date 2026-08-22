# Journal des modifications

L'application est en production avec des données réelles en base. Règles suivies à partir de maintenant :

- Toute modification de schéma (nouvelle table, nouvelle colonne, changement de type...) est **toujours** accompagnée d'une migration Doctrine dans `business-plan-api/migrations/`, écrite de façon idempotente (vérifie si la colonne/table existe déjà avant de la créer) pour rester compatible avec les données déjà en base.
- Chaque changement notable (backend, base de données, ou autre impact utilisateur) est résumé ci-dessous, du plus récent au plus ancien.

---

## 2026-07-27

**Backend + Frontend — Correction d'un déséquilibre Actif/Passif dans le Bilan prévisionnel**
- Bug corrigé : le "Total investissement non amorti" (terrains) et le "Fonds de roulement initial" étaient comptés côté Actif (via la Trésorerie, qui les intègre dans la trésorerie initiale) mais pas reconstitués côté Passif (Capitaux propres) — ce qui créait un écart Actif ≠ Passif permanent et faussait la ligne de vérification d'équilibre.
- `BalanceSection.tsx` : le "Total investissement non amorti" (terrains) et le "Fonds de roulement initial" sont désormais ajoutés au calcul des capitaux propres (`capitalPropres`), avec une ligne dédiée dans le détail "Capitaux propres" (affichée seulement si le montant est positif). Logique : un terrain ou un fonds de roulement financés sur fonds propres au départ doivent se retrouver dans les capitaux propres au même titre que les apports, sinon le Passif est sous-évalué par rapport à l'Actif qui, lui, les compte dans la trésorerie initiale.
- `ExportSection.tsx`, feuille "Bilan" : même correction appliquée à l'export Excel (`buildBalanceSheet` reçoit désormais `investmentTerrains` et `settings` pour recalculer le fonds de roulement et l'investissement non amorti côté capitaux propres).
- Aucun impact base de données — recalcul uniquement, aucune donnée stockée n'est modifiée.

**Frontend — Export Excel : compléments Terrain et Fonds de roulement**
- `ExportSection.tsx`, feuille "Données de base" : ajout d'un tableau listant les investissements non amortissables (terrains), avec leur montant.
- Feuille "Synthèse" : ajout du total investissement non amorti (terrains) dans les totaux d'investissement.
- Feuille "Trésorerie mensuelle" et feuille "Plan de financement" : la trésorerie initiale (An 0) intègre désormais le fonds de roulement initial (`settings.fondsRoulement`) en plus des fonds propres/subventions/emprunts des investissements, cohérent avec le calcul déjà utilisé dans l'application.
- Feuille "Emprunts" : ajout d'une colonne "Solde restant dû" (capital restant dû par emprunt et par année), en plus de "Capital remboursé" et "Intérêts payés" déjà présents.

## 2026-07-22

**Frontend — Réorganisation de la section Investissements & Financement**
- `InvestmentsSection.tsx` : le bloc "Investissement non amortissables" (terrains) est désormais affiché au-dessus du tableau général des investissements amortissables, avec son propre titre ("Investissement non amortissables" / "Investissement amortissables") — auparavant les deux tableaux n'étaient pas clairement distingués visuellement.
- Retrait du sous-titre et du bouton d'aide spécifiques au bloc Terrain (redondants avec l'aide générale de la section).
- Cartes KPI ajoutées et repositionnées en tête de section : "Fonds propres total" (fonds propres des investissements amortis + total terrain), "Total investissement non amorti" (terrains), "Total investissement amorti" (renommé depuis "Total investissement"), "Total fonds propres amorti".
- Ajout d'un bouton unique "Enregistrer tout" en haut de la barre d'ajout (au-dessus des deux tableaux), avec confirmation visuelle (icône + libellé "Enregistré !" pendant 3 secondes) — sauvegarde en une fois les investissements amortissables et les terrains.
- Aucun impact backend/base de données — réorganisation d'affichage uniquement.

## 2026-07-20

**Frontend — Correction de la sélection de texte dans les champs numériques (4 chiffres et plus)**
- Bug corrigé : cliquer dans un champ numérique affichant un nombre avec séparateur de milliers (ex: "5 000 000", à partir de 4 chiffres) ne sélectionnait pas correctement le texte au focus — le `select()` s'exécutait avant que le passage à l'affichage brut (sans séparateur) soit rendu dans le DOM par React, sélectionnant alors l'ancien texte formaté.
- `NumInput.tsx` (`handleFocus`) : le `select()` est désormais différé via `requestAnimationFrame`, exécuté juste après le rendu du texte brut — sélection correcte quelle que soit la taille du nombre, imperceptible pour l'utilisateur (< 16ms).

**Frontend — Correction d'une requête réseau inutile à chaque perte de focus**
- Bug corrigé : une requête PATCH partait vers le serveur à chaque fois qu'un champ numérique perdait le focus (`blur`), même sans aucune modification de valeur (ex: simple tabulation d'un champ à l'autre) — impact sur Produits, Matières premières, Charges, Personnel, Investissements.
- `NumInput.tsx` (`handleBlur`) : la sauvegarde (`onBlur`) n'est désormais déclenchée que si la valeur saisie diffère réellement de la valeur d'origine (`defaultValue`). Aucun impact fonctionnel, réduction du nombre de requêtes réseau et des écritures en base inutiles.

## 2026-07-09

**Frontend — Tableau de bord : filtre par plage de pourcentage sur "Complétion"**
- Nouveau composant réutilisable `components/ui/RangeFilterDropdown.tsx` : icône entonnoir dans l'en-tête de colonne, popover avec deux champs Min / Max et boutons "OK" / "Effacer" — même logique de fermeture au clic extérieur que les filtres Excel-style déjà existants (`ColumnFilterDropdown.tsx`).
- Intégré sur la colonne "Complétion" du tableau du tableau de bord (`ProjectCard.tsx`), permettant de filtrer les entreprises par plage de pourcentage de complétion.
- Ajustements de mise en page demandés : champs Min/Max empilés verticalement (au lieu de côte à côte), largeur des champs fixée à 81 %, sélection automatique du contenu au focus (`onFocus` → `select()`).
- Aucun impact backend/base de données.

## 2026-07-06

**Backend + Frontend — Nouvelle fonctionnalité : Investissement Terrain**
- Nouvelle table dédiée `investment_terrains`, séparée du tableau général des investissements : un terrain ne s'amortit pas (aucune durée d'amortissement) et n'a pas de plan de financement (fonds propres / subvention / emprunt), sans lien avec le calcul de trésorerie — uniquement désignation + montant.
- Migration `Version20260706000000.php` : création de la table (idempotente, `CREATE TABLE IF NOT EXISTS`), avec FK vers `companies` (`ON DELETE CASCADE`).
- Migration `Version20260706000001.php` (suivi) : simplification — suppression des colonnes de financement (`financed_equity`, `financed_loan`, `financed_grant`, `loan_rate`, `loan_years`) initialement créées puis retirées après retour utilisateur, ces champs n'ayant pas de lien avec la trésorerie. Idempotente (vérifie l'existence de chaque colonne avant suppression).
- Backend : `Entity/InvestmentTerrain.php` (nom + montant + tri), `Repository/InvestmentTerrainRepository.php`, managers et controllers CRUD dédiés (`Create`/`Update`/`DeleteInvestmentTerrainController`/`Manager`), entité `Company` liée en `OneToMany`, `GetCompanyController` et `DuplicateCompanyManager` mis à jour pour inclure les terrains.
- Frontend : nouveau tableau "Investissement non amortissables" dans `InvestmentsSection.tsx` (désignation + montant uniquement), types/API/offlineApi/companyStore mis à jour, tableau intégré au calcul du Bilan (Actif et Capitaux propres) et à l'export Excel.
- **Pour appliquer en production : exécuter `php bin/console doctrine:migrations:migrate` après déploiement du nouveau code backend.**

## 2026-07-05

**Frontend — Nouvelle colonne "Créé par" dans le tableau du tableau de bord, avec filtre**
- `ProjectCard.tsx` (vue tableau) : ajout d'une colonne "Créé par" distincte de "Modifié par" (qui reste inchangée), affichant l'utilisateur qui a créé l'entreprise. Filtre Excel-style (checkboxes) ajouté, identique à ceux déjà existants sur Entreprise/Secteur/Promoteur/Statut.
- Aucun changement backend : la donnée `createdBy` était déjà renvoyée par l'API et utilisée en interne (badge "Moi"), simple ajout d'affichage + filtre côté frontend.

**Frontend — Un nouvel élément ajouté (Produits, Matières, Personnel, Charges, Investissements) apparaît désormais en tête de liste**
- Jusqu'ici, cliquer sur "Ajouter" plaçait le nouvel élément en bas de la liste déjà saisie.
- Backend : les 5 managers de création (`CreateProductManager`, `CreateMaterialManager`, `CreateStaffMemberManager`, `CreateExpenseManager`, `CreateInvestmentManager`) attribuaient un `sortOrder` = max existant + 1 (fin de liste). Ils attribuent maintenant `sortOrder` = min existant − 1 (les listes étant triées par `sortOrder` croissant), ce qui place le nouvel élément en tête, de façon persistante après rechargement. Nouvelle méthode `findMinSortOrderByCompany()` ajoutée aux 5 repositories concernés. **Aucune migration nécessaire** (la colonne `sortOrder` existe déjà) — changement de logique uniquement.
- Frontend : `companyStore.ts` — `addProduct/addMaterial/addStaffMember/addExpense/addInvestment` insèrent désormais le nouvel élément en tête du tableau local (au lieu de le pousser en fin), pour un affichage immédiat cohérent, sans attendre un rechargement serveur.

**Frontend — Charges d'exploitation : mode "même quantité tous les mois"**
- Ajout d'un interrupteur "Quantité différente par mois" sur la ligne Quantité (ex-Saisonnalité), symétrique à celui déjà existant sur le Montant : activé, une seule saisie s'applique aux 12 mois ; désactivé, saisie mois par mois comme avant. Les nouvelles charges démarrent avec ce mode uniforme activé (quantité = 1 sur les 12 mois).

**Backend + Frontend — Charges d'exploitation : montant mensuel (Jan-Déc), quantité relabellisée, sans perte de données**
- Même principe que pour Produits (prix) et Matières premières (coût) : le montant d'une charge peut désormais varier selon le mois (ex. facture d'électricité plus élevée en saison sèche).
- **Aucune donnée perdue** : la colonne `monthly_amount` existante devient le montant de **Janvier**, inchangé. La colonne `seasonality` (déjà un tableau de 12 valeurs) n'est **pas touchée** — ni sa structure ni ses valeurs — elle est seulement renommée "Quantité" dans l'interface (le montant mensuel et la quantité se multiplient désormais mois par mois pour donner la charge mensuelle, au lieu de montant unique × somme des coefficients).
- Migration `Version20260703000001.php` (idempotente) : ajoute `monthly_amount_m2` à `monthly_amount_m12` (BIGINT NOT NULL DEFAULT 0) sur `expenses`, démarrant à 0 (à saisir). **Pour appliquer en production : exécuter `php bin/console doctrine:migrations:migrate`.**
- `Expense.php` : `getMonthlyAmounts()`/`setMonthlyAmounts()` ; `getAnnualTotal()` recalculé mois par mois (montant[mois] × quantité[mois]) au lieu de montant unique × somme des quantités.
- Controllers/Managers Expense : le corps de requête utilise désormais `monthlyAmounts` (tableau) ; `monthlyAmount` (singulier) reste accepté en entrée pour rétro-compatibilité (ne touche que Janvier).
- `DuplicateCompanyManager.php` : corrige la duplication d'entreprise pour copier les 12 mois du montant (au lieu de Janvier seul).
- `ExpensesSection.tsx` : montant mensuel éditable (mode uniforme ou détaillé par mois, comme Produits/Matières), ligne "Quantité" (ex-Saisonnalité) et ligne "Charge mensuelle" calculée affichée pour vérification visuelle.
- **Correction du bug de saisie signalé** ("parfois ça bug un peu") : les modifications de montant, quantité et croissance passent maintenant par une file d'attente par charge (identique à la correction déjà faite sur Produits/Matières), qui empêche qu'une sauvegarde plus lente n'écrase, avec un instantané périmé, une modification plus récente lors d'une saisie rapide sur plusieurs mois.
- `ExportSection.tsx` : le tableau "Charges d'exploitation" affiche désormais la quantité et le montant mois par mois (35 colonnes, même mise en page que Produits/Matières) ; le "Coût An 1" est une valeur précalculée (le montant variant par mois, ce n'est plus une simple formule prix×total) ; la ligne "Charges d'exploitation" de la Trésorerie mensuelle utilise aussi la valeur précalculée au lieu d'une formule Excel qui référençait l'ancienne colonne "montant unique" (supprimée).

## 2026-07-03

**Frontend — Correction d'un rechargement prématuré au retour de connexion (le vrai bug signalé)**
- Cause : `EditorPage.tsx` (page d'édition d'une entreprise) recharge les données serveur dès que `isOnline` repasse à `true`. Mais dans `syncService.ts`, `syncInProgress` ne passait à `true` qu'~800ms plus tard (délai de stabilisation avant `processSyncQueue()`). Pendant cette fenêtre, la page voyait `isOnline=true` et `syncInProgress=false` en même temps → elle rechargeait immédiatement les **anciennes données du serveur** (sans les modifications hors-ligne pas encore envoyées), écrasant l'affichage local. Pire : un premier `useEffect` dépendait indirectement de `isOnline` et déclenchait en plus un `resetCompany()` (efface tout) avant de recharger.
- `stores/networkStore.ts` : nouveau flag `reconnecting`, mis à `true` de façon synchrone dès l'instant du retour en ligne (avant même `setOnline(true)`), et remis à `false` seulement après la fin réelle de `processSyncQueue()`.
- `services/syncService.ts` (`handleOnline`) : pose `reconnecting=true` avant `setOnline(true)`, le remet à `false` dans un `finally` après la synchronisation.
- `pages/EditorPage.tsx` : l'effet de chargement initial ne dépend plus que de `companyId` (ne se redéclenche plus à chaque bascule réseau) ; l'effet de rechargement post-reconnexion attend en plus `!reconnecting`.
- `pages/DashboardPage.tsx` : même correction par précaution (chargement initial isolé du réseau + rechargement post-sync protégé).
- Aucun impact backend/base de données.

**Frontend — Correction d'une perte de saisie en cas de coupure réseau**
- Cause : la détection "en ligne" (`navigator.onLine` + events navigateur) ne détecte que l'état de l'interface réseau (Wi-Fi/Ethernet), pas une vraie coupure Internet/serveur (Wi-Fi qui reste "connecté" mais serveur injoignable, serveur down, portail captif...). Dans ce cas l'app pensait être en ligne, tentait un appel serveur qui échouait réellement, et cet échec n'était intercepté nulle part : la donnée n'était écrite ni sur le serveur (requête en échec) ni en local (le code de sauvegarde hors-ligne était dans la branche jamais atteinte) — la saisie disparaissait silencieusement.
- `api/offlineApi.ts` : nouvelle fonction `withOfflineFallback()` utilisée par toutes les entités (produits, matières, personnel, charges, investissements, apports, entreprise, paramètres) — si l'appel "en ligne" échoue pour une vraie raison réseau (pas une erreur serveur du type validation/session expirée, qui elle continue de remonter normalement), on bascule automatiquement sur l'écriture locale + la mise en file d'attente, et on corrige l'état réseau affiché.
- `components/ui/SyncIndicator.tsx` : le badge "Hors ligne" est maintenant cliquable pour relancer manuellement une tentative de synchronisation (utile si l'app reste marquée hors-ligne après une coupure serveur ponctuelle, faute d'event navigateur pour la remettre en ligne automatiquement).
- Limite connue non traitée ici : la détection reste basée sur les events navigateur (pas de ping serveur périodique actif) — une coupure "silencieuse" (Wi-Fi qui reste affiché comme connecté) peut laisser l'app croire à tort qu'elle est en ligne jusqu'à la prochaine tentative de sauvegarde. Le clic manuel ci-dessus permet de forcer une nouvelle tentative en attendant. Aucun impact backend/base de données.

**Frontend — Correction d'une course de données sur les grilles mensuelles (Produits, Matières)**
- Bug corrigé : en saisissant rapidement plusieurs cases d'une même ligne (ex : plusieurs mois de quantité à la suite), les sauvegardes automatiques de chaque case partaient en parallèle. Si l'une d'elles revenait plus tard avec un instantané pris avant la modification d'une autre case, elle écrasait cette dernière — donnant l'impression qu'une valeur "réapparaissait" ou se réinitialisait sans saisie.
- `ProductsSection.tsx` et `MaterialsSection.tsx` : les sauvegardes d'un même produit/matière (quantité, prix/coût, croissance) passent maintenant par une file d'attente — chaque modification attend que la précédente soit bien enregistrée avant de relire l'état à jour et d'envoyer la sienne. Aucun impact backend/base de données.

**Backend + Base de données — Coût des matières premières devenu mensuel (même principe que les produits)**
- Migration `business-plan-api/migrations/Version20260703000000.php` : ajoute 11 colonnes `unit_cost_m2`..`unit_cost_m12` (BIGINT NOT NULL DEFAULT 0) sur `materials`. Idempotente. La colonne existante `unit_cost` (Janvier) n'est pas touchée — aucune donnée existante perdue. Les 11 nouveaux mois démarrent à 0.
- `Entity/Material.php` : nouvelles propriétés `unitCostM2`..`unitCostM12` + `getMonthlyUnitCosts()`/`setMonthlyUnitCosts()`. `getUnitCost()`/`setUnitCost()` (Janvier) conservés pour rétro-compatibilité. `getTotalAnnualCost()` ne tronque plus en entier (quantité décimale autorisée).
- Calcul des coûts variables changé aux deux endroits où il existait en double (`UpdateCompanySnapshotManager.php` et `calculations.ts`) : passe de `quantité totale × coût unique` à `Σ (quantité du mois × coût du mois)`. La croissance continue de ne s'appliquer qu'à la quantité ; le profil de coût mensuel se répète à l'identique chaque année.
- Contrats API : `unitCost` (scalaire) remplacé par `monthlyUnitCost` (tableau de 12) dans les réponses/payloads de `CreateMaterialController`, `UpdateMaterialController`, `GetCompanyController`.
- **Bug corrigé au passage** : `DuplicateCompanyManager.php` (fonction "Dupliquer l'entreprise") ne copiait que le prix/coût de Janvier pour les produits ET les matières (`setPrice()`/`setUnitCost()`) — une régression introduite par le passage au mensuel, qui aurait fait perdre les mois de Février à Décembre à chaque duplication. Corrigé pour utiliser `setMonthlyPrices()`/`setMonthlyUnitCosts()`.
- **Pour appliquer en production : exécuter `php bin/console doctrine:migrations:migrate` après déploiement du nouveau code backend.**

**Frontend — Grille de coût mensuel + quantité décimale (Matières premières)**
- `types/index.ts`, `api.ts`, `offlineApi.ts` : `Material.unitCost: number` remplacé par `Material.monthlyUnitCost: number[]`.
- `MaterialsSection.tsx` : le coût unitaire devient une ligne de grille sur 12 mois (interrupteur "Même coût toute l'année", indépendant de celui de la quantité, comme pour les produits). La quantité accepte désormais les décimales (ex : 2,75), avec le même comportement que les produits (séparateur de milliers, pas de flèches clavier — cf. changements précédents).
- `ExportSection.tsx` : la feuille "Données de base", tableau "Matières premières", passe de 24 à 35 colonnes (aligné sur le tableau produits) avec le détail des 12 coûts mensuels. Le "Coût An 1" et les coûts variables mensuels (feuille "Trésorerie mensuelle") utilisent la valeur précalculée par l'application plutôt qu'une formule Excel `coût × total` (qui supposait un coût unique).

**Frontend — Suppression du prix moyen (app + export Excel)**
- `ProductsSection.tsx` : retrait de la cellule "moy. X Ar" (colonne Total de la ligne Prix unitaire/mois) et de la fonction devenue inutile.
- `ExportSection.tsx`, feuille "Données de base" : retrait de la colonne "Prix moy. (Ar)". Le tableau produits passe de 36 à 35 colonnes ; toutes les colonnes suivantes (quantités, prix mensuels, CA An 1-5) se décalent d'une position automatiquement. Aucun impact backend/base de données.

**Frontend — Séparateur de milliers pendant la saisie (montants/quantités)**
- `components/ui/NumInput.tsx` : rendu compatible `ref` (forwardRef), export de `parseFormattedNum` (parsing partagé pour les grilles qui lisent des valeurs via ref).
- `ProductsSection.tsx` (prix + quantité) et `MaterialsSection.tsx` (quantité) : les champs bruts `<input type="number">` sont remplacés par `NumInput`, qui affiche un séparateur de milliers pendant la saisie (ex : "3 000") et repasse en saisie brute au focus pour une édition simple.
- Personnel, Charges, Investissements, Paramètres avaient déjà `NumInput` sur leurs champs de montants — rien à changer là. Les champs non concernés (pourcentages, effectifs, durées, saisonnalité) restent des champs numériques simples, les milliers n'y ayant pas de sens. Aucun impact backend/base de données.

**Frontend — Prix moyen pondéré au lieu de simple moyenne (Produits)**
- `ProductsSection.tsx` et `ExportSection.tsx` : le "Prix moy." affiché était une simple moyenne arithmétique des 12 prix mensuels, ce qui ne correspond pas au vrai CA dès qu'un mois à faible quantité a aussi un prix différent (ex : décembre avec 30 unités à 500 Ar au lieu de ~3000 à 600 Ar) — "moyenne × quantité totale" divergeait alors fortement du vrai total. Remplacé par une moyenne pondérée (CA ÷ quantité totale), qui recolle avec le total réel. Aucun impact backend/base de données.

**Frontend — Export Excel : détail des prix mensuels (Données de base)**
- `ExportSection.tsx`, feuille "Données de base", tableau "Produits & Ventes" : ajout de 12 colonnes (Janvier à Décembre) affichant le prix de chaque mois, en plus des 12 colonnes de quantité déjà présentes. La colonne "Prix moy. (Ar)" est conservée comme repère rapide.
- Le tableau produits passe de 24 à 36 colonnes ; les colonnes CA An 1 à An 5 se décalent en conséquence (calcul automatique, aucune action requise). Le tableau "Matières premières" et les autres tableaux de la feuille ne sont pas affectés (layout inchangé, référencé indépendamment). Aucun impact backend/base de données.

**Frontend — Bouton "Aide" mis en valeur (toutes les sections)**
- `components/ui/HelpButton.tsx` : redessiné en bouton coloré (fond vert, couleur principale) avec icône + texte "Aide", au lieu d'un petit cercle gris avec juste "?".
- 11 sections de l'éditeur (Produits, Paramètres, Matières premières, Personnel, Charges, Investissements, Plan de financement, Compte de résultat, Trésorerie, Bilan, Rentabilité) : position conservée à droite du titre de section (essai à gauche annulé sur demande). Aucun impact backend/base de données.

**Frontend — Suppression des flèches stepper sur tous les champs numériques**
- `src/styles/globals.css` : règle globale `input[type="number"]` — retire les petites flèches haut/bas natives du navigateur sur tous les champs numériques de l'application (prix, quantités, taux, etc.). Champ visuellement normal. Aucun impact backend/base de données.

**Backend + Frontend — Quantité mensuelle des produits en décimal**
- Aucune migration nécessaire (le stockage `monthly_qty` est déjà en JSON, sans contrainte de type entier).
- `Entity/Product.php` : `getTotalAnnualQty()` ne tronque plus le total en entier (retour `int|float`).
- `Manager/Company/UpdateCompanySnapshotManager.php` : le calcul du CA (dashboard) ne caste plus la quantité en `int` avant multiplication ; le CA final est arrondi à l'entier au moment du stockage (l'Ariary n'a pas de centimes), pas avant.
- `ProductsSection.tsx` : les champs de quantité (mode uniforme et par mois) utilisent `parseFloat` au lieu de `parseInt`, pas de saisie `0.01` — accepte des décimales libres (ex : 2.75). Le prix reste un entier (non concerné par cette demande).
- `ExportSection.tsx` : format Excel des cellules de quantité produits passé de `#,##0` à `#,##0.##` pour afficher les décimales.
- **Portée volontairement limitée aux produits** — les quantités de matières premières (`MaterialsSection.tsx`) ont le même fonctionnement mais restent des entiers, à la demande explicite de l'utilisateur.

## 2026-07-02

**Backend + Base de données — Prix des produits devenu mensuel (variation saisonnière)**
- Migrations `business-plan-api/migrations/Version20260702000001.php` : ajoute 11 colonnes `price_m2`..`price_m12` (BIGINT NOT NULL DEFAULT 0) sur `products`. Idempotente (vérifie chaque colonne avant ajout).
- La colonne existante `price` (Janvier) n'est **pas touchée** — aucune donnée existante perdue. Les 11 nouveaux mois démarrent à 0 (choix assumé) : le CA affiché après migration reflète uniquement le prix de Janvier tant que l'utilisateur n'a pas rempli les autres mois.
- `Entity/Product.php` : nouvelles propriétés `priceM2`..`priceM12` + méthodes `getMonthlyPrices()`/`setMonthlyPrices()` (tableau de 12 valeurs, whitelist/validation dans le setter). `getPrice()`/`setPrice()` (Janvier) conservés tels quels pour rétro-compatibilité.
- Calcul du CA changé partout où il existait en double : `Manager/Company/UpdateCompanySnapshotManager.php` (backend, dashboard) et `calculations.ts` (frontend) passent de `quantité totale × prix unique` à `Σ (quantité du mois × prix du mois)` sur les 12 mois. La croissance (`growthRates`) continue de ne s'appliquer qu'à la quantité ; le profil de prix mensuel se répète à l'identique chaque année (An 1 à An 5).
- Contrats API : `price` (scalaire) remplacé par `monthlyPrice` (tableau de 12) dans les réponses/payloads de `CreateProductController`, `UpdateProductController`, `GetCompanyController`.
- **Pour appliquer en production : exécuter `php bin/console doctrine:migrations:migrate` après déploiement du nouveau code backend.**

**Frontend — Grille de prix mensuel + export Excel**
- `types/index.ts`, `api.ts`, `offlineApi.ts` : `Product.price: number` remplacé par `Product.monthlyPrice: number[]`.
- `ProductsSection.tsx` : le prix unitaire n'est plus un champ unique — il devient une ligne de grille sur 12 mois, avec un interrupteur "Même prix toute l'année" (mode uniforme) indépendant de celui déjà existant pour la quantité. La ligne "CA mensuel" est recalculée automatiquement (prix du mois × quantité du mois).
- `ExportSection.tsx` : la colonne "Prix (Ar)" devient "Prix moy. (Ar)" (indicatif). Le CA An 1 (feuille "Données de base") et les encaissements mensuels (feuille "Trésorerie mensuelle") ne sont plus recalculés par une formule Excel `prix × quantité` (qui supposait un prix unique) mais utilisent la valeur précalculée par l'application, exacte même si le prix varie par mois. Léger compromis : ces cellules ne se recalculent plus automatiquement si l'utilisateur modifie les quantités directement dans le fichier Excel exporté.

**Backend + Base de données — "Modèle économique" devient un choix multiple**
- Migration `business-plan-api/migrations/Version20260702000000.php` : élargit la colonne `companies.modele_economique` de `VARCHAR(20)` à `VARCHAR(50)`. Idempotente (vérifie la longueur actuelle avant modification).
- Stockage en CSV via le type Doctrine `simple_array` (ex : `"production,service"`) — **aucune donnée existante n'est perdue ou modifiée** : une valeur simple déjà en base (`"production"` ou `"service"`) est relue automatiquement comme un tableau à un seul élément.
- `Entity/Company.php` : `modeleEconomique` passe de `?string` à `?array`, avec whitelist appliquée dans le setter.
- `Controller/Company/GetCompanyController.php`, `UpdateCompanyMetaController.php`, `Manager/Company/UpdateCompanyMetaManager.php` : adaptés pour lire/écrire un tableau.
- **Pour appliquer en production : exécuter `php bin/console doctrine:migrations:migrate` après déploiement du nouveau code backend.**
- Point d'attention mineur : une requête de synchro *offline* déjà en attente (créée avec l'ancienne version de l'app, avant ce déploiement) enverra l'ancien format (chaîne) ; le backend l'ignore proprement (aucune erreur) mais la valeur ne sera pas appliquée — cas très marginal (utilisateur hors-ligne avec une modification non synchronisée pile au moment du déploiement).

**Frontend — "Modèle économique" en cases à cocher**
- `SettingsSection.tsx` : le champ passe de boutons radio (choix unique) à des cases à cocher (choix multiple).
- `types/index.ts`, `api.ts`, `offlineApi.ts` : `modeleEconomique` typé `('production' | 'service')[] | null`.
- `ExportSection.tsx` : l'export Excel affiche désormais la liste des choix sélectionnés séparés par une virgule.

**Frontend — Filtres façon Excel sur le tableau des entreprises**
- Nouveau composant `business-plan-front/src/components/ui/ColumnFilterDropdown.tsx` (icône entonnoir, recherche + cases à cocher).
- Intégré dans `business-plan-front/src/components/dashboard/ProjectCard.tsx` (vue "Tableau") sur les colonnes Entreprise, Secteur, Promoteur, Statut.
- **Impact backend / base de données : aucun.** Aucune migration nécessaire — modification 100% côté interface.
