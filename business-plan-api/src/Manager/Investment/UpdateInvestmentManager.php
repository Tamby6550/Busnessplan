<?php

namespace App\Manager\Investment;

use App\Entity\Investment;
use App\Entity\User;
use App\Manager\Company\UpdateCompanySnapshotManager;
use Doctrine\ORM\EntityManagerInterface;

class UpdateInvestmentManager
{
    public function __construct(
        private readonly EntityManagerInterface      $em,
        private readonly UpdateCompanySnapshotManager $snapshotManager,
    ) {}

    public function update(Investment $investment, User $modifiedBy, array $data): Investment
    {
        if (isset($data['name']))           $investment->setName((string) $data['name']);
        if (isset($data['category']))       $investment->setCategory($data['category'] ? (string) $data['category'] : null);
        if (isset($data['amount']))         $investment->setAmount((int) $data['amount']);
        if (isset($data['usefulLife']))     $investment->setUsefulLife((int) $data['usefulLife']);
        if (isset($data['financedEquity'])) $investment->setFinancedEquity((int) $data['financedEquity']);
        if (isset($data['financedLoan']))   $investment->setFinancedLoan((int) $data['financedLoan']);
        if (isset($data['financedGrant']))  $investment->setFinancedGrant((int) $data['financedGrant']);
        if (isset($data['loanRate']))       $investment->setLoanRate((float) $data['loanRate']);
        if (isset($data['loanYears']))      $investment->setLoanYears((int) $data['loanYears']);
        if (array_key_exists('equipmentType', $data)) $investment->setEquipmentType($data['equipmentType'] ? (string) $data['equipmentType'] : null);
        if (isset($data['contributionType']))         $investment->setContributionType((string) $data['contributionType']);

        $investment->getCompany()->setLastModifiedBy($modifiedBy);
        $this->em->flush();
        $this->snapshotManager->update($investment->getCompany());

        return $investment;
    }
}
