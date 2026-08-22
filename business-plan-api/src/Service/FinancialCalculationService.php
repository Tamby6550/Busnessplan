<?php

namespace App\Service;

use App\Entity\AdditionalFunding;
use App\Entity\CompanySettings;
use App\Entity\Expense;
use App\Entity\Investment;
use App\Entity\Material;
use App\Entity\Product;
use App\Entity\StaffMember;

/**
 * Port PHP du moteur de calculs financiers du frontend
 * (business-plan-front/src/calculations/calculations.ts).
 *
 * Doit rester rigoureusement identique aux formules JS pour que l'export Excel
 * généré côté serveur (endpoint /api/export/...) affiche exactement les mêmes
 * chiffres que l'application et l'export individuel par entreprise.
 *
 * Toutes les valeurs monétaires sont en Ariary. Les tableaux "ByYear" ont
 * toujours 5 éléments (index 0 = An 1 ... index 4 = An 5), comme côté JS.
 *
 * Note d'arrondi : PHP round() arrondit les .5 en s'éloignant de zéro alors que
 * JS Math.round() arrondit toujours vers +l'infini ; différence négligeable qui
 * ne peut se produire que sur une valeur pile à .5 Ariary près.
 */
class FinancialCalculationService
{
    private function round(float $n): int
    {
        return (int) round($n);
    }

    // ─── Chiffre d'affaires ────────────────────────────────────────────────

    public function productRevenueByYear(Product $product, int $yearIndex): int
    {
        $qty    = $product->getMonthlyQty();
        $prices = $product->getMonthlyPrices();
        $baseRevenue = 0.0;
        for ($m = 0; $m < 12; $m++) {
            $baseRevenue += ((float) ($qty[$m] ?? 0)) * ((float) ($prices[$m] ?? 0));
        }
        $growth = $product->getGrowthRates();
        $qtyFactor = 1.0;
        for ($y = 0; $y < $yearIndex; $y++) {
            $qtyFactor *= 1 + (((float) ($growth[$y] ?? 0)) / 100);
        }
        return $this->round($baseRevenue * $qtyFactor);
    }

    /** @param Product[] $products */
    public function totalRevenueByYear(array $products): array
    {
        $out = [];
        for ($y = 0; $y < 5; $y++) {
            $sum = 0;
            foreach ($products as $p) {
                $sum += $this->productRevenueByYear($p, $y);
            }
            $out[] = $sum;
        }
        return $out;
    }

    // ─── Coût des matières premières ───────────────────────────────────────

    public function materialCostByYear(Material $material, int $yearIndex): int
    {
        $qty   = $material->getMonthlyQty();
        $costs = $material->getMonthlyUnitCosts();
        $baseCost = 0.0;
        for ($m = 0; $m < 12; $m++) {
            $baseCost += ((float) ($qty[$m] ?? 0)) * ((float) ($costs[$m] ?? 0));
        }
        $growth = $material->getGrowthRates();
        $qtyFactor = 1.0;
        for ($y = 0; $y < $yearIndex; $y++) {
            $qtyFactor *= 1 + (((float) ($growth[$y] ?? 0)) / 100);
        }
        return $this->round($baseCost * $qtyFactor);
    }

    /** @param Material[] $materials */
    public function totalMaterialCostByYear(array $materials): array
    {
        $out = [];
        for ($y = 0; $y < 5; $y++) {
            $sum = 0;
            foreach ($materials as $m) {
                $sum += $this->materialCostByYear($m, $y);
            }
            $out[] = $sum;
        }
        return $out;
    }

    // ─── Charges de personnel ───────────────────────────────────────────────

    public function staffAnnualCost(StaffMember $staff): float
    {
        return $staff->getMonthlySalary() * $staff->getHeadcount() * 12 * (1 + $staff->getChargesRate() / 100);
    }

    public function staffAnnualCostByYear(StaffMember $staff, int $yearIndex): int
    {
        $base = $this->staffAnnualCost($staff);
        $growth = $staff->getGrowthRates();
        $factor = 1.0;
        for ($y = 0; $y < $yearIndex; $y++) {
            $factor *= 1 + (((float) ($growth[$y] ?? 0)) / 100);
        }
        return $this->round($base * $factor);
    }

