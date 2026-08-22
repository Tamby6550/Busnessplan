<?php

namespace App\Manager\AdditionalFunding;

use App\Entity\Company;
use App\Entity\User;
use App\Manager\Company\UpdateCompanySnapshotManager;
use App\Repository\AdditionalFundingRepository;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Met à jour les apports complémentaires An 1-5 d'une entreprise.
 * Reçoit un tableau de 5 objets (indexed 0..4 pour An 1..5).
 */
class UpdateAdditionalFundingManager
{
    public function __construct(
        private readonly EntityManagerInterface      $em,
        private readonly AdditionalFundingRepository $fundingRepository,
        private readonly UpdateCompanySnapshotManager $snapshotManager,
    ) {}

    public function update(Company $company, User $modifiedBy, array $fundingData): void
    {
        // $fundingData = [ ['yearNumber'=>1,'equity'=>0,'loan'=>0,...], ... ]
        foreach ($fundingData as $data) {
            $yearNumber = (int) ($data['yearNumber'] ?? 0);
            if ($yearNumber < 1 || $yearNumber > 5) continue;

            $funding = $this->fundingRepository->findOneBy([
                'company'    => $company,
                'yearNumber' => $yearNumber,
            ]);

            if ($funding === null) continue;

            if (isset($data['equity']))    $funding->setEquity((int) $data['equity']);
            if (isset($data['loan']))      $funding->setLoan((int) $data['loan']);
            if (isset($data['loanRate']))  $funding->setLoanRate((float) $data['loanRate']);
            if (isset($data['loanYears'])) $funding->setLoanYears((int) $data['loanYears']);
            if (isset($data['grant']))     $funding->setGrant((int) $data['grant']);
        }

        $company->setLastModifiedBy($modifiedBy);
        $this->em->flush();
        $this->snapshotManager->update($company);
    }
}
