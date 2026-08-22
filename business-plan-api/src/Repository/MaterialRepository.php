<?php

namespace App\Repository;

use App\Entity\Material;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<Material> */
class MaterialRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Material::class);
    }

    public function findMaxSortOrderByCompany(int $companyId): int
    {
        $result = $this->createQueryBuilder('m')
            ->select('MAX(m.sortOrder)')
            ->where('m.company = :companyId')
            ->setParameter('companyId', $companyId)
            ->getQuery()
            ->getSingleScalarResult();

        return (int) $result;
    }

    /** Utilisé pour faire apparaître un nouvel élément en tête de liste (sortOrder le plus bas - 1). */
    public function findMinSortOrderByCompany(int $companyId): int
    {
        $result = $this->createQueryBuilder('m')
            ->select('MIN(m.sortOrder)')
            ->where('m.company = :companyId')
            ->setParameter('companyId', $companyId)
            ->getQuery()
            ->getSingleScalarResult();

        return (int) $result;
    }
}
