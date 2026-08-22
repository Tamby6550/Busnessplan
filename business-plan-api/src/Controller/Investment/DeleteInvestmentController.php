<?php

namespace App\Controller\Investment;

use App\Entity\Investment;
use App\Entity\User;
use App\Manager\Investment\DeleteInvestmentManager;
use App\Controller\Trait\ValidatedCompanyGuardTrait;
use Symfony\Bridge\Doctrine\Attribute\MapEntity;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Supprime un investissement et recalcule le snapshot.
 */
#[Route('/api/investments/{id}', name: 'api_delete_investment', methods: ['DELETE'])]
class DeleteInvestmentController extends AbstractController
{
    use ValidatedCompanyGuardTrait;

    public function __construct(
        private readonly DeleteInvestmentManager $deleteInvestmentManager,
    ) {}

    public function __invoke(
        #[MapEntity(id: 'id')] Investment $investment,
        #[CurrentUser] User $user,
    ): JsonResponse {
        if ($deny = $this->denyIfValidated($investment->getCompany(), $user)) return $deny;

        $this->deleteInvestmentManager->delete($investment, $user);

        return $this->json(null, Response::HTTP_NO_CONTENT);
    }
}
