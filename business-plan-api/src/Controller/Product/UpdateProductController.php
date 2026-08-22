<?php

namespace App\Controller\Product;

use App\Entity\Product;
use App\Entity\User;
use App\Manager\Product\UpdateProductManager;
use App\Controller\Trait\ValidatedCompanyGuardTrait;
use Symfony\Bridge\Doctrine\Attribute\MapEntity;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Met à jour un produit/service (prix, quantités mensuelles, taux de croissance).
 * Body accepte un sous-ensemble des champs : seuls les champs présents sont mis à jour.
 */
#[Route('/api/products/{id}', name: 'api_update_product', methods: ['PATCH'])]
class UpdateProductController extends AbstractController
{
    use ValidatedCompanyGuardTrait;

    public function __construct(
        private readonly UpdateProductManager $updateProductManager,
    ) {}

    public function __invoke(
        #[MapEntity(id: 'id')] Product $product,
        Request $request,
        #[CurrentUser] User $user,
    ): JsonResponse {
        if ($deny = $this->denyIfValidated($product->getCompany(), $user)) return $deny;

        $body = json_decode($request->getContent(), true) ?? [];

        $this->updateProductManager->update($product, $user, $body);

        return $this->json([
            'id'           => $product->getId(),
            'name'         => $product->getName(),
            'monthlyPrice' => $product->getMonthlyPrices(),
            'monthlyQty'   => $product->getMonthlyQty(),
            'growthRates'  => $product->getGrowthRates(),
            'sortOrder'    => $product->getSortOrder(),
        ]);
    }
}
