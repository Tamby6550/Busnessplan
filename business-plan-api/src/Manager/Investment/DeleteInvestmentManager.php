<?php

namespace App\Manager\Investment;

use App\Entity\Investment;
use App\Entity\User;
use App\Manager\Company\UpdateCompanySnapshotManager;
use Doctrine\ORM\EntityManagerInterface;

class DeleteInvestmentManager
{
    public function __construct(
        private readonly EntityManagerInterface      $em,
        private readonly UpdateCompanySnapshotManager $snapshotManager,
    ) {}

    public function delete(Investment $investment, User $modifiedBy): void
    {
        $company = $investment->getCompany();
        $company->setLastModifiedBy($modifiedBy);
        $this->em->remove($investment);
        $this->em->flush();
        $this->snapshotManager->update($company);
    }
}
