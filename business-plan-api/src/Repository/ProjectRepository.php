<?php

namespace App\Repository;

use App\Entity\Project;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Project>
 */
class ProjectRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Project::class);
    }

    /**
     * Charge tous les projets avec leurs entreprises et snapshots (pour le dashboard).
     * @return Project[]
     */
    public function findAllWithCompanies(): array
    {
        return $this->createQueryBuilder('p')
            ->leftJoin('p.companies', 'c')
            ->leftJoin('c.snapshot', 's')
            ->leftJoin('c.createdBy', 'cb')
            ->leftJoin('c.lastModifiedBy', 'lmb')
            ->addSelect('c', 's', 'cb', 'lmb')
            ->orderBy('p.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Charge uniquement les projets appartenant à un utilisateur donné.
     * @return Project[]
     */
    public function findAllWithCompaniesByUser(User $user): array
    {
        return $this->createQueryBuilder('p')
            ->leftJoin('p.companies', 'c')
            ->leftJoin('c.snapshot', 's')
            ->leftJoin('c.createdBy', 'cb')
            ->leftJoin('c.lastModifiedBy', 'lmb')
            ->addSelect('c', 's', 'cb', 'lmb')
            ->where('p.createdBy = :user')
            ->setParameter('user', $user)
            ->orderBy('p.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }
}
