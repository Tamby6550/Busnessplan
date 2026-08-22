<?php

namespace App\Manager\Expense;

use App\Entity\Expense;
use App\Entity\User;
use App\Manager\Company\UpdateCompanySnapshotManager;
use Doctrine\ORM\EntityManagerInterface;

class DeleteExpenseManager
{
    public function __construct(
        private readonly EntityManagerInterface      $em,
        private readonly UpdateCompanySnapshotManager $snapshotManager,
    ) {}

    public function delete(Expense $expense, User $modifiedBy): void
    {
        $company = $expense->getCompany();
        $company->setLastModifiedBy($modifiedBy);
        $this->em->remove($expense);
        $this->em->flush();
        $this->snapshotManager->update($company);
    }
}
