<?php

namespace App\Manager\StaffMember;

use App\Entity\StaffMember;
use App\Entity\User;
use App\Manager\Company\UpdateCompanySnapshotManager;
use Doctrine\ORM\EntityManagerInterface;

class UpdateStaffMemberManager
{
    public function __construct(
        private readonly EntityManagerInterface      $em,
        private readonly UpdateCompanySnapshotManager $snapshotManager,
    ) {}

    public function update(StaffMember $staffMember, User $modifiedBy, array $data): StaffMember
    {
        if (isset($data['roleName']))      $staffMember->setRoleName((string) $data['roleName']);
        if (isset($data['monthlySalary'])) $staffMember->setMonthlySalary((int) $data['monthlySalary']);
        if (isset($data['headcount']))     $staffMember->setHeadcount((int) $data['headcount']);
        if (isset($data['chargesRate']))   $staffMember->setChargesRate((float) $data['chargesRate']);
        if (isset($data['growthRates']))   $staffMember->setGrowthRates((array) $data['growthRates']);

        $staffMember->getCompany()->setLastModifiedBy($modifiedBy);
        $this->em->flush();
        $this->snapshotManager->update($staffMember->getCompany());

        return $staffMember;
    }
}
