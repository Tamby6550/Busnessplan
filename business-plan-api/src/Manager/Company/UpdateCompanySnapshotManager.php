<?php

namespace App\Manager\Company;

use App\Entity\Company;
use App\Entity\CompanySnapshot;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Met à jour le snapshot KPI d'une entreprise après chaque modification de données.
 * Le snapshot contient les KPI calculés côté PHP (version simplifiée)
 * pour affichage rapide sur le dashboard sans recalcul React.
 */
class UpdateCompanySnapshotManager
{
    public function __construct(
        private readonly EntityManagerInterface $em,
    ) {}

    public function update(Company $company): void
    {
        $snapshot = $company->getSnapshot();

        if ($snapshot === null) {
            $snapshot = new CompanySnapshot();
            $snapshot->setCompany($company);
            $this->em->persist($snapshot);
        }

        // Calcul simplifié du CA An 1 (même formule que le JS) — prix mensuel × quantité mensuelle
        // Quantité en float (décimales autorisées, ex: 2.75) ; prix reste un entier (Ariary).
        $revenueY1 = 0;
        foreach ($company->getProducts() as $product) {
            $qty    = $product->getMonthlyQty();
            $prices = $product->getMonthlyPrices();
            for ($m = 0; $m < 12; $m++) {
                $revenueY1 += (float) ($qty[$m] ?? 0) * (int) ($prices[$m] ?? 0);
            }
        }

        // Calcul simplifié des coûts variables An 1 — coût mensuel × quantité mensuelle
        // Quantité en float (décimales autorisées) ; coût reste un entier (Ariary).
        $variableCostsY1 = 0;
        foreach ($company->getMaterials() as $material) {
            $qty   = $material->getMonthlyQty();
            $costs = $material->getMonthlyUnitCosts();
            for ($m = 0; $m < 12; $m++) {
                $variableCostsY1 += (float) ($qty[$m] ?? 0) * (int) ($costs[$m] ?? 0);
            }
        }

        // Personnel An 1
        $personnelY1 = 0;
        foreach ($company->getStaffMembers() as $staff) {
            $personnelY1 += $staff->getAnnualCost();
        }

        // Autres charges An 1
        $chargesY1 = 0;
        foreach ($company->getExpenses() as $expense) {
            $chargesY1 += $expense->getAnnualTotal();
        }

        // Amortissement An 1
        $depreciationY1 = 0;
        foreach ($company->getInvestments() as $investment) {
            $depreciationY1 += $investment->getAnnualDepreciation();
        }

        // EBITDA → EBIT → Résultat net (sans frais financiers détaillés ici)
        $ebitda     = $revenueY1 - $variableCostsY1 - $personnelY1 - $chargesY1;
        $ebit       = $ebitda - $depreciationY1;
        $netIncomeY1 = (int) $ebit; // Approximation sans impôt ni intérêts pour le dashboard

        // Trésorerie initiale simplifiée
        $settings   = $company->getSettings();
        $financing  = ['equity' => 0, 'loan' => 0, 'grant' => 0, 'total' => 0];
        foreach ($company->getInvestments() as $investment) {
            $financing['equity'] += $investment->getFinancedEquity();
            $financing['loan']   += $investment->getFinancedLoan();
            $financing['grant']  += $investment->getFinancedGrant();
            $financing['total']  += $investment->getAmount();
        }
        $fondsRoulement = $settings ? $settings->getFondsRoulement() : 0;
        $tresoInitiale  = $financing['equity'] + $financing['loan'] + $financing['grant']
                          - $financing['total'] + $fondsRoulement;
        $cashCumY1 = (int) ($tresoInitiale + $netIncomeY1 + $depreciationY1);

        // Seuil de rentabilité simplifié
        $marginRate = $revenueY1 > 0 ? ($revenueY1 - $variableCostsY1) / $revenueY1 : 0;
        $fixedCosts = $personnelY1 + $chargesY1 + $depreciationY1;
        $breakEven  = $marginRate > 0 ? (int) ($fixedCosts / $marginRate) : 0;

        // Complétion
        $completionPct = $this->calculateCompletion($company);

        $snapshot->setRevenueY1((int) round($revenueY1)); // quantités décimales possibles, CA arrondi à l'Ariary près
        $snapshot->setNetIncomeY1($netIncomeY1);
        $snapshot->setCashCumY1($cashCumY1);
        $snapshot->setBreakEven($breakEven);
        $snapshot->setCompletionPct($completionPct);

        $this->em->flush();
    }

    private function calculateCompletion(Company $company): int
    {
        $filled = 0;
        $total  = 0;

        // Identité
        $total += 3;
        if ($company->getName())      $filled++;
        if ($company->getSecteur())   $filled++;
        if ($company->getPromoteur()) $filled++;

        // Produits
        $total += 2;
        if ($company->getProducts()->count() > 0)   $filled++;
        $hasProductData = false;
        foreach ($company->getProducts() as $p) {
            if ($p->getPrice() > 0 && array_sum($p->getMonthlyQty()) > 0) {
                $hasProductData = true;
                break;
            }
        }
        if ($hasProductData) $filled++;

        // Matières
        $total += 1;
        foreach ($company->getMaterials() as $m) {
            if ($m->getUnitCost() > 0) { $filled++; break; }
        }

        // Personnel
        $total += 1;
        foreach ($company->getStaffMembers() as $s) {
            if ($s->getMonthlySalary() > 0) { $filled++; break; }
        }

        // Investissements
        $total += 1;
        foreach ($company->getInvestments() as $i) {
            if ($i->getAmount() > 0) { $filled++; break; }
        }

        return $total > 0 ? (int) round(($filled / $total) * 100) : 0;
    }
}
