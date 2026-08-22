<?php

namespace App\Controller\User;

use App\Entity\User;
use App\Manager\User\CreateUserManager;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Crée un nouveau compte utilisateur (administration uniquement).
 * Body attendu : { "email": "...", "password": "...",
 *                  "firstName": "...", "lastName": "..." }
 */
#[Route('/api/users', name: 'api_create_user', methods: ['POST'])]
class CreateUserController extends AbstractController
{
    public function __construct(
        private readonly CreateUserManager $createUserManager,
    ) {}

    public function __invoke(Request $request, #[CurrentUser] User $currentUser): JsonResponse
    {
        // Seuls les administrateurs peuvent créer des comptes
        if (!$currentUser->isAdmin()) {
            return $this->json(['error' => 'Accès réservé aux administrateurs.'], Response::HTTP_FORBIDDEN);
        }

        $body = json_decode($request->getContent(), true) ?? [];

        $email     = trim($body['email'] ?? '');
        $password  = $body['password'] ?? '';
        $firstName = trim($body['firstName'] ?? '');
        $lastName  = trim($body['lastName'] ?? '');
        $role = trim($body['role'] ?? 'standard');
        $validRoles = ['admin', 'manager', 'editor', 'viewer', 'standard'];
        if (!in_array($role, $validRoles, true)) {
            $role = 'standard';
        }

        if ($email === '' || $password === '') {
            return $this->json(['error' => "L'email et le mot de passe sont obligatoires."], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->json(['error' => "Format d'email invalide."], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $user = $this->createUserManager->create($email, $password, $firstName, $lastName, $role);

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
        ], Response::HTTP_CREATED);
    }
}