    /** @param StaffMember[] $staffMembers */
    public function totalStaffCostByYear(array $staffMembers): array
    {
        $out = [];
        for ($y = 0; $y < 5; $y++) {
            $sum = 0;
            foreach ($staffMembers as $s) {
                $sum += $this->staffAnnualCostByYear($s, $y);
            }
            $out[] = $sum;
        }
        return $out;
    }

    // ─── Charges d'exploitation ─────────────────────────────────────────────

    public function expenseAnnualTotal(Expense $expense): int
    {
        $amounts = $expense->getMonthlyAmounts();
        $seasonality = $expense->getSeasonality();
        $total = 0.0;
        foreach ($seasonality as $m => $coef) {
            $total += ((float) $coef) * ((float) ($amounts[$m] ?? 0));
        }
        return $this->round($total);
    }

    public function expenseTotalByYear(Expense $expense, int $yearIndex): int
    {
        $growth = $expense->getInflationGrowth();
        $factor = 1.0;
        for ($y = 0; $y < $yearIndex; $y++) {
            $factor *= 1 + (((float) ($growth[$y] ?? 0)) / 100);
        }
        return $this->round($this->expenseAnnualTotal($expense) * $factor);
    }

    /** @param Expense[] $expenses */
    public function totalExpensesByYear(array $expenses): array
    {
        $out = [];
        for ($y = 0; $y < 5; $y++) {
            $sum = 0;
            foreach ($expenses as $e) {
                $sum += $this->expenseTotalByYear($e, $y);
            }
            $out[] = $sum;
        }
        return $out;
    }

    // ─── Amortissements ──────────────────────────────────────────────────────

    /** @param Investment[] $investments */
    public function buildDepreciationTable(array $investments): array
    {
        $byInvestment = [];
        foreach ($investments as $inv) {
            $annualDepreciation = $inv->getUsefulLife() > 0 ? $inv->getAmount() / $inv->getUsefulLife() : 0;
            $yearlyBook = [];
            for ($y = 0; $y < 5; $y++) {
                $remaining = $inv->getAmount() - $annualDepreciation * ($y + 1);
                $yearlyBook[] = max(0, $this->round($remaining));
            }
            $byInvestment[] = [
                'investmentId'       => $inv->getId(),
                'annualDepreciation' => $this->round($annualDepreciation),
                'yearlyBook'         => $yearlyBook,
            ];
        }
        $totalAnnualDepreciation = array_sum(array_column($byInvestment, 'annualDepreciation'));
        return ['byInvestment' => $byInvestment, 'totalAnnualDepreciation' => $totalAnnualDepreciation];
    }

    // ─── Tableau d'amortissement d'emprunt ───────────────────────────────────

    private function computeLoanSchedule(float $principal, float $annualRatePct, int $years): array
    {
        if ($principal <= 0 || $annualRatePct <= 0 || $years <= 0) {
            $n = max($years, 5);
            return array_fill(0, $n, ['capital' => 0, 'interest' => 0, 'balance' => 0]);
        }

        $r = $annualRatePct / 100;
        $annuity = ($principal * $r * (1 + $r) ** $years) / ((1 + $r) ** $years - 1);

        $balance = $principal;
        $schedule = [];
        $n = max($years, 5);

        for ($y = 0; $y < $n; $y++) {
            if ($y >= $years || $balance <= 0) {
                $schedule[] = ['capital' => 0, 'interest' => 0, 'balance' => 0];
            } else {
                $interest = $this->round($balance * $r);
                $capital  = $this->round($annuity - $interest);
                $balance  = max(0, $this->round($balance - $capital));
                $schedule[] = ['capital' => $capital, 'interest' => $interest, 'balance' => $balance];
            }
        }

        return $schedule;
    }

