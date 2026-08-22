<?php

namespace App\Manager\Product;

use App\Entity\Company;
use App\Entity\Product;
use App\Entity\User;
use App\Manager\Company\UpdateCompanySnapshotManager;
use App\Repository\ProductRepository;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Ajoute un nouveau produit à une entreprise.
 */
class CreateProductManager
{
    public function __construct(
        private readonly EntityManagerInterface      $em,
        private readonly ProductRepository           $productRepository,
        private readonly UpdateCompanySnapshotManager $snapshotManager,
    ) {}

    /**
     * @param array{name: string, monthlyPrice?: array, monthlyQty?: array, growthRates?: array} $data
     */
    public function create(Company $company, User $modifiedBy, array $data = []): Product
    {
        // Nouveau produit en tête de liste (sortOrder le plus bas - 1, la liste étant triée ASC)
        $nextOrder = $this->productRepository->findMinSortOrderByCompany($company->getId()) - 1;

        $product = new Product();
        $product->setCompany($company);
        $product->setName($data['name'] ?? 'Produit');
        $product->setMonthlyPrices($data['monthlyPrice'] ?? array_fill(0, 12, 0));
        $product->setMonthlyQty($data['monthlyQty'] ?? array_fill(0, 12, 0));
        $product->setGrowthRates($data['growthRates'] ?? array_fill(0, 5, 0));
        $product->setSortOrder($nextOrder);

        $company->setLastModifiedBy($modifiedBy);

        $this->em->persist($product);
        $this->em->flush();

        $this->snapshotManager->update($company);

        return $product;
    }
}
