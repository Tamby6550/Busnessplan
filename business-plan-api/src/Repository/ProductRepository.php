<?php

namespace App\Repository;

use App\Entity\Product;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<Product> */
class ProductRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Product::class);
    }

    public function findMaxSortOrderByCompany(int $companyId): int
    {
        $result = $this->createQueryBuilder('p')
            ->select('MAX(p.sortOrder)')
            ->where('p.company = :companyId')
            ->setParameter('companyId', $companyId)
            ->getQuery()
            ->getSingleScalarResult();

        return (int) $result;
    }

    /** Utilisé pour faire apparaître un nouvel élément en tête de liste (sortOrder le plus bas - 1). */
    public function findMinSortOrderByCompany(int $companyId): int
    {
        $result = $this->createQueryBuilder('p')
            ->select('MIN(p.sortOrder)')
            ->where('p.company = :companyId')
            ->setParameter('companyId', $companyId)
            ->getQuery()
            ->getSingleScalarResult();

        return (int) $result;
    }
}
