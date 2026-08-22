<?php

namespace App\Manager\Material;

use App\Entity\Material;
use App\Entity\User;
use App\Manager\Company\UpdateCompanySnapshotManager;
use Doctrine\ORM\EntityManagerInterface;

class DeleteMaterialManager
{
    public function __construct(
        private readonly EntityManagerInterface      $em,
        private readonly UpdateCompanySnapshotManager $snapshotManager,
    ) {}

    public function delete(Material $material, User $modifiedBy): void
    {
        $company = $material->getCompany();
        $company->setLastModifiedBy($modifiedBy);
        $this->em->remove($material);
        $this->em->flush();
        $this->snapshotManager->update($company);
    }
}
