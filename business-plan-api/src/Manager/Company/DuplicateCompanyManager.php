<?php

namespace App\Manager\Company;

use App\Entity\AdditionalFunding;
use App\Entity\Company;
use App\Entity\CompanySettings;
use App\Entity\CompanySnapshot;
use App\Entity\Expense;
use App\Entity\Investment;
use App\Entity\InvestmentTerrain;
use App\Entity\Material;
use App\Entity\Product;
use App\Entity\Project;
use App\Entity\StaffMember;
use App\Entity\User;
use App\Repository\CompanyRepository;
use App\Service\CopyNameGenerator;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Duplique complètement une entreprise : toutes ses données sont copiées.
 *
 * La copie peut rester dans le projet d'origine (duplication classique) ou être
 * déposée dans un autre projet (fonction "Copier vers..." du tableau de bord).
 *
 * ATTENTION — tout nouveau champ ajouté à Company, CompanySettings, Product,
 * Material, StaffMember, Expense, Investment, InvestmentTerrain ou
 * AdditionalFunding doit être recopié ici. Un champ oublié n'apparaît pas comme
 * une erreur : la copie se crée normalement, avec une donnée manquante ou une
 * valeur par défaut, et l'écart ne se voit que plus tard dans les chiffres.
 */
class DuplicateCompanyManager
{
    public function __construct(
        private readonly EntityManagerInterface       $em,
        private readonly CompanyRepository            $companyRepository,
        private readonly CopyNameGenerator            $copyNameGenerator,
        private readonly UpdateCompanySnapshotManager $updateCompanySnapshotManager,
    ) {}

