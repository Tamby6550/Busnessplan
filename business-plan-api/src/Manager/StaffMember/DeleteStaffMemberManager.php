<?php

namespace App\Manager\StaffMember;

use App\Entity\StaffMember;
use App\Entity\User;
use App\Manager\Company\UpdateCompanySnapshotManager;
use Doctrine\ORM\EntityManagerInterface;

class DeleteStaffMemberManager
{
    public function __construct(
        private readonly EntityManagerInterface      $em,
        private readonly UpdateCompanySnapshotManager $snapshotManager,
    ) {}

    public function delete(StaffMember $staffMember, User $modifiedBy): void
    {
        $company = $staffMember->getCompany();
        $company->setLastModifiedBy($modifiedBy);
        $this->em->remove($staffMember);
        $this->em->flush();
        $this->snapshotManager->update($company);
    }
}
