<?php

namespace App\Controller\User;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * PATCH /api/users/{id}
 * Permet à un admin de modifier le rôle et les permissions d'un utilisateur.
 * Body : { "isAdmin": bool, "canView": bool, "canEdit": bool }
 */
#[Route('/api/users/{id}', name: 'api_update_user', methods: ['PATCH'])]
class UpdateUserController extends AbstractController
{
    public function __construct(
        private readonly UserRepository        $userRepository,
        private readonly EntityManagerInterface $em,
    ) {}

    public function __invoke(int $id, Request $request, #[CurrentUser] User $currentUser): JsonResponse
    {
        if (!$currentUser->isAdmin()) {
            return $this->json(['error' => 'Accès réservé aux administrateurs.'], Response::HTTP_FORBIDDEN);
        }

        $user = $this->userRepository->find($id);
        if (!$user) {
            return $this->json(['error' => 'Utilisateur introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $body = json_decode($request->getContent(), true) ?? [];

        if (isset($body['role'])) {
            $user->setRole((string) $body['role']);
        }
        if (isset($body['isActive'])) {
            $user->setIsActive((bool) $body['isActive']);
        }

        $this->em->flush();

        return $this->json([
            'id'        => $user->getId(),
            'email'     => $user->getEmail(),
            'firstName' => $user->getFirstName(),
            'lastName'  => $user->getLastName(),
            'fullName'  => $user->getFullName(),
            'initials'  => $user->getInitials(),
            'role'      => $user->getRole(),
            'isActive'  => $user->isActive(),
            'createdAt' => $user->getCreatedAt()->format('c'),
        ]);
    }
}