    /**
     * @param Company      $source        Entreprise à copier
     * @param User         $createdBy     Auteur de la copie (devient créateur et dernier modificateur)
     * @param Project|null $targetProject Projet de destination ; par défaut celui de la source
     * @param string|null  $wantedName    Nom souhaité pour la copie ; par défaut "<nom source>-copie".
     *                                    Dans tous les cas l'unicité est garantie dans le projet cible.
     * @param bool         $flush         false pour laisser l'appelant grouper plusieurs copies
     *                                    dans une seule transaction (duplication d'un projet entier)
     */
    public function duplicate(
        Company  $source,
        User     $createdBy,
        ?Project $targetProject = null,
        ?string  $wantedName    = null,
        bool     $flush         = true,
    ): Company {
        $project = $targetProject ?? $source->getProject();

        $existingNames = $project?->getId() !== null
            ? $this->companyRepository->findNamesByProject($project->getId())
            : [];

        $name = $wantedName !== null
            ? $this->copyNameGenerator->makeUnique($wantedName, $existingNames)
            : $this->copyNameGenerator->forCopy($source->getName(), $existingNames);

        $copy = new Company();
        $copy->setProject($project);
        $copy->setName($name);
        $copy->setSecteur($source->getSecteur());
        $copy->setPromoteur($source->getPromoteur());
        $copy->setDevise($source->getDevise());
        // Fiche d'identité complète — sans ces champs la copie repart avec une
        // fiche vide et un pourcentage de complétion faussé.
        $copy->setDescriptionActivite($source->getDescriptionActivite());
        $copy->setMarche($source->getMarche());
        $copy->setGenre($source->getGenre());
        $copy->setModeleEconomique($source->getModeleEconomique());
        $copy->setEtatActivite($source->getEtatActivite());
        $copy->setCreatedBy($createdBy);
        $copy->setLastModifiedBy($createdBy);
        // La copie repart volontairement en "En cours" : le statut validé et son
        // signataire appartiennent à l'entreprise d'origine, pas à sa copie.
        $this->em->persist($copy);

        // Copie des paramètres financiers
        if ($src = $source->getSettings()) {
            $s = new CompanySettings();
            $s->setCompany($copy);
            $s->setInfl2($src->getInfl2());
            $s->setInfl3($src->getInfl3());
            $s->setInfl4($src->getInfl4());
            $s->setInfl5($src->getInfl5());
            $s->setDiscountRate($src->getDiscountRate());
            $s->setTaxRegime($src->getTaxRegime());
            $s->setTaxRate($src->getTaxRate());
            $s->setTaxRateIs($src->getTaxRateIs());
            $s->setFondsRoulement($src->getFondsRoulement());
            $this->em->persist($s);
        }

        // Copie des produits — les 12 prix mensuels, pas seulement janvier
        foreach ($source->getProducts() as $srcProd) {
            $p = new Product();
            $p->setCompany($copy);
            $p->setName($srcProd->getName());
            $p->setMonthlyPrices($srcProd->getMonthlyPrices());
            $p->setMonthlyQty($srcProd->getMonthlyQty());
            $p->setGrowthRates($srcProd->getGrowthRates());
            $p->setSortOrder($srcProd->getSortOrder());
            $this->em->persist($p);
        }

        // Copie des matières premières — les 12 coûts mensuels
        foreach ($source->getMaterials() as $srcMat) {
            $m = new Material();
            $m->setCompany($copy);
            $m->setName($srcMat->getName());
            $m->setMonthlyUnitCosts($srcMat->getMonthlyUnitCosts());
            $m->setMonthlyQty($srcMat->getMonthlyQty());
            $m->setGrowthRates($srcMat->getGrowthRates());
            $m->setSortOrder($srcMat->getSortOrder());
            $this->em->persist($m);
        }

        // Copie du personnel — growthRates inclus (croissance salariale An 2-5),
        // sans lui la masse salariale de la copie diverge dès l'An 2.
        foreach ($source->getStaffMembers() as $srcStaff) {
            $st = new StaffMember();
            $st->setCompany($copy);
            $st->setRoleName($srcStaff->getRoleName());
            $st->setMonthlySalary($srcStaff->getMonthlySalary());
            $st->setHeadcount($srcStaff->getHeadcount());
            $st->setChargesRate($srcStaff->getChargesRate());
            $st->setGrowthRates($srcStaff->getGrowthRates());
            $st->setSortOrder($srcStaff->getSortOrder());
            $this->em->persist($st);
        }

        // Copie des autres charges
        foreach ($source->getExpenses() as $srcExp) {
            $e = new Expense();
            $e->setCompany($copy);
            $e->setName($srcExp->getName());
            $e->setMonthlyAmounts($srcExp->getMonthlyAmounts());
            $e->setSeasonality($srcExp->getSeasonality());
            $e->setInflationGrowth($srcExp->getInflationGrowth());
            $e->setSortOrder($srcExp->getSortOrder());
            $this->em->persist($e);
        }

        // Copie des investissements amortissables — equipmentType et surtout
        // contributionType : sans lui un apport en nature redevient "financier"
        // (valeur par défaut de la colonne) et le plan de financement est faussé.
        foreach ($source->getInvestments() as $srcInv) {
            $i = new Investment();
            $i->setCompany($copy);
            $i->setName($srcInv->getName());
            $i->setCategory($srcInv->getCategory());
            $i->setEquipmentType($srcInv->getEquipmentType());
            $i->setAmount($srcInv->getAmount());
            $i->setUsefulLife($srcInv->getUsefulLife());
            $i->setContributionType($srcInv->getContributionType());
            $i->setFinancedEquity($srcInv->getFinancedEquity());
            $i->setFinancedLoan($srcInv->getFinancedLoan());
            $i->setFinancedGrant($srcInv->getFinancedGrant());
            $i->setLoanRate($srcInv->getLoanRate());
            $i->setLoanYears($srcInv->getLoanYears());
            $i->setSortOrder($srcInv->getSortOrder());
            $this->em->persist($i);
        }

        // Copie des investissements Terrain (jamais amortis, sans financement)
        foreach ($source->getInvestmentTerrains() as $srcTer) {
            $t = new InvestmentTerrain();
            $t->setCompany($copy);
            $t->setName($srcTer->getName());
            $t->setAmount($srcTer->getAmount());
            $t->setNatureType($srcTer->getNatureType());
            $t->setSortOrder($srcTer->getSortOrder());
            $this->em->persist($t);
        }

        // Copie des apports complémentaires (An 1 à An 5)
        foreach ($source->getAdditionalFundings() as $srcAf) {
            $af = new AdditionalFunding();
            $af->setCompany($copy);
            $af->setYearNumber($srcAf->getYearNumber());
            $af->setEquity($srcAf->getEquity());
            $af->setLoan($srcAf->getLoan());
            $af->setLoanRate($srcAf->getLoanRate());
            $af->setLoanYears($srcAf->getLoanYears());
            $af->setGrant($srcAf->getGrant());
            $this->em->persist($af);
        }

        $snapshot = $this->buildSnapshot($source, $copy);
        $this->em->persist($snapshot);
        $copy->setSnapshot($snapshot);

        if ($flush) {
            $this->em->flush();
        }

        return $copy;
    }

    /**
     * Snapshot KPI de la copie.
     *
     * Les données étant identiques à celles de la source, les KPI le sont aussi :
     * on recopie donc ceux de la source plutôt que de les recalculer. C'est exact,
     * et surtout c'est fiable — les collections d'une entité tout juste persistée
     * ne sont pas encore peuplées côté Doctrine, un recalcul sur la copie avant
     * flush renverrait des zéros et l'entreprise s'afficherait à "0 Ar / 0 %"
     * sur le tableau de bord.
     */
    private function buildSnapshot(Company $source, Company $copy): CompanySnapshot
    {
        // La source peut ne jamais avoir été calculée (import, ancienne donnée).
        if ($source->getSnapshot() === null) {
            $this->updateCompanySnapshotManager->update($source);
        }

        $snap = new CompanySnapshot();
        $snap->setCompany($copy);

        if ($srcSnap = $source->getSnapshot()) {
            $snap->setRevenueY1($srcSnap->getRevenueY1());
            $snap->setNetIncomeY1($srcSnap->getNetIncomeY1());
            $snap->setCashCumY1($srcSnap->getCashCumY1());
            $snap->setBreakEven($srcSnap->getBreakEven());
            $snap->setCompletionPct($srcSnap->getCompletionPct());
        }

        return $snap;
    }
}
