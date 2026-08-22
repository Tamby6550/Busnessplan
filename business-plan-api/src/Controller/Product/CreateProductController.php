<?php

namespace App\Controller\Product;

use App\Entity\Company;
use App\Entity\User;
use App\Manager\Product\CreateProductManager;
use App\Controller\Trait\ValidatedCompanyGuardTrait;
use Symfony\Bridge\Doctrine\Attribute\MapEntity;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Ajoute un produit/service à une entreprise.
 * Body attendu : { "name": "...", "monthlyPrice": [janv,fev,...,dec],
 *                  "monthlyQty": [0,0,...], "growthRates": [0,0,...] }
 */
#[Route('/api/companies/{companyId}/products', name: 'api_create_product', methods: ['POST'])]
class CreateProductController extends AbstractController
{
    use ValidatedCompanyGuardTrait;

    public function __construct(
        private readonly CreateProductManager $createProductManager,
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
            return $this->json(['error' => 'Le nom du produit est obligatoire.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $product = $this->createProductManager->create($company, $user, [
            'name'         => $name,
            'monthlyPrice' => $body['monthlyPrice'] ?? array_fill(0, 12, 0),
            'monthlyQty'   => $body['monthlyQty'] ?? array_fill(0, 12, 0),
            'growthRates'  => $body['growthRates'] ?? array_fill(0, 5, 0),
        ]);

        return $this->json([
            'id'           => $product->getId(),
            'name'         => $product->getName(),
            'monthlyPrice' => $product->getMonthlyPrices(),
            'monthlyQty'   => $product->getMonthlyQty(),
            'growthRates'  => $product->getGrowthRates(),
            'sortOrder'    => $product->getSortOrder(),
        ], Response::HTTP_CREATED);
    }
}