    /**
     * @param Investment[] $investments
     * @param AdditionalFunding[] $additionalFundings
     */
    public function buildLoanRepaymentTable(array $investments, array $additionalFundings = []): array
    {
        $fromInvestments = [];
        foreach ($investments as $inv) {
            if ($inv->getFinancedLoan() > 0) {
                $fromInvestments[] = [
                    'label'          => $inv->getName(),
                    'principal'      => $inv->getFinancedLoan(),
                    'rate'           => $inv->getLoanRate(),
                    'years'          => $inv->getLoanYears(),
                    'annualPayments' => $this->computeLoanSchedule($inv->getFinancedLoan(), $inv->getLoanRate(), $inv->getLoanYears()),
                ];
            }
        }

        $fromFundings = [];
        foreach ($additionalFundings as $af) {
            if ($af->getLoan() > 0 && $af->getLoanRate() > 0 && $af->getLoanYears() > 0) {
                $offset = $af->getYearNumber() - 1; // An 1 → offset 0, An 2 → offset 1, etc.
                $schedule = $this->computeLoanSchedule($af->getLoan(), $af->getLoanRate(), $af->getLoanYears());
                $empty = array_fill(0, max(0, $offset), ['capital' => 0, 'interest' => 0, 'balance' => 0]);
                $annualPayments = array_slice(array_merge($empty, $schedule), 0, 5);
                $fromFundings[] = [
                    'label'          => "Emprunt complémentaire An {$af->getYearNumber()}",
                    'principal'      => $af->getLoan(),
                    'rate'           => $af->getLoanRate(),
                    'years'          => $af->getLoanYears(),
                    'annualPayments' => $annualPayments,
                ];
            }
        }

        $byLoan = array_merge($fromInvestments, $fromFundings);

        $totalInterestByYear = [];
        $totalCapitalByYear = [];
        for ($y = 0; $y < 5; $y++) {
            $si = 0;
            $sc = 0;
            foreach ($byLoan as $l) {
                $si += $l['annualPayments'][$y]['interest'] ?? 0;
                $sc += $l['annualPayments'][$y]['capital'] ?? 0;
            }
            $totalInterestByYear[] = $si;
            $totalCapitalByYear[] = $sc;
        }

        return [
            'byLoan'              => $byLoan,
            'totalInterestByYear' => $totalInterestByYear,
            'totalCapitalByYear'  => $totalCapitalByYear,
        ];
    }

    // ─── Compte de résultat ──────────────────────────────────────────────────

    /**
     * @param Product[] $products
     * @param Material[] $materials
     * @param StaffMember[] $staffMembers
     * @param Expense[] $expenses
     * @param Investment[] $investments
     */
    public function buildIncomeStatement(
        array $products,
        array $materials,
        array $staffMembers,
        array $expenses,
        array $investments,
        CompanySettings $settings,
        ?array $loanTable = null,
    ): array {
        $revenueByYear = $this->totalRevenueByYear($products);
        $materialCostByYear = $this->totalMaterialCostByYear($materials);
        $grossMarginByYear = [];
        for ($y = 0; $y < 5; $y++) {
            $grossMarginByYear[] = $revenueByYear[$y] - $materialCostByYear[$y];
        }

        $staffCostByYear = $this->totalStaffCostByYear($staffMembers);
        $expenseCostByYear = $this->totalExpensesByYear($expenses);
        $ebitdaByYear = [];
        for ($y = 0; $y < 5; $y++) {
            $ebitdaByYear[] = $grossMarginByYear[$y] - $staffCostByYear[$y] - $expenseCostByYear[$y];
        }

        $depTable = $this->buildDepreciationTable($investments);
        $investmentsList = array_values($investments);
        $depreciationByYear = [];
        for ($y = 0; $y < 5; $y++) {
            $sum = 0;
            foreach ($depTable['byInvestment'] as $i => $row) {
                $inv = $investmentsList[$i];
                $prevBook = $y === 0 ? $inv->getAmount() : $row['yearlyBook'][$y - 1];
                $currBook = $row['yearlyBook'][$y];
                $sum += max(0, $prevBook - $currBook);
            }
            $depreciationByYear[] = $sum;
        }

        $ebitByYear = [];
        for ($y = 0; $y < 5; $y++) {
            $ebitByYear[] = $ebitdaByYear[$y] - $depreciationByYear[$y];
        }

        $loanTable = $loanTable ?? $this->buildLoanRepaymentTable($investments, []);
        $interestByYear = $loanTable['totalInterestByYear'];

        $ebtByYear = [];
        for ($y = 0; $y < 5; $y++) {
            $ebtByYear[] = $ebitByYear[$y] - $interestByYear[$y];
        }

        $taxByYear = [];
        for ($y = 0; $y < 5; $y++) {
            $ebt = $ebtByYear[$y];
            if ($settings->getTaxRegime() === 'IS') {
                $taxByYear[] = $this->round($revenueByYear[$y] * ($settings->getTaxRateIs() / 100));
            } else {
                $taxByYear[] = $ebt <= 0 ? 0 : $this->round($ebt * ($settings->getTaxRate() / 100));
            }
        }

        $netIncomeByYear = [];
        for ($y = 0; $y < 5; $y++) {
            $netIncomeByYear[] = $ebtByYear[$y] - $taxByYear[$y];
        }

        return [
            'revenueByYear'      => $revenueByYear,
            'materialCostByYear' => $materialCostByYear,
            'grossMarginByYear'  => $grossMarginByYear,
            'staffCostByYear'    => $staffCostByYear,
            'expenseCostByYear'  => $expenseCostByYear,
            'ebitdaByYear'       => $ebitdaByYear,
            'depreciationByYear' => $depreciationByYear,
            'ebitByYear'         => $ebitByYear,
            'interestByYear'     => $interestByYear,
            'ebtByYear'          => $ebtByYear,
            'taxByYear'          => $taxByYear,
            'netIncomeByYear'    => $netIncomeByYear,
        ];
    }

