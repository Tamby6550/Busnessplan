<?php

namespace App\Controller\Material;

use App\Entity\Company;
use App\Entity\User;
use App\Manager\Material\CreateMaterialManager;
use App\Controller\Trait\ValidatedCompanyGuardTrait;
use Symfony\Bridge\Doctrine\Attribute\MapEntity;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Ajoute une matière première / matière consommable à une entreprise.
 * Body attendu : { "name": "...", "monthlyUnitCost": [janv,fev,...,dec],
 *                  "monthlyQty": [0,...], "growthRates": [0,...] }
 */
#[Route('/api/companies/{companyId}/materials', name: 'api_create_material', methods: ['POST'])]
class CreateMaterialController extends AbstractController
{
    use ValidatedCompanyGuardTrait;

    public function __construct(
        private readonly CreateMaterialManager $createMaterialManager,
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
            return $this->json(['error' => 'Le nom de la matière est obligatoire.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $material = $this->createMaterialManager->create($company, $user, [
            'name'            => $name,
            'monthlyUnitCost' => $body['monthlyUnitCost'] ?? array_fill(0, 12, 0),
            'monthlyQty'      => $body['monthlyQty'] ?? array_fill(0, 12, 0),
            'growthRates'     => $body['growthRates'] ?? array_fill(0, 5, 0),
        ]);

        return $this->json([
            'id'              => $material->getId(),
            'name'            => $material->getName(),
            'monthlyUnitCost' => $material->getMonthlyUnitCosts(),
            'monthlyQty'      => $material->getMonthlyQty(),
            'growthRates'     => $material->getGrowthRates(),
            'sortOrder'       => $material->getSortOrder(),
        ], Response::HTTP_CREATED);
    }
}
