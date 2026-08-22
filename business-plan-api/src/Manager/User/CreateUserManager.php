<?php

namespace App\Manager\User;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Validator\Exception\ValidationFailedException;
use Symfony\Component\Validator\Validator\ValidatorInterface;

class CreateUserManager
{
    public function __construct(
        private readonly EntityManagerInterface      $em,
        private readonly UserPasswordHasherInterface $hasher,
        private readonly ValidatorInterface          $validator,
    ) {}

    public function create(
        string $email,
        string $plainPassword,
        string $firstName,
        string $lastName,
        string $role = 'standard',
    ): User {
        $user = new User();
        $user->setEmail(strtolower(trim($email)));
        $user->setFirstName(trim($firstName));
        $user->setLastName(trim($lastName));
        $user->setRole($role);

        $violations = $this->validator->validate($user);
        if (count($violations) > 0) {
            throw new ValidationFailedException($user, $violations);
        }

        $hashedPassword = $this->hasher->hashPassword($user, $plainPassword);
        $user->setPasswordHash($hashedPassword);

        $this->em->persist($user);
        $this->em->flush();

        return $user;
    }
}
