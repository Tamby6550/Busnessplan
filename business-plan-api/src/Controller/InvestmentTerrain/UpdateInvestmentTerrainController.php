<?php

namespace App\Controller\InvestmentTerrain;

use App\Entity\InvestmentTerrain;
use App\Entity\User;
use App\Manager\InvestmentTerrain\UpdateInvestmentTerrainManager;
use App\Controller\Trait\ValidatedCompanyGuardTrait;
use Symfony\Bridge\Doctrine\Attribute\MapEntity;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Met à jour un investissement Terrain (désignation, montant).
 * Pas de durée d'amortissement, pas de plan de financement : aucun lien
 * avec la trésorerie.
 */
#[Route('/api/investment-terrains/{id}', name: 'api_update_investment_terrain', methods: ['PATCH'])]
class UpdateInvestmentTerrainController extends AbstractController
{
    use ValidatedCompanyGuardTrait;

    public function __construct(
        private readonly UpdateInvestmentTerrainManager $updateInvestmentTerrainManager,
    ) {}

    public function __invoke(
        #[MapEntity(id: 'id')] InvestmentTerrain $investment,
        Request $request,
        #[CurrentUser] User $user,
    ): JsonResponse {
        if ($deny = $this->denyIfValidated($investment->getCompany(), $user)) return $deny;

        $body = json_decode($request->getContent(), true) ?? [];

        $this->updateInvestmentTerrainManager->update($investment, $user, $body);

        return $this->json([
            'id'        => $investment->getId(),
            'name'      => $investment->getName(),
            'amount'    => $investment->getAmount(),
            'sortOrder' => $investment->getSortOrder(),
        ]);
    }
}
