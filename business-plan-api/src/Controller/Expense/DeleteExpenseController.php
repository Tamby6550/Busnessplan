<?php

namespace App\Controller\Expense;

use App\Entity\Expense;
use App\Entity\User;
use App\Manager\Expense\DeleteExpenseManager;
use App\Controller\Trait\ValidatedCompanyGuardTrait;
use Symfony\Bridge\Doctrine\Attribute\MapEntity;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Supprime une charge d'exploitation et recalcule le snapshot.
 */
#[Route('/api/expenses/{id}', name: 'api_delete_expense', methods: ['DELETE'])]
class DeleteExpenseController extends AbstractController
{
    use ValidatedCompanyGuardTrait;

    public function __construct(
        private readonly DeleteExpenseManager $deleteExpenseManager,
    ) {}

    public function __invoke(
        #[MapEntity(id: 'id')] Expense $expense,
        #[CurrentUser] User $user,
    ): JsonResponse {
        if ($deny = $this->denyIfValidated($expense->getCompany(), $user)) return $deny;

        $this->deleteExpenseManager->delete($expense, $user);

        return $this->json(null, Response::HTTP_NO_CONTENT);
    }
}
