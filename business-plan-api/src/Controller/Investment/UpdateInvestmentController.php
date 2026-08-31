<?php

namespace App\Controller\Investment;

use App\Entity\Investment;
use App\Entity\User;
use App\Manager\Investment\UpdateInvestmentManager;
use App\Controller\Trait\ValidatedCompanyGuardTrait;
use Symfony\Bridge\Doctrine\Attribute\MapEntity;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Met à jour un investissement (montant, durée, financement, taux d'emprunt).
 */
#[Route('/api/investments/{id}', name: 'api_update_investment', methods: ['PATCH'])]
class UpdateInvestmentController extends AbstractController
{
    use ValidatedCompanyGuardTrait;

    public function __construct(
        private readonly UpdateInvestmentManager $updateInvestmentManager,
    ) {}

    public function __invoke(
        #[MapEntity(id: 'id')] Investment $investment,
        Request $request,
        #[CurrentUser] User $user,
    ): JsonResponse {
        if ($deny = $this->denyIfValidated($investment->getCompany(), $user)) return $deny;

        $body = json_decode($request->getContent(), true) ?? [];

        $this->updateInvestmentManager->update($investment, $user, $body);

        return $this->json([
            'id'               => $investment->getId(),
            'name'             => $investment->getName(),
            'amount'           => $investment->getAmount(),
            'usefulLife'       => $investment->getUsefulLife(),
            'equipmentType'    => $investment->getEquipmentType(),
            'financedEquity'   => $investment->getFinancedEquity(),
            'contributionType' => $investment->getContributionType(),
            'financedLoan'     => $investment->getFinancedLoan(),
            'financedGrant'    => $investment->getFinancedGrant(),
            'loanRate'         => $investment->getLoanRate(),
            'loanYears'        => $investment->getLoanYears(),
            'sortOrder'        => $investment->getSortOrder(),
        ]);
    }
}
