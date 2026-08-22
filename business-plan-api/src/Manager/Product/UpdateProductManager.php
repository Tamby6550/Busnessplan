<?php

namespace App\Manager\Product;

use App\Entity\Product;
use App\Entity\User;
use App\Manager\Company\UpdateCompanySnapshotManager;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Met à jour les données d'un produit existant.
 */
class UpdateProductManager
{
    public function __construct(
        private readonly EntityManagerInterface      $em,
        private readonly UpdateCompanySnapshotManager $snapshotManager,
    ) {}

    public function update(Product $product, User $modifiedBy, array $data): Product
    {
        if (isset($data['name']))         $product->setName((string) $data['name']);
        if (isset($data['monthlyPrice'])) $product->setMonthlyPrices((array) $data['monthlyPrice']);
        if (isset($data['price']))        $product->setPrice((int) $data['price']); // rétro-compat : ne touche que Janvier
        if (isset($data['monthlyQty']))   $product->setMonthlyQty((array) $data['monthlyQty']);
        if (isset($data['growthRates']))  $product->setGrowthRates((array) $data['growthRates']);

        $product->getCompany()->setLastModifiedBy($modifiedBy);

        $this->em->flush();
        $this->snapshotManager->update($product->getCompany());

        return $product;
    }
}
