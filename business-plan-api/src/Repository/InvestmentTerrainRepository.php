<?php

namespace App\Repository;

use App\Entity\InvestmentTerrain;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<InvestmentTerrain> */
class InvestmentTerrainRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, InvestmentTerrain::class);
    }

    public function findMaxSortOrderByCompany(int $companyId): int
    {
        $result = $this->createQueryBuilder('i')
            ->select('MAX(i.sortOrder)')
            ->where('i.company = :companyId')
            ->setParameter('companyId', $companyId)
            ->getQuery()
            ->getSingleScalarResult();

        return (int) $result;
    }

    /** Utilisé pour faire apparaître un nouvel élément en tête de liste (sortOrder le plus bas - 1). */
    public function findMinSortOrderByCompany(int $companyId): int
    {
        $result = $this->createQueryBuilder('i')
            ->select('MIN(i.sortOrder)')
            ->where('i.company = :companyId')
            ->setParameter('companyId', $companyId)
            ->getQuery()
            ->getSingleScalarResult();

        return (int) $result;
    }
}
