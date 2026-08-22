<?php

namespace App\Controller\Expense;

use App\Entity\Expense;
use App\Entity\User;
use App\Manager\Expense\UpdateExpenseManager;
use App\Controller\Trait\ValidatedCompanyGuardTrait;
use Symfony\Bridge\Doctrine\Attribute\MapEntity;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Met à jour une charge d'exploitation (montant, saisonnalité, inflation).
 */
#[Route('/api/expenses/{id}', name: 'api_update_expense', methods: ['PATCH'])]
class UpdateExpenseController extends AbstractController
{
    use ValidatedCompanyGuardTrait;

    public function __construct(
        private readonly UpdateExpenseManager $updateExpenseManager,
    ) {}

    public function __invoke(
        #[MapEntity(id: 'id')] Expense $expense,
        Request $request,
        #[CurrentUser] User $user,
    ): JsonResponse {
        if ($deny = $this->denyIfValidated($expense->getCompany(), $user)) return $deny;

        $body = json_decode($request->getContent(), true) ?? [];

        $this->updateExpenseManager->update($expense, $user, $body);

        return $this->json([
            'id'              => $expense->getId(),
            'name'            => $expense->getName(),
            'monthlyAmounts'  => $expense->getMonthlyAmounts(),
            'seasonality'     => $expense->getSeasonality(),
            'inflationGrowth' => $expense->getInflationGrowth(),
            'sortOrder'       => $expense->getSortOrder(),
        ]);
    }
}
