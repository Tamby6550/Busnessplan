<?php

namespace App\Controller\Company;

use App\Entity\User;
use App\Repository\CompanyRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Retourne une entreprise complète avec toutes ses relations pour l'éditeur.
 * Charge : settings, products, materials, staffMembers, expenses, investments,
 *           additionalFundings, snapshot via un seul LEFT JOIN DQL.
 */
#[Route('/api/companies/{id}', name: 'api_get_company', methods: ['GET'])]
class GetCompanyController extends AbstractController
{
    public function __construct(
        private readonly CompanyRepository $companyRepository,
    ) {}

    public function __invoke(int $id, #[CurrentUser] User $currentUser): JsonResponse
    {
        $company = $this->companyRepository->findOneWithAllRelations($id);

        if ($company === null) {
            return $this->json(['error' => 'Entreprise introuvable.'], Response::HTTP_NOT_FOUND);
        }

        // Règle d'accès :
        // - Admin    : accès complet, modification possible même si validé
        // - canView  : accès en lecture seule à tout (géré côté frontend)
        // - canEdit  : accès à tout, modification si non validé (géré côté frontend)
        // - Standard : peut voir tout (y compris BP validés en lecture seule)
        //              mais ne peut modifier que ses propres BP non validés
        // Aucun utilisateur non-admin ne peut accéder à un BP dont il n'est pas créateur
        // ET qui n'est pas encore validé (les validés sont visibles par tous)
        if (!$currentUser->isAdmin() && !$currentUser->isCanView()) {
            $isOwner = $company->getCreatedBy()?->getId() === $currentUser->getId();
            if ($company->isValidated()) {
                return $this->json([
                    'error' => 'Ce business plan a été validé. Vous n\'y avez plus accès.',
                    'validated' => true,
                ], Response::HTTP_FORBIDDEN);
            }
            if (!$isOwner) {
                return $this->json(['error' => 'Accès refusé.'], Response::HTTP_FORBIDDEN);
            }
        }

        $settings = $company->getSettings();

        return $this->json([
            'id'                  => $company->getId(),
            'name'                => $company->getName(),
            'secteur'             => $company->getSecteur(),
            'promoteur'           => $company->getPromoteur(),
            'descriptionActivite' => $company->getDescriptionActivite(),
            'marche'              => $company->getMarche(),
            'genre'               => $company->getGenre(),
            'modeleEconomique'    => $company->getModeleEconomique(),
            'etatActivite'        => $company->getEtatActivite(),
            'updatedAt'           => $company->getUpdatedAt()->format('c'),
            'isValidated' => $company->isValidated(),
            'validatedAt' => $company->getValidatedAt()?->format('c'),
            'validatedBy' => $company->getValidatedBy() ? [
                'id'       => $company->getValidatedBy()->getId(),
                'fullName' => $company->getValidatedBy()->getFullName(),
            ] : null,
            'createdBy'   => $company->getCreatedBy() ? [
                'id'       => $company->getCreatedBy()->getId(),
                'fullName' => $company->getCreatedBy()->getFullName(),
            ] : null,
            'settings'  => $settings ? [
                'infl2'        => $settings->getInfl2(),
                'infl3'        => $settings->getInfl3(),
                'infl4'        => $settings->getInfl4(),
                'infl5'        => $settings->getInfl5(),
                'discountRate' => $settings->getDiscountRate(),
                'taxRegime'    => $settings->getTaxRegime(),
                'taxRate'      => $settings->getTaxRate(),
                'taxRateIs'    => $settings->getTaxRateIs(),
                'fondsRoulement' => $settings->getFondsRoulement(),
            ] : null,
            'products' => array_map(fn ($p) => [
                'id'           => $p->getId(),
                'name'         => $p->getName(),
                'monthlyPrice' => $p->getMonthlyPrices(),
                'monthlyQty'   => $p->getMonthlyQty(),
                'growthRates'  => $p->getGrowthRates(),
                'sortOrder'    => $p->getSortOrder(),
            ], $company->getProducts()->toArray()),
            'materials' => array_map(fn ($m) => [
                'id'              => $m->getId(),
                'name'            => $m->getName(),
                'monthlyUnitCost' => $m->getMonthlyUnitCosts(),
                'monthlyQty'      => $m->getMonthlyQty(),
                'growthRates'     => $m->getGrowthRates(),
                'sortOrder'       => $m->getSortOrder(),
            ], $company->getMaterials()->toArray()),
            'staffMembers' => array_map(fn ($s) => [
                'id'           => $s->getId(),
                'roleName'     => $s->getRoleName(),
                'monthlySalary' => $s->getMonthlySalary(),
                'headcount'    => $s->getHeadcount(),
                'chargesRate'  => $s->getChargesRate(),
                'growthRates'  => $s->getGrowthRates(),
                'sortOrder'    => $s->getSortOrder(),
            ], $company->getStaffMembers()->toArray()),
            'expenses' => array_map(fn ($e) => [
                'id'              => $e->getId(),
                'name'            => $e->getName(),
                'monthlyAmounts'  => $e->getMonthlyAmounts(),
                'seasonality'     => $e->getSeasonality(),
                'inflationGrowth' => $e->getInflationGrowth(),
                'sortOrder'       => $e->getSortOrder(),
            ], $company->getExpenses()->toArray()),
            'investments' => array_map(fn ($i) => [
                'id'               => $i->getId(),
                'name'             => $i->getName(),
                'amount'           => $i->getAmount(),
                'usefulLife'       => $i->getUsefulLife(),
                'financedEquity'   => $i->getFinancedEquity(),
                'financedLoan'     => $i->getFinancedLoan(),
                'financedGrant'    => $i->getFinancedGrant(),
                'loanRate'         => $i->getLoanRate(),
                'loanYears'        => $i->getLoanYears(),
                'equipmentType'    => $i->getEquipmentType(),
                'contributionType' => $i->getContributionType(),
                'sortOrder'        => $i->getSortOrder(),
            ], $company->getInvestments()->toArray()),
            'investmentTerrains' => array_map(fn ($i) => [
                'id'        => $i->getId(),
                'name'      => $i->getName(),
                'amount'    => $i->getAmount(),
                'sortOrder' => $i->getSortOrder(),
            ], $company->getInvestmentTerrains()->toArray()),
            'additionalFundings' => array_map(fn ($f) => [
                'yearNumber' => $f->getYearNumber(),
                'equity'     => $f->getEquity(),
                'loan'       => $f->getLoan(),
                'loanRate'   => $f->getLoanRate(),
                'loanYears'  => $f->getLoanYears(),
                'grant'      => $f->getGrant(),
            ], $company->getAdditionalFundings()->toArray()),
            'snapshot' => $company->getSnapshot() ? [
                'revenueY1'     => $company->getSnapshot()->getRevenueY1(),
                'netIncomeY1'   => $company->getSnapshot()->getNetIncomeY1(),
                'cashCumY1'     => $company->getSnapshot()->getCashCumY1(),
                'breakEven'     => $company->getSnapshot()->getBreakEven(),
                'completionPct' => $company->getSnapshot()->getCompletionPct(),
            ] : null,
        ]);
    }
}
