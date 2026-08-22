<?php

namespace App\Manager\Material;

use App\Entity\Material;
use App\Entity\User;
use App\Manager\Company\UpdateCompanySnapshotManager;
use Doctrine\ORM\EntityManagerInterface;

class UpdateMaterialManager
{
    public function __construct(
        private readonly EntityManagerInterface      $em,
        private readonly UpdateCompanySnapshotManager $snapshotManager,
    ) {}

    public function update(Material $material, User $modifiedBy, array $data): Material
    {
        if (isset($data['name']))            $material->setName((string) $data['name']);
        if (isset($data['monthlyUnitCost'])) $material->setMonthlyUnitCosts((array) $data['monthlyUnitCost']);
        if (isset($data['unitCost']))        $material->setUnitCost((int) $data['unitCost']); // rétro-compat : ne touche que Janvier
        if (isset($data['monthlyQty']))      $material->setMonthlyQty((array) $data['monthlyQty']);
        if (isset($data['growthRates']))     $material->setGrowthRates((array) $data['growthRates']);

        $material->getCompany()->setLastModifiedBy($modifiedBy);
        $this->em->flush();
        $this->snapshotManager->update($material->getCompany());

        return $material;
    }
}
