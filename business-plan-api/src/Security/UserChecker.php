<?php

namespace App\Security;

use App\Entity\User;
use Symfony\Component\Security\Core\Exception\CustomUserMessageAccountStatusException;
use Symfony\Component\Security\Core\User\UserCheckerInterface;
use Symfony\Component\Security\Core\User\UserInterface;

/**
 * Vérifie que le compte est actif avant chaque authentification.
 * Bloque les utilisateurs désactivés (isActive = false) dès le login.
 */
class UserChecker implements UserCheckerInterface
{
    public function checkPreAuth(UserInterface $user): void
    {
        if (!$user instanceof User) {
            return;
        }

        if (!$user->isActive()) {
            throw new CustomUserMessageAccountStatusException(
                'Ce compte a été désactivé. Contactez un administrateur.'
            );
        }
    }

    public function checkPostAuth(UserInterface $user): void
    {
        // Rien à vérifier après l'authentification
    }
}