    // ─── Tableau de flux de trésorerie ───────────────────────────────────────

    /**
     * @param Investment[] $investments
     * @param AdditionalFunding[] $additionalFundings
     */
    public function buildCashFlowStatement(
        array $incomeStatement,
        array $investments,
        array $additionalFundings,
        array $loanTable,
        CompanySettings $settings,
    ): array {
        $netIncomeByYear = $incomeStatement['netIncomeByYear'];
        $depreciationByYear = $incomeStatement['depreciationByYear'];

        $bfr = $settings->getFondsRoulement();
        $operatingCashFlowByYear = [];
        for ($y = 0; $y < 5; $y++) {
            $operatingCashFlowByYear[] = $netIncomeByYear[$y] + $depreciationByYear[$y];
        }

        $totalInvestment = 0;
        foreach ($investments as $i) {
            $totalInvestment += $i->getAmount();
        }
        $investmentByYear = [$totalInvestment, 0, 0, 0, 0];

        $findFunding = function (array $fundings, int $yearNumber): ?AdditionalFunding {
            foreach ($fundings as $f) {
                if ($f->getYearNumber() === $yearNumber) {
                    return $f;
                }
            }
            return null;
        };

        $totalEquityY1 = 0;
        $totalLoanY1 = 0;
        $totalGrantY1 = 0;
        foreach ($investments as $i) {
            $totalEquityY1 += $i->getFinancedEquity();
            $totalLoanY1 += $i->getFinancedLoan();
            $totalGrantY1 += $i->getFinancedGrant();
        }
        $af1 = $findFunding($additionalFundings, 1);
        if ($af1) {
            $totalEquityY1 += $af1->getEquity();
            $totalLoanY1 += $af1->getLoan();
            $totalGrantY1 += $af1->getGrant();
        }

        $equityByYear = [];
        $loanByYear = [];
        $grantByYear = [];
        for ($y = 0; $y < 5; $y++) {
            if ($y === 0) {
                $equityByYear[] = $totalEquityY1;
                $loanByYear[] = $totalLoanY1;
                $grantByYear[] = $totalGrantY1;
            } else {
                $af = $findFunding($additionalFundings, $y + 1);
                $equityByYear[] = $af ? $af->getEquity() : 0;
                $loanByYear[] = $af ? $af->getLoan() : 0;
                $grantByYear[] = $af ? $af->getGrant() : 0;
            }
        }

        $loanRepaymentByYear = $loanTable['totalCapitalByYear'];

        $netCashByYear = [];
        for ($y = 0; $y < 5; $y++) {
            $netCashByYear[] = $operatingCashFlowByYear[$y] - $investmentByYear[$y]
                + $equityByYear[$y] + $loanByYear[$y] + $grantByYear[$y] - $loanRepaymentByYear[$y];
        }

        $cumulativeCashByYear = [];
        for ($y = 0; $y < 5; $y++) {
            $prev = $y === 0 ? $bfr : $cumulativeCashByYear[$y - 1];
            $cumulativeCashByYear[] = $prev + $netCashByYear[$y];
        }

        return [
            'netIncomeByYear'         => $netIncomeByYear,
            'depreciationByYear'      => $depreciationByYear,
            'operatingCashFlowByYear' => $operatingCashFlowByYear,
            'investmentByYear'        => $investmentByYear,
            'equityByYear'            => $equityByYear,
            'loanByYear'              => $loanByYear,
            'grantByYear'             => $grantByYear,
            'loanRepaymentByYear'     => $loanRepaymentByYear,
            'netCashByYear'           => $netCashByYear,
            'cumulativeCashByYear'    => $cumulativeCashByYear,
        ];
    }

