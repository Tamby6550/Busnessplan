<?php

namespace App\Service;

use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * Port PHP du générateur Excel du tableau de bord global
 * (business-plan-front/src/utils/dashboardExport.ts), pour l'export serveur
 * consommé via Power Query (voir DashboardExportService / GetDashboardExportController).
 *
 * Reçoit un tableau de "contextes" (un par entreprise visible), chacun sous la forme :
 *   ['projectName' => string, 'company' => \App\Entity\Company, 'result' => array]
 * où 'result' est la sortie de FinancialCalculationService::computeAll().
 *
 * Produit un classeur PhpSpreadsheet à 14 feuilles, avec EXACTEMENT la même
 * structure et les mêmes conventions de mise en forme que l'export Excel du
 * navigateur : pour les catégories à nombre variable d'éléments par entreprise
 * (produits, matières, personnel, charges, investissements, emprunts), une ligne
 * par élément (et non plus un bloc de colonnes par élément), avec les colonnes
 * de totaux au niveau entreprise fusionnées verticalement sur le bloc de lignes
 * de cette entreprise. Les séries mensuelles (12 valeurs) et annuelles (4 ou 5
 * valeurs) sont éclatées en autant de colonnes individuelles (une par mois ou
 * par année), plutôt que regroupées dans une seule cellule.
 */
class DashboardXlsxBuilder
{
    private const YEARS = ['An 1', 'An 2', 'An 3', 'An 4', 'An 5'];
    private const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

    private const DARK_BG   = '1E2433';
    private const WHITE     = 'FFFFFF';
    private const TEXT_DARK = '1A1A1A';
    private const BORDER    = 'E2E8F0';
    private const DANGER    = 'DC2626';
    private const DANGER_LT = 'FEF2F2';
    private const SUCCESS   = '16A34A';

    public function __construct(
        private readonly FinancialCalculationService $calc,
    ) {}

    /**
     * @param array $contexts Liste de ['projectName'=>string,'company'=>Company,'result'=>array]
     */
    public function build(array $contexts): Spreadsheet
    {
        $wb = new Spreadsheet();
        $wb->removeSheetByIndex(0);

        $this->renderSheet($wb, 'Récapitulatif', $this->buildRecapSheet($contexts));
        $this->renderSheet($wb, 'Produits', $this->buildProduitsSheet($contexts));
        $this->renderSheet($wb, 'Matières premières', $this->buildMatieresSheet($contexts));
        $this->renderSheet($wb, 'Personnel', $this->buildPersonnelSheet($contexts));
        $this->renderSheet($wb, 'Charges', $this->buildChargesSheet($contexts));
        $this->renderSheet($wb, 'Investissements amortissables', $this->buildInvestissementsSheet($contexts));
        $this->renderSheet($wb, 'Investissements non amortis', $this->buildInvestTerrainSheet($contexts));
        $this->renderSheet($wb, 'Financements additionnels', $this->buildFinancementsSheet($contexts));
        $this->renderSheet($wb, 'Compte de résultat', $this->buildCompteResultatSheet($contexts));
        $this->renderSheet($wb, 'Trésorerie', $this->buildTresorerieSheet($contexts));
        $this->renderSheet($wb, 'Bilan', $this->buildBilanSheet($contexts));
        $this->renderSheet($wb, 'Plan de financement', $this->buildPlanFinancementSheet($contexts));
        $this->renderSheet($wb, 'Rentabilité', $this->buildRentabiliteSheet($contexts));
        $this->renderSheet($wb, 'Emprunts', $this->buildEmpruntsSheet($contexts));

        $wb->setActiveSheetIndex(0);
        return $wb;
    }

    // ─── Rendu générique d'une feuille à partir de headers/rows/widths/merges ─

    /**
     * @param array{headers: string[], rows: array[][], widths: int[], merges?: string[]} $spec
     */
    private function renderSheet(Spreadsheet $wb, string $title, array $spec): void
    {
        $headers = $spec['headers'];
        $rows = $spec['rows'];
        $widths = $spec['widths'] ?? [];
        $merges = $spec['merges'] ?? [];

        $sheet = $wb->createSheet();
        $sheet->setTitle($this->safeSheetTitle($title));

        $colCount = max(count($headers), 1);
        $lastCol = Coordinate::stringFromColumnIndex($colCount);

        foreach ($headers as $i => $h) {
            $col = Coordinate::stringFromColumnIndex($i + 1);
            $sheet->setCellValue($col . '1', $h);
        }
        $sheet->getStyle('A1:' . $lastCol . '1')->applyFromArray($this->hdrStyleArr());
        $sheet->getRowDimension(1)->setRowHeight(30);

        $r = 2;
        foreach ($rows as $rowCells) {
            foreach ($rowCells as $i => $cell) {
                $col = Coordinate::stringFromColumnIndex($i + 1);
                $this->applyCell($sheet, $col . $r, $cell);
            }
            $r++;
        }

        foreach ($widths as $i => $w) {
            if ($i >= $colCount) {
                break;
            }
            $col = Coordinate::stringFromColumnIndex($i + 1);
            $sheet->getColumnDimension($col)->setWidth(max(6, (int) round($w / 7)));
        }

        foreach ($merges as $range) {
            $sheet->mergeCells($range);
        }

        $sheet->freezePane('A2');
    }

    private function safeSheetTitle(string $title): string
    {
        // Excel limite les noms de feuille à 31 caractères et interdit : \ / ? * [ ]
        $clean = preg_replace('/[\\\\\/\?\*\[\]:]/', '', $title) ?? $title;
        return mb_substr($clean, 0, 31);
    }

