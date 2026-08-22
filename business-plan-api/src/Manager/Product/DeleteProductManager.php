<?php

namespace App\Manager\Product;

use App\Entity\Product;
use App\Entity\User;
use App\Manager\Company\UpdateCompanySnapshotManager;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Supprime un produit d'une entreprise.
 */
class DeleteProductManager
{
    public function __construct(
        private readonly EntityManagerInterface      $em,
        private readonly UpdateCompanySnapshotManager $snapshotManager,
    ) {}

    public function delete(Product $product, User $modifiedBy): void
    {
        $company = $product->getCompany();
        $company->setLastModifiedBy($modifiedBy);

        $this->em->remove($product);
        $this->em->flush();

        $this->snapshotManager->update($company);
    }
}
