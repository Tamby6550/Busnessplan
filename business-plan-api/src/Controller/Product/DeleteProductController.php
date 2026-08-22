<?php

namespace App\Controller\Product;

use App\Entity\Product;
use App\Entity\User;
use App\Manager\Product\DeleteProductManager;
use App\Controller\Trait\ValidatedCompanyGuardTrait;
use Symfony\Bridge\Doctrine\Attribute\MapEntity;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Supprime un produit/service et recalcule le snapshot de l'entreprise.
 */
#[Route('/api/products/{id}', name: 'api_delete_product', methods: ['DELETE'])]
class DeleteProductController extends AbstractController
{
    use ValidatedCompanyGuardTrait;

    public function __construct(
        private readonly DeleteProductManager $deleteProductManager,
    ) {}

    public function __invoke(
        #[MapEntity(id: 'id')] Product $product,
        #[CurrentUser] User $user,
    ): JsonResponse {
        if ($deny = $this->denyIfValidated($product->getCompany(), $user)) return $deny;

        $this->deleteProductManager->delete($product, $user);

        return $this->json(null, Response::HTTP_NO_CONTENT);
    }
}
