<?php

namespace App\Manager\Material;

use App\Entity\Company;
use App\Entity\Material;
use App\Entity\User;
use App\Manager\Company\UpdateCompanySnapshotManager;
use App\Repository\MaterialRepository;
use Doctrine\ORM\EntityManagerInterface;

class CreateMaterialManager
{
    public function __construct(
        private readonly EntityManagerInterface      $em,
        private readonly MaterialRepository          $materialRepository,
        private readonly UpdateCompanySnapshotManager $snapshotManager,
    ) {}

    /**
     * @param array{name: string, monthlyUnitCost?: array, monthlyQty?: array, growthRates?: array} $data
     */
    public function create(Company $company, User $modifiedBy, array $data = []): Material
    {
        // Nouvelle matière en tête de liste (sortOrder le plus bas - 1, la liste étant triée ASC)
        $nextOrder = $this->materialRepository->findMinSortOrderByCompany($company->getId()) - 1;

        $material = new Material();
        $material->setCompany($company);
        $material->setName($data['name'] ?? 'Matière');
        $material->setMonthlyUnitCosts($data['monthlyUnitCost'] ?? array_fill(0, 12, 0));
        $material->setMonthlyQty($data['monthlyQty'] ?? array_fill(0, 12, 0));
        $material->setGrowthRates($data['growthRates'] ?? array_fill(0, 5, 0));
        $material->setSortOrder($nextOrder);
        $company->setLastModifiedBy($modifiedBy);

        $this->em->persist($material);
        $this->em->flush();
        $this->snapshotManager->update($company);

        return $material;
    }
}
