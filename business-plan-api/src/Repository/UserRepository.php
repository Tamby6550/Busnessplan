<?php

namespace App\Repository;

use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Security\Core\Exception\UnsupportedUserException;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\PasswordUpgraderInterface;

/**
 * @extends ServiceEntityRepository<User>
 */
class UserRepository extends ServiceEntityRepository implements PasswordUpgraderInterface
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, User::class);
    }

    public function upgradePassword(PasswordAuthenticatedUserInterface $user, string $newHashedPassword): void
    {
        if (!$user instanceof User) {
            throw new UnsupportedUserException(sprintf('Instances of "%s" are not supported.', $user::class));
        }
        $user->setPasswordHash($newHashedPassword);
        $this->getEntityManager()->persist($user);
        $this->getEntityManager()->flush();
    }

    public function findActiveByEmail(string $email): ?User
    {
        return $this->createQueryBuilder('u')
            ->where('u.email = :email')
            ->andWhere('u.isActive = true')
            ->setParameter('email', $email)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /** @return User[] */
    public function findAllActive(): array
    {
        return $this->createQueryBuilder('u')
            ->where('u.isActive = true')
            ->orderBy('u.firstName', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * Un utilisateur actif admin/manager quelconque — utilisé par
     * app:cache-dashboard-exports comme contexte de visibilité pour la
     * pré-génération (admin/manager ont toujours isCanView() = true, donc
     * les données visibles sont les mêmes quel que soit celui choisi ici).
     */
    public function findOneActiveCanExport(): ?User
    {
        return $this->createQueryBuilder('u')
            ->where('u.isActive = true')
            ->andWhere('u.role IN (:roles)')
            ->setParameter('roles', ['admin', 'manager'])
            ->orderBy('u.id', 'ASC')
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }
}
