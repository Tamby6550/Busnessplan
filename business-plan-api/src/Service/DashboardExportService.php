<?php

namespace App\Service;

use App\Entity\User;
use App\Repository\CompanyRepository;
use App\Repository\ProjectRepository;

/**
 * Charge les données visibles par l'utilisateur courant (mêmes règles de
 * visibilité que loadAllContexts() dans business-plan-front/src/utils/dashboardExport.ts,
 * càd User::isCanView() = équivalent PHP de canSeeAll(role) côté frontend),
 * lance les calculs financiers pour chaque entreprise visible via
 * FinancialCalculationService::computeAll(), trie par promoteur, et prépare
 * la structure attendue par DashboardXlsxBuilder::build().
 *
 * Utilisé par GetDashboardExportController pour l'export "Power Query" complet
 * ou filtré sur un seul projet (paramètre ?project=<id>).
 */
class DashboardExportService
{
    public function __construct(
        private readonly ProjectRepository $projectRepository,
        private readonly CompanyRepository $companyRepository,
        private readonly FinancialCalculationService $calc,
    ) {}

    /**
     * @return array{contexts: array, skipped: array{name: string, reason: string}[]}
     */
    public function loadContexts(User $currentUser, ?int $projectId = null): array
    {
        $seeAll = $currentUser->isCanView();
        $projects = $this->projectRepository->findAllWithCompanies();

        // 1) Détermine les entreprises visibles (mêmes règles que l'éditeur /
        //    GetCompanyController : accès total si canView, sinon uniquement
        //    ses propres entreprises non validées).
        $targets = [];
        foreach ($projects as $project) {
            if ($projectId !== null && $project->getId() !== $projectId) {
                continue;
            }
            foreach ($project->getCompanies() as $company) {
                $visible = $seeAll || (
                    $company->getCreatedBy()?->getId() === $currentUser->getId()
                    && !$company->isValidated()
                );
                if ($visible) {
                    $targets[] = ['projectName' => $project->getName(), 'companyId' => $company->getId()];
                }
            }
        }

        // 2) Recharge chaque entreprise avec toutes ses relations (produits,
        //    matières, personnel, charges, investissements, financements...)
        //    et relance les calculs financiers complets.
        $contexts = [];
        $skipped = [];

        foreach ($targets as $target) {
            $company = $this->companyRepository->findOneWithAllRelations($target['companyId']);
            if ($company === null) {
                $skipped[] = ['name' => "#{$target['companyId']}", 'reason' => 'Entreprise introuvable.'];
                continue;
            }

            $settings = $company->getSettings();
            if ($settings === null) {
                $skipped[] = ['name' => $company->getName(), 'reason' => 'Paramètres financiers non configurés.'];
                continue;
            }

            try {
                $result = $this->calc->computeAll(
                    $settings,
                    $company->getProducts()->toArray(),
                    $company->getMaterials()->toArray(),
                    $company->getStaffMembers()->toArray(),
                    $company->getExpenses()->toArray(),
                    $company->getInvestments()->toArray(),
                    $company->getAdditionalFundings()->toArray(),
                );
                $contexts[] = [
                    'projectName' => $target['projectName'],
                    'company' => $company,
                    'result' => $result,
                ];
            } catch (\Throwable $e) {
                $skipped[] = ['name' => $company->getName(), 'reason' => 'Erreur de calcul : ' . $e->getMessage()];
            }
        }

        // 3) Trie par promoteur (ordre alphabétique français), comme côté frontend.
        usort($contexts, function (array $a, array $b): int {
            $pa = $this->normalizeForSort($a['company']->getPromoteur());
            $pb = $this->normalizeForSort($b['company']->getPromoteur());
            if (class_exists(\Collator::class)) {
                $collator = new \Collator('fr_FR');
                $cmp = $collator->compare($pa, $pb);
                return $cmp === false ? strcasecmp($pa, $pb) : $cmp;
            }
            return strcasecmp($pa, $pb);
        });

        return ['contexts' => $contexts, 'skipped' => $skipped];
    }

    private function normalizeForSort(?string $v): string
    {
        return $v !== null && trim($v) !== '' ? trim($v) : '(Non renseigné)';
    }
}
