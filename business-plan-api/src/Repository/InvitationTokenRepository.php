<?php

namespace App\Repository;

use App\Entity\InvitationToken;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class InvitationTokenRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, InvitationToken::class);
    }

    public function findValidByEmailAndToken(string $email, string $token): ?InvitationToken
    {
        return $this->createQueryBuilder('it')
            ->where('it.email = :email')
            ->andWhere('it.token = :token')
            ->andWhere('it.isUsed = false')
            ->andWhere('it.expiresAt > :now')
            ->setParameter('email', strtolower(trim($email)))
            ->setParameter('token', $token)
            ->setParameter('now', new \DateTimeImmutable())
            ->getQuery()
            ->getOneOrNullResult();
    }

    /** Invalide les anciens tokens non utilisés pour cet email (un seul actif à la fois) */
    public function invalidatePreviousTokens(string $email): void
    {
        $this->createQueryBuilder('it')
            ->update()
            ->set('it.isUsed', true)
            ->where('it.email = :email')
            ->andWhere('it.isUsed = false')
            ->setParameter('email', strtolower(trim($email)))
            ->getQuery()
            ->execute();
    }
}
