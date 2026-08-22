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
use App\Entity\StaffMember;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Duplique complètement une entreprise :
 * toutes ses données sont copiées dans une nouvelle entreprise du même projet.
 */
class DuplicateCompanyManager
{
    public function __construct(
        private readonly EntityManagerInterface $em,
    ) {}

    public function duplicate(Company $source, User $createdBy): Company
    {
        $copy = new Company();
        $copy->setProject($source->getProject());
        $copy->setName($source->getName() . ' (copie)');
        $copy->setSecteur($source->getSecteur());
        $copy->setPromoteur($source->getPromoteur());
        $copy->setDevise($source->getDevise());
        $copy->setCreatedBy($createdBy);
        $copy->setLastModifiedBy($createdBy);
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

        // Copie des produits
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

        // Copie des matières premières
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

        // Copie du personnel
        foreach ($source->getStaffMembers() as $srcStaff) {
            $st = new StaffMember();
            $st->setCompany($copy);
            $st->setRoleName($srcStaff->getRoleName());
            $st->setMonthlySalary($srcStaff->getMonthlySalary());
            $st->setHeadcount($srcStaff->getHeadcount());
            $st->setChargesRate($srcStaff->getChargesRate());
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

        // Copie des investissements
        foreach ($source->getInvestments() as $srcInv) {
            $i = new Investment();
            $i->setCompany($copy);
            $i->setName($srcInv->getName());
            $i->setCategory($srcInv->getCategory());
            $i->setAmount($srcInv->getAmount());
            $i->setUsefulLife($srcInv->getUsefulLife());
            $i->setFinancedEquity($srcInv->getFinancedEquity());
            $i->setFinancedLoan($srcInv->getFinancedLoan());
            $i->setFinancedGrant($srcInv->getFinancedGrant());
            $i->setLoanRate($srcInv->getLoanRate());
            $i->setLoanYears($srcInv->getLoanYears());
            $i->setSortOrder($srcInv->getSortOrder());
            $this->em->persist($i);
        }

        // Copie des investissements Terrain (table séparée, pas d'amortissement ni de financement)
        foreach ($source->getInvestmentTerrains() as $srcInv) {
            $i = new InvestmentTerrain();
            $i->setCompany($copy);
            $i->setName($srcInv->getName());
            $i->setAmount($srcInv->getAmount());
            $i->setSortOrder($srcInv->getSortOrder());
            $this->em->persist($i);
        }

        // Copie des apports complémentaires
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

        // Snapshot vide pour la copie
        $snap = new CompanySnapshot();
        $snap->setCompany($copy);
        $this->em->persist($snap);

        $this->em->flush();

        return $copy;
    }
}
