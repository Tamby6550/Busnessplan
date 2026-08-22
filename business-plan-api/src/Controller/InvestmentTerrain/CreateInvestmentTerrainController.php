<?php

namespace App\Controller\InvestmentTerrain;

use App\Entity\Company;
use App\Entity\User;
use App\Manager\InvestmentTerrain\CreateInvestmentTerrainManager;
use App\Controller\Trait\ValidatedCompanyGuardTrait;
use Symfony\Bridge\Doctrine\Attribute\MapEntity;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Ajoute un investissement Terrain à une entreprise.
 * Table séparée de l'investissement général : pas de durée d'amortissement
 * (un terrain n'est jamais amorti) et pas de plan de financement (fonds
 * propres / subvention / emprunt) — aucun lien avec la trésorerie.
 * Body attendu : { "name": "Terrain X", "amount": 5000000 }
 */
#[Route('/api/companies/{companyId}/investment-terrains', name: 'api_create_investment_terrain', methods: ['POST'])]
class CreateInvestmentTerrainController extends AbstractController
{
    use ValidatedCompanyGuardTrait;

    public function __construct(
        private readonly CreateInvestmentTerrainManager $createInvestmentTerrainManager,
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
            return $this->json(['error' => "Le nom de l'investissement terrain est obligatoire."], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $investment = $this->createInvestmentTerrainManager->create($company, $user, [
            'name'   => $name,
            'amount' => $body['amount'] ?? 0,
        ]);

        return $this->json([
            'id'        => $investment->getId(),
            'name'      => $investment->getName(),
            'amount'    => $investment->getAmount(),
            'sortOrder' => $investment->getSortOrder(),
        ], Response::HTTP_CREATED);
    }
}
