<?php

namespace App\Controller\Material;

use App\Entity\Material;
use App\Entity\User;
use App\Manager\Material\UpdateMaterialManager;
use App\Controller\Trait\ValidatedCompanyGuardTrait;
use Symfony\Bridge\Doctrine\Attribute\MapEntity;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Met à jour une matière première (coût unitaire, quantités, taux de croissance).
 */
#[Route('/api/materials/{id}', name: 'api_update_material', methods: ['PATCH'])]
class UpdateMaterialController extends AbstractController
{
    use ValidatedCompanyGuardTrait;

    public function __construct(
        private readonly UpdateMaterialManager $updateMaterialManager,
    ) {}

    public function __invoke(
        #[MapEntity(id: 'id')] Material $material,
        Request $request,
        #[CurrentUser] User $user,
    ): JsonResponse {
        if ($deny = $this->denyIfValidated($material->getCompany(), $user)) return $deny;

        $body = json_decode($request->getContent(), true) ?? [];

        $this->updateMaterialManager->update($material, $user, $body);

        return $this->json([
            'id'              => $material->getId(),
            'name'            => $material->getName(),
            'monthlyUnitCost' => $material->getMonthlyUnitCosts(),
            'monthlyQty'      => $material->getMonthlyQty(),
            'growthRates'     => $material->getGrowthRates(),
            'sortOrder'       => $material->getSortOrder(),
        ]);
    }
}