    // ─── Indicateurs de rentabilité ──────────────────────────────────────────

    public function computeNPV(array $operatingCashFlows, float $initialInvestment, float $discountRatePct): int
    {
        $r = $discountRatePct / 100;
        $npv = -$initialInvestment;
        foreach (array_values($operatingCashFlows) as $y => $cf) {
            $npv += $cf / ((1 + $r) ** ($y + 1));
        }
        return $this->round($npv);
    }

    public function computeIRR(array $operatingCashFlows, float $initialInvestment): ?float
    {
        $cashFlows = array_merge([-$initialInvestment], array_values($operatingCashFlows));

        $hasPositive = false;
        $hasNegative = false;
        foreach ($cashFlows as $cf) {
            if ($cf > 0) $hasPositive = true;
            if ($cf < 0) $hasNegative = true;
        }
        if (!$hasPositive || !$hasNegative) {
            return null;
        }

        $rate = 0.1;
        for ($iter = 0; $iter < 200; $iter++) {
            $npv = 0.0;
            $dnpv = 0.0;
            foreach ($cashFlows as $t => $cf) {
                $disc = (1 + $rate) ** $t;
                $npv += $cf / $disc;
                $dnpv -= ($t * $cf) / ($disc * (1 + $rate));
            }
            $denom = abs($dnpv) < 1e-9 ? 1e-9 : $dnpv;
            $newRate = $rate - $npv / $denom;
            if (!is_finite($newRate)) {
                return null;
            }
            if (abs($newRate - $rate) < 1e-7) {
                return round($newRate * 10000) / 100;
            }
            if ($newRate < -0.999) {
                return null;
            }
            $rate = $newRate;
        }
        return round($rate * 10000) / 100;
    }

    public function computeProfitabilityIndex(float $npv, float $initialInvestment): float
    {
        if ($initialInvestment == 0.0) {
            return 0.0;
        }
        return round((($npv + $initialInvestment) / $initialInvestment) * 100) / 100;
    }

    public function computePayback(array $operatingCashFlows, float $initialInvestment): ?int
    {
        $cumulative = -$initialInvestment;
        foreach (array_values($operatingCashFlows) as $y => $cf) {
            $cumulative += $cf;
            if ($cumulative >= 0) {
                return $y + 1;
            }
        }
        return null;
    }

    public function computeBreakEvenYear(array $netIncomeByYear): ?int
    {
        foreach (array_values($netIncomeByYear) as $y => $ni) {
            if ($ni > 0) {
                return $y + 1;
            }
        }
        return null;
    }

