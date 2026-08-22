<?php

namespace App\Controller\InvestmentTerrain;

use App\Entity\InvestmentTerrain;
use App\Entity\User;
use App\Manager\InvestmentTerrain\DeleteInvestmentTerrainManager;
use App\Controller\Trait\ValidatedCompanyGuardTrait;
use Symfony\Bridge\Doctrine\Attribute\MapEntity;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Supprime un investissement Terrain.
 */
#[Route('/api/investment-terrains/{id}', name: 'api_delete_investment_terrain', methods: ['DELETE'])]
class DeleteInvestmentTerrainController extends AbstractController
{
    use ValidatedCompanyGuardTrait;

    public function __construct(
        private readonly DeleteInvestmentTerrainManager $deleteInvestmentTerrainManager,
    ) {}

    public function __invoke(
        #[MapEntity(id: 'id')] InvestmentTerrain $investment,
        #[CurrentUser] User $user,
    ): JsonResponse {
        if ($deny = $this->denyIfValidated($investment->getCompany(), $user)) return $deny;

        $this->deleteInvestmentTerrainManager->delete($investment, $user);

        return $this->json(null, Response::HTTP_NO_CONTENT);
    }
}
