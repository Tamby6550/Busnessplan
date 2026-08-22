<?php

namespace App\Repository;

use App\Entity\Company;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Company>
 */
class CompanyRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Company::class);
    }

    /**
     * Charge une entreprise avec toutes ses relations (pour l'éditeur).
     * Utilise des JOINs pour éviter les requêtes N+1.
     */
    public function findOneWithAllRelations(int $id): ?Company
    {
        return $this->createQueryBuilder('c')
            ->leftJoin('c.settings', 's')
            ->leftJoin('c.products', 'prod')
            ->leftJoin('c.materials', 'mat')
            ->leftJoin('c.staffMembers', 'staff')
            ->leftJoin('c.expenses', 'exp')
            ->leftJoin('c.investments', 'inv')
            ->leftJoin('c.additionalFundings', 'af')
            ->leftJoin('c.project', 'proj')
            ->leftJoin('c.createdBy', 'cb')
            ->leftJoin('c.lastModifiedBy', 'lmb')
            ->addSelect('s', 'prod', 'mat', 'staff', 'exp', 'inv', 'af', 'proj', 'cb', 'lmb')
            ->where('c.id = :id')
            ->setParameter('id', $id)
            ->getQuery()
            ->getOneOrNullResult();
    }
}