    /**
     * Rentabilité FINANCIÈRE (point de vue actionnaire) :
     *   I0 = Fonds propres investis uniquement
     *   Flux = CAF - remboursement capital (net après service de la dette)
     * @param Investment[] $investments
     */
    public function buildProfitability(array $cashFlow, array $investments, CompanySettings $settings): array
    {
        $initialInvestment = 0;
        foreach ($investments as $i) {
            $initialInvestment += $i->getFinancedEquity();
        }

        $opCashFlows = [];
        for ($y = 0; $y < 5; $y++) {
            $opCashFlows[] = $cashFlow['operatingCashFlowByYear'][$y] - $cashFlow['loanRepaymentByYear'][$y];
        }

        $npv = $this->computeNPV($opCashFlows, $initialInvestment, $settings->getDiscountRate());
        $irr = $this->computeIRR($opCashFlows, $initialInvestment);
        $profitabilityIndex = $this->computeProfitabilityIndex($npv, $initialInvestment);
        $paybackYear = $this->computePayback($opCashFlows, $initialInvestment);
        $breakEvenYear = $this->computeBreakEvenYear($cashFlow['netIncomeByYear']);

        return compact('npv', 'irr', 'profitabilityIndex', 'paybackYear', 'breakEvenYear');
    }

    /**
     * Rentabilité ÉCONOMIQUE (point de vue projet) :
     *   I0 = Total investissement (tous financements confondus)
     *   Flux = CAF brute (avant remboursement d'emprunt)
     * @param Investment[] $investments
     */
    public function buildEconomicProfitability(array $cashFlow, array $investments, CompanySettings $settings): array
    {
        $initialInvestment = 0;
        foreach ($investments as $i) {
            $initialInvestment += $i->getAmount();
        }

        $opCashFlows = $cashFlow['operatingCashFlowByYear'];

        $npv = $this->computeNPV($opCashFlows, $initialInvestment, $settings->getDiscountRate());
        $irr = $this->computeIRR($opCashFlows, $initialInvestment);
        $profitabilityIndex = $this->computeProfitabilityIndex($npv, $initialInvestment);
        $paybackYear = $this->computePayback($opCashFlows, $initialInvestment);
        $breakEvenYear = $this->computeBreakEvenYear($cashFlow['netIncomeByYear']);

        return compact('npv', 'irr', 'profitabilityIndex', 'paybackYear', 'breakEvenYear');
    }

    // ─── Bilan prévisionnel ────────────────────────────────────────────────

    /** @param Investment[] $investments */
    public function buildBalanceSheet(
        array $investments,
        array $depreciationTable,
        array $loanRepaymentTable,
        array $cashFlow,
        array $incomeStatement,
        CompanySettings $settings,
    ): array {
        $fixedAssetsGross = 0;
        foreach ($investments as $i) {
            $fixedAssetsGross += $i->getAmount();
        }

        $fixedAssetsNetByYear = [];
        for ($y = 0; $y < 5; $y++) {
            $sum = 0;
            foreach ($depreciationTable['byInvestment'] as $row) {
                $sum += $row['yearlyBook'][$y] ?? 0;
            }
            $fixedAssetsNetByYear[] = $sum;
        }
        $accumulatedDepreciationByYear = array_map(
            fn ($vnc) => max(0, $fixedAssetsGross - $vnc),
            $fixedAssetsNetByYear,
        );

        $bfr = $settings->getFondsRoulement();
        $cashByYear = $cashFlow['cumulativeCashByYear'];

        $totalAssetsByYear = [];
        for ($y = 0; $y < 5; $y++) {
            $totalAssetsByYear[] = $fixedAssetsNetByYear[$y] + $bfr + max(0, $cashByYear[$y]);
        }

        $initialCapital = array_sum($cashFlow['equityByYear']);

        $cumulativeReservesByYear = [];
        for ($y = 0; $y < 5; $y++) {
            $cumulativeReservesByYear[] = $y === 0
                ? 0
                : $cumulativeReservesByYear[$y - 1] + $incomeStatement['netIncomeByYear'][$y - 1];
        }

        $loanBalanceByYear = [];
        for ($y = 0; $y < 5; $y++) {
            $sum = 0;
            foreach ($loanRepaymentTable['byLoan'] as $loan) {
                $sum += $loan['annualPayments'][$y]['balance'] ?? 0;
            }
            $loanBalanceByYear[] = $sum;
        }

        $totalLiabilitiesByYear = [];
        for ($y = 0; $y < 5; $y++) {
            $totalLiabilitiesByYear[] = $initialCapital
                + $cumulativeReservesByYear[$y]
                + $incomeStatement['netIncomeByYear'][$y]
                + $loanBalanceByYear[$y];
        }

        return [
            'fixedAssetsGross'              => $fixedAssetsGross,
            'accumulatedDepreciationByYear' => $accumulatedDepreciationByYear,
            'fixedAssetsNetByYear'          => $fixedAssetsNetByYear,
            'bfr'                           => $bfr,
            'cashByYear'                    => $cashByYear,
            'totalAssetsByYear'             => $totalAssetsByYear,
            'initialCapital'                => $initialCapital,
            'cumulativeReservesByYear'      => $cumulativeReservesByYear,
            'netIncomeByYear'               => $incomeStatement['netIncomeByYear'],
            'loanBalanceByYear'             => $loanBalanceByYear,
            'totalLiabilitiesByYear'        => $totalLiabilitiesByYear,
        ];
    }

