<?php

namespace App\Manager\InvestmentTerrain;

use App\Entity\InvestmentTerrain;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;

class UpdateInvestmentTerrainManager
{
    public function __construct(
        private readonly EntityManagerInterface $em,
    ) {}

    public function update(InvestmentTerrain $investment, User $modifiedBy, array $data): InvestmentTerrain
    {
        if (isset($data['name']))   $investment->setName((string) $data['name']);
        if (isset($data['amount'])) $investment->setAmount((int) $data['amount']);

        $investment->getCompany()->setLastModifiedBy($modifiedBy);
        $this->em->flush();

        return $investment;
    }
}
