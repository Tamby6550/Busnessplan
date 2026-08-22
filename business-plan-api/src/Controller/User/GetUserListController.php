<?php

namespace App\Controller\User;

use App\Entity\User;
use App\Repository\UserRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Retourne la liste de tous les utilisateurs actifs.
 * Utilisé pour les sélecteurs d'assignation et l'administration.
 */
#[Route('/api/users', name: 'api_get_user_list', methods: ['GET'])]
class GetUserListController extends AbstractController
{
    public function __construct(
        private readonly UserRepository $userRepository,
    ) {}

    public function __invoke(#[CurrentUser] User $currentUser): JsonResponse
    {
        if (!$currentUser->isAdmin()) {
            return $this->json(['error' => 'Accès réservé aux administrateurs.'], Response::HTTP_FORBIDDEN);
        }

        $users = $this->userRepository->findAllActive();

        $data = array_map(fn ($user) => [
            'id'        => $user->getId(),
            'email'     => $user->getEmail(),
            'firstName' => $user->getFirstName(),
            'lastName'  => $user->getLastName(),
            'fullName'  => $user->getFullName(),
            'initials'  => $user->getInitials(),
            'role'      => $user->getRole(),
            'isActive'  => $user->isActive(),
            'createdAt' => $user->getCreatedAt()->format('c'),
        ], $users);

        return $this->json($data);
    }
}
