<?php

namespace App\Controller\Expense;

use App\Entity\Company;
use App\Entity\User;
use App\Manager\Expense\CreateExpenseManager;
use App\Controller\Trait\ValidatedCompanyGuardTrait;
use Symfony\Bridge\Doctrine\Attribute\MapEntity;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Ajoute une charge d'exploitation à une entreprise.
 * Body attendu : { "name": "Loyer", "monthlyAmounts": [janv,fev,...,dec],
 *                  "seasonality": [1,...], "inflationGrowth": [0,...] }
 */
#[Route('/api/companies/{companyId}/expenses', name: 'api_create_expense', methods: ['POST'])]
class CreateExpenseController extends AbstractController
{
    use ValidatedCompanyGuardTrait;

    public function __construct(
        private readonly CreateExpenseManager $createExpenseManager,
    ) {}

    public function __invoke(
        #[MapEntity(id: 'companyId')] Company $company,
        Request $request,
        #[CurrentUser] User $user,
    ): JsonResponse {
        if ($deny = $this->denyIfValidated($company, $user)) return $deny;

        $body = json_decode($request->getContent(), true) ?? [];

        $name = trim($body['name'] ?? '');
        if ($name === '') {
            return $this->json(['error' => 'Le nom de la charge est obligatoire.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $expense = $this->createExpenseManager->create($company, $user, [
            'name'            => $name,
            'monthlyAmounts'  => $body['monthlyAmounts'] ?? array_fill(0, 12, 0),
            'seasonality'     => $body['seasonality'] ?? array_fill(0, 12, 1),
            'inflationGrowth' => $body['inflationGrowth'] ?? array_fill(0, 5, 0),
        ]);

        return $this->json([
            'id'              => $expense->getId(),
            'name'            => $expense->getName(),
            'monthlyAmounts'  => $expense->getMonthlyAmounts(),
            'seasonality'     => $expense->getSeasonality(),
            'inflationGrowth' => $expense->getInflationGrowth(),
            'sortOrder'       => $expense->getSortOrder(),
        ], Response::HTTP_CREATED);
    }
}