    // ─── Plan de financement ─────────────────────────────────────────────────

    public function buildFinancingPlan(array $incomeStatement, array $cashFlow, CompanySettings $settings): array
    {
        $cafByYear = [];
        for ($y = 0; $y < 5; $y++) {
            $cafByYear[] = $incomeStatement['netIncomeByYear'][$y] + $incomeStatement['depreciationByYear'][$y];
        }

        $bfr = $settings->getFondsRoulement();
        $bfrByYear = [$bfr, 0, 0, 0, 0];

        $totalResourcesByYear = [];
        for ($y = 0; $y < 5; $y++) {
            $totalResourcesByYear[] = $cafByYear[$y]
                + $cashFlow['equityByYear'][$y] + $cashFlow['loanByYear'][$y] + $cashFlow['grantByYear'][$y];
        }

        $totalUsesByYear = [];
        for ($y = 0; $y < 5; $y++) {
            $totalUsesByYear[] = $cashFlow['investmentByYear'][$y] + $cashFlow['loanRepaymentByYear'][$y] + $bfrByYear[$y];
        }

        $balanceByYear = [];
        for ($y = 0; $y < 5; $y++) {
            $balanceByYear[] = $totalResourcesByYear[$y] - $totalUsesByYear[$y];
        }

        $cumulativeBalanceByYear = [];
        for ($y = 0; $y < 5; $y++) {
            $cumulativeBalanceByYear[] = ($y === 0 ? 0 : $cumulativeBalanceByYear[$y - 1]) + $balanceByYear[$y];
        }

        return [
            'cafByYear'                => $cafByYear,
            'equityByYear'             => $cashFlow['equityByYear'],
            'loanByYear'               => $cashFlow['loanByYear'],
            'grantByYear'              => $cashFlow['grantByYear'],
            'totalResourcesByYear'     => $totalResourcesByYear,
            'investmentByYear'         => $cashFlow['investmentByYear'],
            'loanRepaymentByYear'      => $cashFlow['loanRepaymentByYear'],
            'bfrByYear'                => $bfrByYear,
            'totalUsesByYear'          => $totalUsesByYear,
            'balanceByYear'            => $balanceByYear,
            'cumulativeBalanceByYear'  => $cumulativeBalanceByYear,
        ];
    }

    // ─── Ratios de rentabilité détaillés ──────────────────────────────────────

