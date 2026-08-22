<?php

namespace App\Manager\Expense;

use App\Entity\Company;
use App\Entity\Expense;
use App\Entity\User;
use App\Manager\Company\UpdateCompanySnapshotManager;
use App\Repository\ExpenseRepository;
use Doctrine\ORM\EntityManagerInterface;

class CreateExpenseManager
{
    public function __construct(
        private readonly EntityManagerInterface      $em,
        private readonly ExpenseRepository           $expenseRepository,
        private readonly UpdateCompanySnapshotManager $snapshotManager,
    ) {}

    /**
     * @param array{name: string, monthlyAmounts?: array, seasonality?: array, inflationGrowth?: array} $data
     */
    public function create(Company $company, User $modifiedBy, array $data = []): Expense
    {
        // Nouvelle charge en tête de liste (sortOrder le plus bas - 1, la liste étant triée ASC)
        $nextOrder = $this->expenseRepository->findMinSortOrderByCompany($company->getId()) - 1;

        $expense = new Expense();
        $expense->setCompany($company);
        $expense->setName($data['name'] ?? 'Charge');
        $expense->setMonthlyAmounts($data['monthlyAmounts'] ?? array_fill(0, 12, 0));
        $expense->setSeasonality($data['seasonality'] ?? array_fill(0, 12, 1));
        $expense->setInflationGrowth($data['inflationGrowth'] ?? array_fill(0, 5, 0));
        $expense->setSortOrder($nextOrder);
        $company->setLastModifiedBy($modifiedBy);

        $this->em->persist($expense);
        $this->em->flush();
        $this->snapshotManager->update($company);

        return $expense;
    }
}
