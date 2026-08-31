<?php

namespace App\Manager\InvestmentTerrain;

use App\Entity\Company;
use App\Entity\InvestmentTerrain;
use App\Entity\User;
use App\Repository\InvestmentTerrainRepository;
use Doctrine\ORM\EntityManagerInterface;

class CreateInvestmentTerrainManager
{
    public function __construct(
        private readonly EntityManagerInterface        $em,
        private readonly InvestmentTerrainRepository    $investmentTerrainRepository,
    ) {}

    /**
     * @param array{name: string, amount?: int, natureType?: string} $data
     */
    public function create(Company $company, User $modifiedBy, array $data = []): InvestmentTerrain
    {
        // Nouvel investissement terrain en tête de liste (sortOrder le plus bas - 1)
        $nextOrder = $this->investmentTerrainRepository->findMinSortOrderByCompany($company->getId()) - 1;

        $investment = new InvestmentTerrain();
        $investment->setCompany($company);
        $investment->setName($data['name'] ?? 'Terrain');
        $investment->setAmount((int) ($data['amount'] ?? 0));
        $investment->setNatureType((string) ($data['natureType'] ?? 'physique'));
        $investment->setSortOrder($nextOrder);
        $company->setLastModifiedBy($modifiedBy);

        $this->em->persist($investment);
        $this->em->flush();

        return $investment;
    }
}
