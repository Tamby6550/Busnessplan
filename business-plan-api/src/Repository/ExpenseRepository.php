<?php

namespace App\Repository;

use App\Entity\Expense;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<Expense> */
class ExpenseRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Expense::class);
    }

    public function findMaxSortOrderByCompany(int $companyId): int
    {
        $result = $this->createQueryBuilder('e')
            ->select('MAX(e.sortOrder)')
            ->where('e.company = :companyId')
            ->setParameter('companyId', $companyId)
            ->getQuery()
            ->getSingleScalarResult();

        return (int) $result;
    }

    /** Utilisé pour faire apparaître un nouvel élément en tête de liste (sortOrder le plus bas - 1). */
    public function findMinSortOrderByCompany(int $companyId): int
    {
        $result = $this->createQueryBuilder('e')
            ->select('MIN(e.sortOrder)')
            ->where('e.company = :companyId')
            ->setParameter('companyId', $companyId)
            ->getQuery()
            ->getSingleScalarResult();

        return (int) $result;
    }
}
