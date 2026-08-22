<?php

namespace App\Manager\Expense;

use App\Entity\Expense;
use App\Entity\User;
use App\Manager\Company\UpdateCompanySnapshotManager;
use Doctrine\ORM\EntityManagerInterface;

class UpdateExpenseManager
{
    public function __construct(
        private readonly EntityManagerInterface      $em,
        private readonly UpdateCompanySnapshotManager $snapshotManager,
    ) {}

    public function update(Expense $expense, User $modifiedBy, array $data): Expense
    {
        if (isset($data['name']))            $expense->setName((string) $data['name']);
        if (isset($data['monthlyAmounts']))  $expense->setMonthlyAmounts((array) $data['monthlyAmounts']);
        if (isset($data['monthlyAmount']))   $expense->setMonthlyAmount((int) $data['monthlyAmount']); // rétro-compat : ne touche que Janvier
        if (isset($data['seasonality']))     $expense->setSeasonality((array) $data['seasonality']);
        if (isset($data['inflationGrowth'])) $expense->setInflationGrowth((array) $data['inflationGrowth']);

        $expense->getCompany()->setLastModifiedBy($modifiedBy);
        $this->em->flush();
        $this->snapshotManager->update($expense->getCompany());

        return $expense;
    }
}
