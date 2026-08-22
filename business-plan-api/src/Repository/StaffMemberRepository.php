<?php

namespace App\Repository;

use App\Entity\StaffMember;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<StaffMember> */
class StaffMemberRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, StaffMember::class);
    }

    public function findMaxSortOrderByCompany(int $companyId): int
    {
        $result = $this->createQueryBuilder('s')
            ->select('MAX(s.sortOrder)')
            ->where('s.company = :companyId')
            ->setParameter('companyId', $companyId)
            ->getQuery()
            ->getSingleScalarResult();

        return (int) $result;
    }

    /** Utilisé pour faire apparaître un nouvel élément en tête de liste (sortOrder le plus bas - 1). */
    public function findMinSortOrderByCompany(int $companyId): int
    {
        $result = $this->createQueryBuilder('s')
            ->select('MIN(s.sortOrder)')
            ->where('s.company = :companyId')
            ->setParameter('companyId', $companyId)
            ->getQuery()
            ->getSingleScalarResult();

        return (int) $result;
    }
}
