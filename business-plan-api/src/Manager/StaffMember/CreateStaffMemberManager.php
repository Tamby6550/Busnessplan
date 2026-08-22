<?php

namespace App\Manager\StaffMember;

use App\Entity\Company;
use App\Entity\StaffMember;
use App\Entity\User;
use App\Manager\Company\UpdateCompanySnapshotManager;
use App\Repository\StaffMemberRepository;
use Doctrine\ORM\EntityManagerInterface;

class CreateStaffMemberManager
{
    public function __construct(
        private readonly EntityManagerInterface      $em,
        private readonly StaffMemberRepository       $staffRepository,
        private readonly UpdateCompanySnapshotManager $snapshotManager,
    ) {}

    /**
     * @param array{roleName: string, monthlySalary?: int, headcount?: int, chargesRate?: float, growthRates?: array} $data
     */
    public function create(Company $company, User $modifiedBy, array $data = []): StaffMember
    {
        // Nouveau poste en tête de liste (sortOrder le plus bas - 1, la liste étant triée ASC)
        $nextOrder = $this->staffRepository->findMinSortOrderByCompany($company->getId()) - 1;

        $staff = new StaffMember();
        $staff->setCompany($company);
        $staff->setRoleName($data['roleName'] ?? 'Poste');
        $staff->setMonthlySalary((int) ($data['monthlySalary'] ?? 0));
        $staff->setHeadcount((int) ($data['headcount'] ?? 1));
        $staff->setChargesRate((float) ($data['chargesRate'] ?? 13.0));
        $staff->setGrowthRates((array) ($data['growthRates'] ?? [0, 0, 0, 0]));
        $staff->setSortOrder($nextOrder);
        $company->setLastModifiedBy($modifiedBy);

        $this->em->persist($staff);
        $this->em->flush();
        $this->snapshotManager->update($company);

        return $staff;
    }
}
