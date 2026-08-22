<?php

namespace App\Controller\Material;

use App\Entity\Material;
use App\Entity\User;
use App\Manager\Material\DeleteMaterialManager;
use App\Controller\Trait\ValidatedCompanyGuardTrait;
use Symfony\Bridge\Doctrine\Attribute\MapEntity;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Supprime une matière première et recalcule le snapshot.
 */
#[Route('/api/materials/{id}', name: 'api_delete_material', methods: ['DELETE'])]
class DeleteMaterialController extends AbstractController
{
    use ValidatedCompanyGuardTrait;

    public function __construct(
        private readonly DeleteMaterialManager $deleteMaterialManager,
    ) {}

    public function __invoke(
        #[MapEntity(id: 'id')] Material $material,
        #[CurrentUser] User $user,
    ): JsonResponse {
        if ($deny = $this->denyIfValidated($material->getCompany(), $user)) return $deny;

        $this->deleteMaterialManager->delete($material, $user);

        return $this->json(null, Response::HTTP_NO_CONTENT);
    }
}