    public function buildProfitabilityRatios(array $incomeStatement): array
    {
        $safeDiv = fn ($a, $b) => $b !== 0 ? round(($a / $b) * 100) / 100 : 0;

        $grossMarginPctByYear = [];
        $ebitdaMarginPctByYear = [];
        $netMarginPctByYear = [];
        for ($y = 0; $y < 5; $y++) {
            $rev = $incomeStatement['revenueByYear'][$y];
            $grossMarginPctByYear[] = $safeDiv($incomeStatement['grossMarginByYear'][$y], $rev) * 100;
            $ebitdaMarginPctByYear[] = $safeDiv($incomeStatement['ebitdaByYear'][$y], $rev) * 100;
            $netMarginPctByYear[] = $safeDiv($incomeStatement['netIncomeByYear'][$y], $rev) * 100;
        }

        $breakEvenValueByYear = [];
        for ($y = 0; $y < 5; $y++) {
            $rev = $incomeStatement['revenueByYear'][$y];
            $varCosts = $incomeStatement['materialCostByYear'][$y];
            $fixedCosts = $incomeStatement['staffCostByYear'][$y] + $incomeStatement['expenseCostByYear'][$y]
                + $incomeStatement['depreciationByYear'][$y] + $incomeStatement['interestByYear'][$y];
            if ($rev === 0) {
                $breakEvenValueByYear[] = 0;
                continue;
            }
            $varRate = $varCosts / $rev;
            if ($varRate >= 1) {
                $breakEvenValueByYear[] = 0;
                continue;
            }
            $breakEvenValueByYear[] = $this->round($fixedCosts / (1 - $varRate));
        }

        $breakEvenMonthByYear = [];
        for ($y = 0; $y < 5; $y++) {
            $rev = $incomeStatement['revenueByYear'][$y];
            if ($rev === 0) {
                $breakEvenMonthByYear[] = 12;
                continue;
            }
            $breakEvenMonthByYear[] = min(12, (int) ceil(($breakEvenValueByYear[$y] / $rev) * 12));
        }

        return [
            'grossMarginPctByYear'  => $grossMarginPctByYear,
            'ebitdaMarginPctByYear' => $ebitdaMarginPctByYear,
            'netMarginPctByYear'    => $netMarginPctByYear,
            'breakEvenValueByYear'  => $breakEvenValueByYear,
            'breakEvenMonthByYear'  => $breakEvenMonthByYear,
        ];
    }

    // ─── Point d'entrée unique ─────────────────────────────────────────────

    /**
     * Lance tous les calculs en une passe à partir des données brutes d'une entreprise —
     * équivalent PHP de computeAll() côté frontend.
     *
     * @param Product[] $products
     * @param Material[] $materials
     * @param StaffMember[] $staffMembers
     * @param Expense[] $expenses
     * @param Investment[] $investments
     * @param AdditionalFunding[] $additionalFundings
     */
    public function computeAll(
        CompanySettings $settings,
        array $products,
        array $materials,
        array $staffMembers,
        array $expenses,
        array $investments,
        array $additionalFundings,
    ): array {
        $depreciationTable = $this->buildDepreciationTable($investments);
        $loanRepaymentTable = $this->buildLoanRepaymentTable($investments, $additionalFundings);

        $incomeStatement = $this->buildIncomeStatement(
            $products,
            $materials,
            $staffMembers,
            $expenses,
            $investments,
            $settings,
            $loanRepaymentTable,
        );

        $cashFlowStatement = $this->buildCashFlowStatement(
            $incomeStatement,
            $investments,
            $additionalFundings,
            $loanRepaymentTable,
            $settings,
        );

        $profitability = $this->buildProfitability($cashFlowStatement, $investments, $settings);
        $economicProfitability = $this->buildEconomicProfitability($cashFlowStatement, $investments, $settings);
        $balanceSheet = $this->buildBalanceSheet(
            $investments,
            $depreciationTable,
            $loanRepaymentTable,
            $cashFlowStatement,
            $incomeStatement,
            $settings,
        );
        $financingPlan = $this->buildFinancingPlan($incomeStatement, $cashFlowStatement, $settings);
        $profitabilityRatios = $this->buildProfitabilityRatios($incomeStatement);

        return [
            'incomeStatement'        => $incomeStatement,
            'depreciationTable'      => $depreciationTable,
            'loanRepaymentTable'     => $loanRepaymentTable,
            'cashFlowStatement'      => $cashFlowStatement,
            'profitability'          => $profitability,
            'economicProfitability'  => $economicProfitability,
            'balanceSheet'           => $balanceSheet,
            'financingPlan'          => $financingPlan,
            'profitabilityRatios'    => $profitabilityRatios,
        ];
    }
}
