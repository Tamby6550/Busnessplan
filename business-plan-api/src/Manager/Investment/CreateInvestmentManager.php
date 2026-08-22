<?php

namespace App\Manager\Investment;

use App\Entity\Company;
use App\Entity\Investment;
use App\Entity\User;
use App\Manager\Company\UpdateCompanySnapshotManager;
use App\Repository\InvestmentRepository;
use Doctrine\ORM\EntityManagerInterface;

class CreateInvestmentManager
{
    public function __construct(
        private readonly EntityManagerInterface      $em,
        private readonly InvestmentRepository        $investmentRepository,
        private readonly UpdateCompanySnapshotManager $snapshotManager,
    ) {}

    /**
     * @param array{name: string, amount?: int, usefulLife?: int,
     *              financedEquity?: int, financedLoan?: int, financedGrant?: int,
     *              loanRate?: float, loanYears?: int, equipmentType?: ?string,
     *              contributionType?: string} $data
     */
    public function create(Company $company, User $modifiedBy, array $data = []): Investment
    {
        // Nouvel investissement en tête de liste (sortOrder le plus bas - 1, la liste étant triée ASC)
        $nextOrder = $this->investmentRepository->findMinSortOrderByCompany($company->getId()) - 1;

        $investment = new Investment();
        $investment->setCompany($company);
        $investment->setName($data['name'] ?? 'Immobilisation');
        $investment->setAmount((int) ($data['amount'] ?? 0));
        $investment->setUsefulLife((int) ($data['usefulLife'] ?? 5));
        $investment->setFinancedEquity((int) ($data['financedEquity'] ?? 0));
        $investment->setFinancedLoan((int) ($data['financedLoan'] ?? 0));
        $investment->setFinancedGrant((int) ($data['financedGrant'] ?? 0));
        $investment->setLoanRate((float) ($data['loanRate'] ?? 0.0));
        $investment->setLoanYears((int) ($data['loanYears'] ?? 5));
        $investment->setEquipmentType($data['equipmentType'] ?? null);
        $investment->setContributionType($data['contributionType'] ?? 'financier');
        $investment->setSortOrder($nextOrder);
        $company->setLastModifiedBy($modifiedBy);

        $this->em->persist($investment);
        $this->em->flush();
        $this->snapshotManager->update($company);

        return $investment;
    }
}