    private function applyCell(Worksheet $sheet, string $coord, array $cell): void
    {
        $type = $cell['type'];
        $value = $cell['value'];
        $sheet->setCellValue($coord, $value);

        switch ($type) {
            case 'lbl':
                $sheet->getStyle($coord)->applyFromArray($this->lblStyleArr($cell['bold'] ?? false, $cell['bg'] ?? null, false));
                break;
            case 'lblC':
                $sheet->getStyle($coord)->applyFromArray($this->lblStyleArr($cell['bold'] ?? false, $cell['bg'] ?? null, true));
                break;
            case 'num':
                $sheet->getStyle($coord)->applyFromArray($this->numStyleArr($cell['colored'] ?? false, (float) $value, $cell['fmt'] ?? '#,##0', false));
                break;
            case 'numC':
                $sheet->getStyle($coord)->applyFromArray($this->numStyleArr(false, (float) $value, $cell['fmt'] ?? '#,##0', true));
                break;
            case 'pct':
                $sheet->getStyle($coord)->applyFromArray($this->pctStyleArr());
                break;
        }
    }

    // ─── Styles (mêmes conventions que dashboardExport.ts) ────────────────────

    private function allBordersArr(): array
    {
        return [
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => self::BORDER],
                ],
            ],
        ];
    }

    private function hdrStyleArr(): array
    {
        return array_replace_recursive([
            'font' => ['bold' => true, 'size' => 10, 'color' => ['rgb' => self::WHITE]],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => self::DARK_BG]],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
                'wrapText' => true,
            ],
        ], $this->allBordersArr());
    }

    private function lblStyleArr(bool $bold, ?string $bg, bool $centered): array
    {
        return array_replace_recursive([
            'font' => ['bold' => $bold, 'size' => 10, 'color' => ['rgb' => self::TEXT_DARK]],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $bg ?? self::WHITE]],
            'alignment' => [
                'horizontal' => $centered ? Alignment::HORIZONTAL_CENTER : Alignment::HORIZONTAL_LEFT,
                'vertical' => Alignment::VERTICAL_CENTER,
                'wrapText' => true,
            ],
        ], $this->allBordersArr());
    }

    private function numStyleArr(bool $colored, float $value, string $fmt, bool $centered): array
    {
        $color = $colored ? ($value >= 0 ? self::SUCCESS : self::DANGER) : self::TEXT_DARK;
        return array_replace_recursive([
            'font' => ['size' => 10, 'color' => ['rgb' => $color]],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => self::WHITE]],
            'alignment' => [
                'horizontal' => $centered ? Alignment::HORIZONTAL_CENTER : Alignment::HORIZONTAL_RIGHT,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
            'numberFormat' => ['formatCode' => $fmt],
        ], $this->allBordersArr());
    }

    private function pctStyleArr(): array
    {
        return array_replace_recursive([
            'font' => ['size' => 10, 'color' => ['rgb' => self::TEXT_DARK]],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => self::WHITE]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'numberFormat' => ['formatCode' => '0.0"%"'],
        ], $this->allBordersArr());
    }

    // ─── Constructeurs de cellules (specs, rendues plus tard par applyCell) ───

    private function c_lbl(string $text, bool $bold = false, ?string $bg = null): array
    {
        return ['type' => 'lbl', 'value' => $text, 'bold' => $bold, 'bg' => $bg];
    }

    private function c_lblC(string $text, bool $bold = false, ?string $bg = null): array
    {
        return ['type' => 'lblC', 'value' => $text, 'bold' => $bold, 'bg' => $bg];
    }

    private function c_num(float $value, bool $colored = false, string $fmt = '#,##0'): array
    {
        return ['type' => 'num', 'value' => $value, 'colored' => $colored, 'fmt' => $fmt];
    }

    private function c_numC(float $value, string $fmt = '#,##0'): array
    {
        return ['type' => 'numC', 'value' => $value, 'fmt' => $fmt];
    }

    private function c_pct(float $value): array
    {
        return ['type' => 'pct', 'value' => $value];
    }

    // ─── Petits utilitaires (équivalents des helpers TS) ───────────────────────

    private function normalize(?string $v): string
    {
        return $v !== null && trim($v) !== '' ? trim($v) : '(Non renseigné)';
    }

    private function fmtNum(float $v): string
    {
        if (!is_finite($v)) {
            return '0';
        }
        $r = round($v, 2);
        if ($r == 0.0) {
            $r = 0.0;
        }
        $s = number_format($r, 2, '.', '');
        $s = rtrim(rtrim($s, '0'), '.');
        return $s === '' || $s === '-' ? '0' : $s;
    }

    /** @return string[] */
    private function monthHeaders(string $prefix): array
    {
        return array_map(fn ($m) => "$prefix $m", self::MONTHS);
    }

    /**
     * @param string[]|null $labels
     * @return string[]
     */
    private function yearHeaders(string $prefix, ?array $labels = null): array
    {
        return array_map(fn ($y) => "$prefix $y", $labels ?? self::YEARS);
    }

    /**
     * @param (int|float)[] $values
     * @return array[]
     */
    private function monthCols(array $values): array
    {
        $out = [];
        foreach (array_keys(self::MONTHS) as $i) {
            $out[] = $this->c_numC((float) ($values[$i] ?? 0));
        }
        return $out;
    }

    /**
     * @param (int|float)[] $values
     * @param string[]|null $labels
     * @return array[]
     */
    private function yearCols(array $values, ?array $labels = null): array
    {
        $labels = $labels ?? self::YEARS;
        $out = [];
        foreach (array_keys($labels) as $i) {
            $out[] = $this->c_numC((float) ($values[$i] ?? 0));
        }
        return $out;
    }

    /**
     * Construit les lignes d'une feuille "un élément par ligne" (produit, matière, poste,
     * charge, investissement, emprunt…) : chaque élément de chaque entreprise a sa propre
     * ligne ; les colonnes de totaux au niveau entreprise (mêmes valeurs répétées sur
     * toutes les lignes d'une même entreprise) sont fusionnées verticalement sur le bloc
     * de lignes de cette entreprise. Les entreprises sans aucun élément dans cette
     * catégorie n'apparaissent pas dans la feuille.
     *
     * @param callable(array):array $getItems
     * @param callable(mixed,array):array $buildRow
     * @return array{rows: array[], merges: string[]}
     */
    private function buildLongFormatRows(array $contexts, callable $getItems, callable $buildRow, int $totalStartCol, int $totalColCount): array
    {
        $rows = [];
        $merges = [];
        $r = 2; // la ligne 1 est l'en-tête (convention renderSheet)
        foreach ($contexts as $ctx) {
            $items = $getItems($ctx);
            if (count($items) === 0) {
                continue;
            }
            $startRow = $r;
            foreach ($items as $item) {
                $rows[] = $buildRow($item, $ctx);
                $r++;
            }
            $endRow = $r - 1;
            if ($endRow > $startRow && $totalColCount > 0) {
                for ($c = 0; $c < $totalColCount; $c++) {
                    $col = Coordinate::stringFromColumnIndex($totalStartCol + $c + 1);
                    $merges[] = "{$col}{$startRow}:{$col}{$endRow}";
                }
            }
        }
        return ['rows' => $rows, 'merges' => $merges];
    }

    // ─── Feuille 1 : Récapitulatif (une ligne par entreprise) ──────────────────

    private function buildRecapSheet(array $contexts): array
    {
        $headers = [
            'Promoteur', 'Entreprise', 'Projet', 'Secteur', 'Genre', 'Modèle économique', 'État activité', 'Statut',
            'Créé par', 'Modifié par', 'Dernière modification',
            'Régime fiscal', 'Taux imposition (%)', 'Fonds de roulement (%)',
            'CA An 1 (Ar)', 'CA An 5 (Ar)', 'Résultat net An 1 (Ar)', 'Résultat net An 5 (Ar)',
            'Trésorerie cumulée An 1 (Ar)', 'Trésorerie cumulée An 5 (Ar)',
            'Total investissement (Ar)', 'Total fonds propres (Ar)', 'Total subvention (Ar)', 'Total emprunt (Ar)',
        ];

        $rows = [];
        foreach ($contexts as $ctx) {
            $company = $ctx['company'];
            $result = $ctx['result'];
            $settings = $company->getSettings();
            $investments = $company->getInvestments()->toArray();

            $totalInvest = array_sum(array_map(fn ($i) => $i->getAmount(), $investments));
            $totalEquity = array_sum(array_map(fn ($i) => $i->getFinancedEquity(), $investments));
            $totalGrant  = array_sum(array_map(fn ($i) => $i->getFinancedGrant(), $investments));
            $totalLoan   = array_sum(array_map(fn ($i) => $i->getFinancedLoan(), $investments));
            $modifiedDate = $company->getUpdatedAt()?->format('d/m/Y') ?? '-';

            $genre = $company->getGenre();
            $modeleEco = $company->getModeleEconomique() ?? [];
            $etat = $company->getEtatActivite();

            $rows[] = [
                $this->c_lbl($this->normalize($company->getPromoteur()), true),
                $this->c_lbl($company->getName()),
                $this->c_lbl($ctx['projectName']),
                $this->c_lbl($company->getSecteur() ?? '-'),
                $this->c_lbl($genre === 'femme' ? 'Femme' : ($genre === 'homme' ? 'Homme' : '-')),
                $this->c_lbl($modeleEco ? implode(', ', $modeleEco) : '-'),
                $this->c_lbl($etat === 'existante' ? 'Existante' : ($etat === 'nouvelle' ? 'Nouvelle' : '-')),
                $this->c_lbl($company->isValidated() ? 'Validé' : 'En cours', false, $company->isValidated() ? self::DANGER_LT : null),
                $this->c_lbl($company->getCreatedBy()?->getFullName() ?? '-'),
                $this->c_lbl($company->getLastModifiedBy()?->getFullName() ?? '-'),
                $this->c_lbl($modifiedDate),
                $this->c_lbl($settings?->getTaxRegime() ?? '-'),
                $this->c_num($settings ? ($settings->getTaxRegime() === 'IS' ? $settings->getTaxRateIs() : $settings->getTaxRate()) : 0),
                $this->c_num($settings?->getFondsRoulement() ?? 0),
                $this->c_num($result['incomeStatement']['revenueByYear'][0] ?? 0),
                $this->c_num($result['incomeStatement']['revenueByYear'][4] ?? 0),
                $this->c_num($result['incomeStatement']['netIncomeByYear'][0] ?? 0, true),
                $this->c_num($result['incomeStatement']['netIncomeByYear'][4] ?? 0, true),
                $this->c_num($result['cashFlowStatement']['cumulativeCashByYear'][0] ?? 0),
                $this->c_num($result['cashFlowStatement']['cumulativeCashByYear'][4] ?? 0),
                $this->c_num($totalInvest),
                $this->c_num($totalEquity),
                $this->c_num($totalGrant),
                $this->c_num($totalLoan),
            ];
        }

        $widths = [
            195, 240, 195, 170, 115, 195, 135, 115, 170, 170, 145,
            125, 135, 160, 145, 145, 160, 160, 180, 180,
            170, 170, 170, 170,
        ];
        return ['headers' => $headers, 'rows' => $rows, 'widths' => $widths];
    }

    // ─── Feuille 2 : Produits (une ligne par produit, totaux entreprise fusionnés) ─

    private function buildProduitsSheet(array $contexts): array
    {
        $headers = array_merge(
            ['id', 'Promoteur', 'Entreprise', 'Produits (noms)'],
            $this->monthHeaders('Prix Ar'),
            $this->monthHeaders('Qté'),
            $this->yearHeaders('Croissance %', array_slice(self::YEARS, 1)),
            $this->yearHeaders('CA Ar'),
            array_map(fn ($y) => "CA total $y (Ar)", self::YEARS),
        );
        $totalColCount = 5;
        $totalStartCol = count($headers) - $totalColCount;

        $built = $this->buildLongFormatRows(
            $contexts,
            fn ($ctx) => $ctx['company']->getProducts()->toArray(),
            function ($p, $ctx) {
                $products = $ctx['company']->getProducts()->toArray();
                $totalByYear = [];
                for ($y = 0; $y < 5; $y++) {
                    $sum = 0;
                    foreach ($products as $pp) {
                        $sum += $this->calc->productRevenueByYear($pp, $y);
                    }
                    $totalByYear[] = $sum;
                }
                $revByYear = [];
                for ($y = 0; $y < 5; $y++) {
                    $revByYear[] = $this->calc->productRevenueByYear($p, $y);
                }
                $row = [
                    $this->c_numC($ctx['company']->getId()),
                    $this->c_lbl($this->normalize($ctx['company']->getPromoteur()), true),
                    $this->c_lbl($ctx['company']->getName()),
                    $this->c_lblC($p->getName()),
                    ...$this->monthCols($p->getMonthlyPrices()),
                    ...$this->monthCols($p->getMonthlyQty()),
                    ...$this->yearCols($p->getGrowthRates(), array_slice(self::YEARS, 1)),
                    ...$this->yearCols($revByYear),
                ];
                foreach ($totalByYear as $v) {
                    $row[] = $this->c_numC($v);
                }
                return $row;
            },
            $totalStartCol,
            $totalColCount,
        );

        $widths = array_merge(
            [70, 195, 240, 220],
            array_fill(0, 12, 85), array_fill(0, 12, 85),
            array_fill(0, 4, 105), array_fill(0, 5, 120),
            array_fill(0, 5, 140),
        );
        return ['headers' => $headers, 'rows' => $built['rows'], 'widths' => $widths, 'merges' => $built['merges']];
    }

    // ─── Feuille 3 : Matières premières (une ligne par matière) ────────────────

    private function buildMatieresSheet(array $contexts): array
    {
        $headers = array_merge(
            ['id', 'Promoteur', 'Entreprise', 'Matières (noms)'],
            $this->monthHeaders('Coût unitaire Ar'),
            $this->monthHeaders('Qté'),
            $this->yearHeaders('Croissance %', array_slice(self::YEARS, 1)),
            $this->yearHeaders('Coût Ar'),
            array_map(fn ($y) => "Coût total $y (Ar)", self::YEARS),
        );
        $totalColCount = 5;
        $totalStartCol = count($headers) - $totalColCount;

        $built = $this->buildLongFormatRows(
            $contexts,
            fn ($ctx) => $ctx['company']->getMaterials()->toArray(),
            function ($m, $ctx) {
                $materials = $ctx['company']->getMaterials()->toArray();
                $totalByYear = [];
                for ($y = 0; $y < 5; $y++) {
                    $sum = 0;
                    foreach ($materials as $mm) {
                        $sum += $this->calc->materialCostByYear($mm, $y);
                    }
                    $totalByYear[] = $sum;
                }
                $costByYear = [];
                for ($y = 0; $y < 5; $y++) {
                    $costByYear[] = $this->calc->materialCostByYear($m, $y);
                }
                $row = [
                    $this->c_numC($ctx['company']->getId()),
                    $this->c_lbl($this->normalize($ctx['company']->getPromoteur()), true),
                    $this->c_lbl($ctx['company']->getName()),
                    $this->c_lblC($m->getName()),
                    ...$this->monthCols($m->getMonthlyUnitCosts()),
                    ...$this->monthCols($m->getMonthlyQty()),
                    ...$this->yearCols($m->getGrowthRates(), array_slice(self::YEARS, 1)),
                    ...$this->yearCols($costByYear),
                ];
                foreach ($totalByYear as $v) {
                    $row[] = $this->c_numC($v);
                }
                return $row;
            },
            $totalStartCol,
            $totalColCount,
        );

        $widths = array_merge(
            [70, 195, 240, 220],
            array_fill(0, 12, 85), array_fill(0, 12, 85),
            array_fill(0, 4, 105), array_fill(0, 5, 120),
            array_fill(0, 5, 140),
        );
        return ['headers' => $headers, 'rows' => $built['rows'], 'widths' => $widths, 'merges' => $built['merges']];
    }

    // ─── Feuille 4 : Personnel (une ligne par poste) ───────────────────────────

    private function buildPersonnelSheet(array $contexts): array
    {
        $headers = array_merge(
            ['id', 'Promoteur', 'Entreprise', 'Postes (noms)', 'Salaire mensuel Ar', 'Effectif', 'Taux de charges %'],
            $this->yearHeaders('Croissance %', array_slice(self::YEARS, 1)),
            $this->yearHeaders('Coût Ar'),
            array_map(fn ($y) => "Coût total $y (Ar)", self::YEARS),
        );
        $totalColCount = 5;
        $totalStartCol = count($headers) - $totalColCount;

        $built = $this->buildLongFormatRows(
            $contexts,
            fn ($ctx) => $ctx['company']->getStaffMembers()->toArray(),
            function ($s, $ctx) {
                $staff = $ctx['company']->getStaffMembers()->toArray();
                $totalByYear = [];
                for ($y = 0; $y < 5; $y++) {
                    $sum = 0;
                    foreach ($staff as $st) {
                        $sum += $this->calc->staffAnnualCostByYear($st, $y);
                    }
                    $totalByYear[] = $sum;
                }
                $costByYear = [];
                for ($y = 0; $y < 5; $y++) {
                    $costByYear[] = $this->calc->staffAnnualCostByYear($s, $y);
                }
                $row = [
                    $this->c_numC($ctx['company']->getId()),
                    $this->c_lbl($this->normalize($ctx['company']->getPromoteur()), true),
                    $this->c_lbl($ctx['company']->getName()),
                    $this->c_lblC($s->getRoleName()),
                    $this->c_numC($s->getMonthlySalary()),
                    $this->c_numC($s->getHeadcount()),
                    $this->c_numC($s->getChargesRate()),
                    ...$this->yearCols($s->getGrowthRates(), array_slice(self::YEARS, 1)),
                    ...$this->yearCols($costByYear),
                ];
                foreach ($totalByYear as $v) {
                    $row[] = $this->c_numC($v);
                }
                return $row;
            },
            $totalStartCol,
            $totalColCount,
        );

        $widths = array_merge(
            [70, 195, 240, 220, 200, 120, 180],
            array_fill(0, 4, 110), array_fill(0, 5, 120),
            array_fill(0, 5, 140),
        );
        return ['headers' => $headers, 'rows' => $built['rows'], 'widths' => $widths, 'merges' => $built['merges']];
    }

    // ─── Feuille 5 : Charges (une ligne par charge) ────────────────────────────

    private function buildChargesSheet(array $contexts): array
    {
        $headers = array_merge(
            ['id', 'Promoteur', 'Entreprise', 'Charges (noms)'],
            $this->monthHeaders('Montant Ar'),
            $this->monthHeaders('Présence'),
            $this->yearHeaders('Inflation %', array_slice(self::YEARS, 1)),
            $this->yearHeaders('Total Ar'),
            array_map(fn ($y) => "Total $y (Ar)", self::YEARS),
        );
        $totalColCount = 5;
        $totalStartCol = count($headers) - $totalColCount;

        $built = $this->buildLongFormatRows(
            $contexts,
            fn ($ctx) => $ctx['company']->getExpenses()->toArray(),
            function ($e, $ctx) {
                $exp = $ctx['company']->getExpenses()->toArray();
                $totalByYear = [];
                for ($y = 0; $y < 5; $y++) {
                    $sum = 0;
                    foreach ($exp as $ee) {
                        $sum += $this->calc->expenseTotalByYear($ee, $y);
                    }
                    $totalByYear[] = $sum;
                }
                $totByYear = [];
                for ($y = 0; $y < 5; $y++) {
                    $totByYear[] = $this->calc->expenseTotalByYear($e, $y);
                }
                $row = [
                    $this->c_numC($ctx['company']->getId()),
                    $this->c_lbl($this->normalize($ctx['company']->getPromoteur()), true),
                    $this->c_lbl($ctx['company']->getName()),
                    $this->c_lblC($e->getName()),
                    ...$this->monthCols($e->getMonthlyAmounts()),
                    ...$this->monthCols($e->getSeasonality()),
                    ...$this->yearCols($e->getInflationGrowth(), array_slice(self::YEARS, 1)),
                    ...$this->yearCols($totByYear),
                ];
                foreach ($totalByYear as $v) {
                    $row[] = $this->c_numC($v);
                }
                return $row;
            },
            $totalStartCol,
            $totalColCount,
        );

        $widths = array_merge(
            [70, 195, 240, 220],
            array_fill(0, 12, 85), array_fill(0, 12, 85),
            array_fill(0, 4, 105), array_fill(0, 5, 120),
            array_fill(0, 5, 140),
        );
        return ['headers' => $headers, 'rows' => $built['rows'], 'widths' => $widths, 'merges' => $built['merges']];
    }

    // ─── Feuille 6 : Investissements amortissables (une ligne par investissement) ─

    private function buildInvestissementsSheet(array $contexts): array
    {
        $headers = [
            'id', 'Promoteur', 'Entreprise', 'Investissements (désignations)',
            'Montant Ar', 'Durée amort. ans', "Type d'équipement", "Type d'apport",
            'Fonds propres Ar / %', 'Subvention Ar / %', 'Emprunt Ar / %', 'Taux et durée emprunt',
            'Amortissement annuel Ar',
        ];
        $headers = array_merge($headers, $this->yearHeaders('VNC Ar'), [
            'Total investissement (Ar)', 'Total fonds propres (Ar)', 'Total subvention (Ar)', 'Total emprunt (Ar)',
        ]);
        foreach (self::YEARS as $y) {
            $headers[] = "VNC totale $y (Ar)";
        }
        $totalColCount = 4 + 5;
        $totalStartCol = count($headers) - $totalColCount;

        $pct = fn ($part, $total) => $total > 0 ? round(($part / $total) * 1000) / 10 : 0;

        $built = $this->buildLongFormatRows(
            $contexts,
            fn ($ctx) => $ctx['company']->getInvestments()->toArray(),
            function ($it, $ctx) use ($pct) {
                $inv = $ctx['company']->getInvestments()->toArray();
                $depByInv = [];
                foreach ($ctx['result']['depreciationTable']['byInvestment'] as $d) {
                    $depByInv[$d['investmentId']] = $d;
                }
                $totalInvest = array_sum(array_map(fn ($i) => $i->getAmount(), $inv));
                $totalEquity = array_sum(array_map(fn ($i) => $i->getFinancedEquity(), $inv));
                $totalGrant  = array_sum(array_map(fn ($i) => $i->getFinancedGrant(), $inv));
                $totalLoan   = array_sum(array_map(fn ($i) => $i->getFinancedLoan(), $inv));
                $vncTotalByYear = [];
                for ($y = 0; $y < 5; $y++) {
                    $sum = 0;
                    foreach ($inv as $i) {
                        $sum += $depByInv[$i->getId()]['yearlyBook'][$y] ?? 0;
                    }
                    $vncTotalByYear[] = $sum;
                }
                $dep = $depByInv[$it->getId()] ?? null;
                $yearlyBook = $dep['yearlyBook'] ?? [0, 0, 0, 0, 0];

                $row = [
                    $this->c_numC($ctx['company']->getId()),
                    $this->c_lbl($this->normalize($ctx['company']->getPromoteur()), true),
                    $this->c_lbl($ctx['company']->getName()),
                    $this->c_lblC($it->getName()),
                    $this->c_numC($it->getAmount()),
                    $this->c_numC($it->getUsefulLife()),
                    $this->c_lblC($it->getEquipmentType() === 'electrique' ? 'Électrique' : 'Non électrique'),
                    $this->c_lblC($it->getContributionType() === 'nature' ? 'Apport en nature' : 'Apport financier'),
                    $this->c_lblC($this->fmtNum($it->getFinancedEquity()) . ' (' . $this->fmtNum($pct($it->getFinancedEquity(), $it->getAmount())) . '%)'),
                    $this->c_lblC($this->fmtNum($it->getFinancedGrant()) . ' (' . $this->fmtNum($pct($it->getFinancedGrant(), $it->getAmount())) . '%)'),
                    $this->c_lblC($this->fmtNum($it->getFinancedLoan()) . ' (' . $this->fmtNum($pct($it->getFinancedLoan(), $it->getAmount())) . '%)'),
                    $this->c_lblC($this->fmtNum($it->getLoanRate()) . '% / ' . $this->fmtNum($it->getLoanYears()) . ' ans'),
                    $this->c_numC($it->getUsefulLife() > 0 ? (int) round($it->getAmount() / $it->getUsefulLife()) : 0),
                    ...$this->yearCols($yearlyBook),
                    $this->c_numC($totalInvest),
                    $this->c_numC($totalEquity),
                    $this->c_numC($totalGrant),
                    $this->c_numC($totalLoan),
                ];
                foreach ($vncTotalByYear as $v) {
                    $row[] = $this->c_numC($v);
                }
                return $row;
            },
            $totalStartCol,
            $totalColCount,
        );

        $widths = array_merge(
            [70, 195, 240, 240, 150, 160, 180, 200, 220, 220, 220, 200, 220],
            array_fill(0, 5, 120),
            [150, 150, 150, 150],
        );
        for ($i = 0; $i < 5; $i++) {
            $widths[] = 130;
        }
        return ['headers' => $headers, 'rows' => $built['rows'], 'widths' => $widths, 'merges' => $built['merges']];
    }

    // ─── Feuille 7 : Investissements non amortissables (une ligne par élément) ─

    private function buildInvestTerrainSheet(array $contexts): array
    {
        $headers = ['id', 'Promoteur', 'Entreprise', 'Investissements non amortis (désignations)', 'Nature', 'Montant Ar', 'Total (Ar)'];
        $totalColCount = 1;
        $totalStartCol = count($headers) - $totalColCount;

        $built = $this->buildLongFormatRows(
            $contexts,
            fn ($ctx) => $ctx['company']->getInvestmentTerrains()->toArray(),
            function ($x, $ctx) {
                $it = $ctx['company']->getInvestmentTerrains()->toArray();
                $total = array_sum(array_map(fn ($xx) => $xx->getAmount(), $it));
                return [
                    $this->c_numC($ctx['company']->getId()),
                    $this->c_lbl($this->normalize($ctx['company']->getPromoteur()), true),
                    $this->c_lbl($ctx['company']->getName()),
                    $this->c_lblC($x->getName()),
                    $this->c_lblC($x->getNatureType() === 'immateriel' ? 'Immatériel' : 'Physique'),
                    $this->c_numC($x->getAmount()),
                    $this->c_numC($total),
                ];
            },
            $totalStartCol,
            $totalColCount,
        );

        $widths = [70, 195, 240, 280, 120, 170, 150];
        return ['headers' => $headers, 'rows' => $built['rows'], 'widths' => $widths, 'merges' => $built['merges']];
    }

    // ─── Feuille 8 : Financements additionnels (une ligne par entreprise, séries An1-5) ─

    private function buildFinancementsSheet(array $contexts): array
    {
        $headers = array_merge(
            ['Promoteur', 'Entreprise'],
            $this->yearHeaders('Fonds propres Ar'),
            $this->yearHeaders('Emprunt Ar'),
            $this->yearHeaders('Taux emprunt %'),
            $this->yearHeaders('Durée emprunt ans'),
            $this->yearHeaders('Subvention Ar'),
        );

        $rows = [];
        foreach ($contexts as $ctx) {
            $company = $ctx['company'];
            $f = $company->getAdditionalFundings()->toArray();

            $seriesFor = function (callable $getV) use ($f) {
                $out = [];
                for ($y = 0; $y < 5; $y++) {
                    $item = null;
                    foreach ($f as $x) {
                        if ($x->getYearNumber() === $y + 1) {
                            $item = $x;
                            break;
                        }
                    }
                    $out[] = $item ? $getV($item) : 0;
                }
                return $out;
            };

            $rows[] = [
                $this->c_lbl($this->normalize($company->getPromoteur()), true),
                $this->c_lbl($company->getName()),
                ...$this->yearCols($seriesFor(fn ($x) => $x->getEquity())),
                ...$this->yearCols($seriesFor(fn ($x) => $x->getLoan())),
                ...$this->yearCols($seriesFor(fn ($x) => $x->getLoanRate())),
                ...$this->yearCols($seriesFor(fn ($x) => $x->getLoanYears())),
                ...$this->yearCols($seriesFor(fn ($x) => $x->getGrant())),
            ];
        }

        return ['headers' => $headers, 'rows' => $rows, 'widths' => array_merge([195, 240], array_fill(0, 25, 110))];
    }

    // ─── Feuilles pivot génériques (Compte de résultat, Trésorerie, Bilan, Plan de financement) ─

    /**
     * @param array{label: string, get: callable(array):array}[] $indicators
     */
    private function pivotSheet(array $contexts, array $indicators): array
    {
        $headers = ['Promoteur', 'Entreprise'];
        foreach ($indicators as $ind) {
            $headers = array_merge($headers, $this->yearHeaders($ind['label']));
        }

        $rows = [];
        foreach ($contexts as $ctx) {
            $company = $ctx['company'];
            $result = $ctx['result'];
            $row = [
                $this->c_lbl($this->normalize($company->getPromoteur()), true),
                $this->c_lbl($company->getName()),
            ];
            foreach ($indicators as $ind) {
                $row = array_merge($row, $this->yearCols(($ind['get'])($result)));
            }
            $rows[] = $row;
        }

        $widths = [195, 240];
        foreach ($indicators as $ind) {
            $widths = array_merge($widths, array_fill(0, 5, 120));
        }
        return ['headers' => $headers, 'rows' => $rows, 'widths' => $widths];
    }

    private function buildCompteResultatSheet(array $contexts): array
    {
        return $this->pivotSheet($contexts, [
            ['label' => "Chiffre d'affaires", 'get' => fn ($r) => $r['incomeStatement']['revenueByYear']],
            ['label' => 'Coût matières', 'get' => fn ($r) => $r['incomeStatement']['materialCostByYear']],
            ['label' => 'Marge brute', 'get' => fn ($r) => $r['incomeStatement']['grossMarginByYear']],
            ['label' => 'Charges de personnel', 'get' => fn ($r) => $r['incomeStatement']['staffCostByYear']],
            ['label' => 'Autres charges', 'get' => fn ($r) => $r['incomeStatement']['expenseCostByYear']],
            ['label' => 'EBITDA (EBE)', 'get' => fn ($r) => $r['incomeStatement']['ebitdaByYear']],
            ['label' => 'Amortissements', 'get' => fn ($r) => $r['incomeStatement']['depreciationByYear']],
            ['label' => "Résultat d'exploitation (EBIT)", 'get' => fn ($r) => $r['incomeStatement']['ebitByYear']],
            ['label' => 'Charges financières (intérêts)', 'get' => fn ($r) => $r['incomeStatement']['interestByYear']],
            ['label' => 'Résultat avant impôt', 'get' => fn ($r) => $r['incomeStatement']['ebtByYear']],
            ['label' => 'Impôt', 'get' => fn ($r) => $r['incomeStatement']['taxByYear']],
            ['label' => 'Résultat net', 'get' => fn ($r) => $r['incomeStatement']['netIncomeByYear']],
            ['label' => 'Marge brute (%)', 'get' => fn ($r) => $r['profitabilityRatios']['grossMarginPctByYear']],
            ['label' => 'Marge EBITDA (%)', 'get' => fn ($r) => $r['profitabilityRatios']['ebitdaMarginPctByYear']],
            ['label' => 'Marge nette (%)', 'get' => fn ($r) => $r['profitabilityRatios']['netMarginPctByYear']],
            ['label' => 'Seuil de rentabilité (Ar)', 'get' => fn ($r) => $r['profitabilityRatios']['breakEvenValueByYear']],
            ['label' => 'Point mort (mois)', 'get' => fn ($r) => $r['profitabilityRatios']['breakEvenMonthByYear']],
        ]);
    }

    private function buildTresorerieSheet(array $contexts): array
    {
        return $this->pivotSheet($contexts, [
            ['label' => 'Résultat net', 'get' => fn ($r) => $r['cashFlowStatement']['netIncomeByYear']],
            ['label' => 'Amortissements', 'get' => fn ($r) => $r['cashFlowStatement']['depreciationByYear']],
            ['label' => "Flux d'exploitation (CAF)", 'get' => fn ($r) => $r['cashFlowStatement']['operatingCashFlowByYear']],
            ['label' => 'Investissements', 'get' => fn ($r) => $r['cashFlowStatement']['investmentByYear']],
            ['label' => 'Fonds propres apportés', 'get' => fn ($r) => $r['cashFlowStatement']['equityByYear']],
            ['label' => 'Emprunts contractés', 'get' => fn ($r) => $r['cashFlowStatement']['loanByYear']],
            ['label' => 'Subventions', 'get' => fn ($r) => $r['cashFlowStatement']['grantByYear']],
            ['label' => 'Remboursement emprunt (capital)', 'get' => fn ($r) => $r['cashFlowStatement']['loanRepaymentByYear']],
            ['label' => 'Flux net de trésorerie', 'get' => fn ($r) => $r['cashFlowStatement']['netCashByYear']],
            ['label' => 'Trésorerie cumulée', 'get' => fn ($r) => $r['cashFlowStatement']['cumulativeCashByYear']],
        ]);
    }

    private function buildBilanSheet(array $contexts): array
    {
        return $this->pivotSheet($contexts, [
            ['label' => 'Immobilisations brutes', 'get' => fn ($r) => array_fill(0, 5, $r['balanceSheet']['fixedAssetsGross'])],
            ['label' => 'Amortissements cumulés', 'get' => fn ($r) => $r['balanceSheet']['accumulatedDepreciationByYear']],
            ['label' => 'Immobilisations nettes (VNC)', 'get' => fn ($r) => $r['balanceSheet']['fixedAssetsNetByYear']],
            ['label' => 'BFR', 'get' => fn ($r) => array_fill(0, 5, $r['balanceSheet']['bfr'])],
            ['label' => 'Trésorerie', 'get' => fn ($r) => $r['balanceSheet']['cashByYear']],
            ['label' => 'TOTAL ACTIF', 'get' => fn ($r) => $r['balanceSheet']['totalAssetsByYear']],
            ['label' => 'Capital social initial', 'get' => fn ($r) => array_fill(0, 5, $r['balanceSheet']['initialCapital'])],
            ['label' => 'Réserves cumulées', 'get' => fn ($r) => $r['balanceSheet']['cumulativeReservesByYear']],
            ['label' => "Résultat de l'exercice", 'get' => fn ($r) => $r['balanceSheet']['netIncomeByYear']],
            ['label' => 'Emprunt restant dû', 'get' => fn ($r) => $r['balanceSheet']['loanBalanceByYear']],
            ['label' => 'TOTAL PASSIF', 'get' => fn ($r) => $r['balanceSheet']['totalLiabilitiesByYear']],
        ]);
    }

    private function buildPlanFinancementSheet(array $contexts): array
    {
        return $this->pivotSheet($contexts, [
            ['label' => 'CAF', 'get' => fn ($r) => $r['financingPlan']['cafByYear']],
            ['label' => 'Fonds propres', 'get' => fn ($r) => $r['financingPlan']['equityByYear']],
            ['label' => 'Emprunts', 'get' => fn ($r) => $r['financingPlan']['loanByYear']],
            ['label' => 'Subventions', 'get' => fn ($r) => $r['financingPlan']['grantByYear']],
            ['label' => 'TOTAL RESSOURCES', 'get' => fn ($r) => $r['financingPlan']['totalResourcesByYear']],
            ['label' => 'Investissements', 'get' => fn ($r) => $r['financingPlan']['investmentByYear']],
            ['label' => 'Remboursement emprunt', 'get' => fn ($r) => $r['financingPlan']['loanRepaymentByYear']],
            ['label' => 'Variation BFR', 'get' => fn ($r) => $r['financingPlan']['bfrByYear']],
            ['label' => 'TOTAL EMPLOIS', 'get' => fn ($r) => $r['financingPlan']['totalUsesByYear']],
            ['label' => 'Solde', 'get' => fn ($r) => $r['financingPlan']['balanceByYear']],
            ['label' => 'Solde cumulé', 'get' => fn ($r) => $r['financingPlan']['cumulativeBalanceByYear']],
        ]);
    }

    // ─── Feuille : Rentabilité (une ligne par entreprise) ──────────────────────

    private function buildRentabiliteSheet(array $contexts): array
    {
        $headers = [
            'Promoteur', 'Entreprise',
            'VAN financière (Ar)', 'TRI financière (%)', 'Indice profit. financière', 'Retour financier',
            'VAN économique (Ar)', 'TRI économique (%)', 'Indice profit. économique', 'Retour économique',
        ];

        $rows = [];
        foreach ($contexts as $ctx) {
            $company = $ctx['company'];
            $P = $ctx['result']['profitability'];
            $E = $ctx['result']['economicProfitability'];
            $rows[] = [
                $this->c_lbl($this->normalize($company->getPromoteur()), true),
                $this->c_lbl($company->getName()),
                $this->c_num($P['npv'], true),
                $this->c_pct($P['irr'] !== null ? round($P['irr'] * 10) / 10 : 0),
                $this->c_num(round($P['profitabilityIndex'] * 100) / 100),
                $this->c_lbl($P['paybackYear'] !== null ? "An {$P['paybackYear']}" : 'Non atteint'),
                $this->c_num($E['npv'], true),
                $this->c_pct($E['irr'] !== null ? round($E['irr'] * 10) / 10 : 0),
                $this->c_num(round($E['profitabilityIndex'] * 100) / 100),
                $this->c_lbl($E['paybackYear'] !== null ? "An {$E['paybackYear']}" : 'Non atteint'),
            ];
        }

        return ['headers' => $headers, 'rows' => $rows, 'widths' => [195, 240, 160, 140, 160, 130, 160, 140, 160, 130]];
    }

    // ─── Feuille : Emprunts (une ligne par emprunt) ────────────────────────────

    private function buildEmpruntsSheet(array $contexts): array
    {
        $headers = array_merge(
            ['Promoteur', 'Entreprise', 'Emprunts (libellés)', 'Principal Ar', 'Taux %', 'Durée ans'],
            $this->yearHeaders('Capital remboursé Ar'),
            $this->yearHeaders('Intérêts Ar'),
            $this->yearHeaders('Solde restant Ar'),
        );
        foreach (self::YEARS as $y) {
            $headers[] = "Capital total remboursé $y (Ar)";
        }
        foreach (self::YEARS as $y) {
            $headers[] = "Intérêts totaux $y (Ar)";
        }
        $totalColCount = 10;
        $totalStartCol = count($headers) - $totalColCount;

        $built = $this->buildLongFormatRows(
            $contexts,
            fn ($ctx) => $ctx['result']['loanRepaymentTable']['byLoan'],
            function ($l, $ctx) {
                $totalCapital = $ctx['result']['loanRepaymentTable']['totalCapitalByYear'];
                $totalInterest = $ctx['result']['loanRepaymentTable']['totalInterestByYear'];
                $row = [
                    $this->c_lbl($this->normalize($ctx['company']->getPromoteur()), true),
                    $this->c_lbl($ctx['company']->getName()),
                    $this->c_lblC($l['label']),
                    $this->c_numC($l['principal']),
                    $this->c_numC($l['rate']),
                    $this->c_numC($l['years']),
                    ...$this->yearCols(array_map(fn ($p) => $p['capital'], $l['annualPayments'])),
                    ...$this->yearCols(array_map(fn ($p) => $p['interest'], $l['annualPayments'])),
                    ...$this->yearCols(array_map(fn ($p) => $p['balance'], $l['annualPayments'])),
                ];
                foreach ($totalCapital as $v) {
                    $row[] = $this->c_numC($v);
                }
                foreach ($totalInterest as $v) {
                    $row[] = $this->c_numC($v);
                }
                return $row;
            },
            $totalStartCol,
            $totalColCount,
        );

        $widths = array_merge(
            [195, 240, 240, 160, 140, 140],
            array_fill(0, 5, 130), array_fill(0, 5, 130), array_fill(0, 5, 130),
        );
        for ($i = 0; $i < 10; $i++) {
            $widths[] = 150;
        }
        return ['headers' => $headers, 'rows' => $built['rows'], 'widths' => $widths, 'merges' => $built['merges']];
    }
}
