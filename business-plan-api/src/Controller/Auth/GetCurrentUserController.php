<?php

namespace App\Controller\Auth;

use App\Entity\User;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Retourne le profil de l'utilisateur connecté (validé par le JWT).
 */
#[Route('/api/auth/me', name: 'api_auth_me', methods: ['GET'])]
class GetCurrentUserController extends AbstractController
{
    public function __invoke(#[CurrentUser] User $user): JsonResponse
    {
        return $this->json([
            'id'        => $user->getId(),
            'email'     => $user->getEmail(),
            'firstName' => $user->getFirstName(),
            'lastName'  => $user->getLastName(),
            'fullName'  => $user->getFullName(),
            'initials'  => $user->getInitials(),
            'role'      => $user->getRole(),
        ]);
    }
}
