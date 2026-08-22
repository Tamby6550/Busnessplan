<?php

namespace App\Manager\InvestmentTerrain;

use App\Entity\InvestmentTerrain;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;

class DeleteInvestmentTerrainManager
{
    public function __construct(
        private readonly EntityManagerInterface $em,
    ) {}

    public function delete(InvestmentTerrain $investment, User $modifiedBy): void
    {
        $company = $investment->getCompany();
        $company->setLastModifiedBy($modifiedBy);
        $this->em->remove($investment);
        $this->em->flush();
    }
}
