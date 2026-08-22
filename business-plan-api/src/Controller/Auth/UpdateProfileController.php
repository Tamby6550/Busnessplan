<?php

namespace App\Controller\Auth;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * PATCH /api/auth/profile
 * Permet à l'utilisateur connecté de modifier ses propres informations :
 *   - firstName, lastName
 *   - email
 *   - password (nécessite currentPassword pour vérification)
 */
#[Route('/api/auth/profile', name: 'api_auth_update_profile', methods: ['PATCH'])]
class UpdateProfileController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface      $em,
        private readonly UserPasswordHasherInterface $hasher,
    ) {}

    public function __invoke(Request $request, #[CurrentUser] User $user): JsonResponse
    {
        $body = json_decode($request->getContent(), true) ?? [];
        $errors = [];

        // ── Prénom / Nom ───────────────────────────────────────────────────────
        if (isset($body['firstName'])) {
            $firstName = trim($body['firstName']);
            if ($firstName === '') {
                $errors[] = 'Le prénom ne peut pas être vide.';
            } else {
                $user->setFirstName($firstName);
            }
        }

        if (isset($body['lastName'])) {
            $lastName = trim($body['lastName']);
            if ($lastName === '') {
                $errors[] = 'Le nom ne peut pas être vide.';
            } else {
                $user->setLastName($lastName);
            }
        }

        // ── Email ──────────────────────────────────────────────────────────────
        if (isset($body['email'])) {
            $email = strtolower(trim($body['email']));
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $errors[] = 'Adresse e-mail invalide.';
            } else {
                $user->setEmail($email);
            }
        }

        // ── Changement de mot de passe ─────────────────────────────────────────
        if (isset($body['newPassword'])) {
            $currentPassword = $body['currentPassword'] ?? '';
            $newPassword     = $body['newPassword'];
            $confirmPassword = $body['confirmPassword'] ?? '';

            if (empty($currentPassword)) {
                $errors[] = 'Le mot de passe actuel est requis pour changer de mot de passe.';
            } elseif (!$this->hasher->isPasswordValid($user, $currentPassword)) {
                $errors[] = 'Mot de passe actuel incorrect.';
            } elseif (strlen($newPassword) < 6) {
                $errors[] = 'Le nouveau mot de passe doit contenir au moins 6 caractères.';
            } elseif ($newPassword !== $confirmPassword) {
                $errors[] = 'Les deux mots de passe ne correspondent pas.';
            } else {
                $user->setPasswordHash(
                    $this->hasher->hashPassword($user, $newPassword)
                );
            }
        }

        if (!empty($errors)) {
            return $this->json(['errors' => $errors], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $this->em->flush();

        return $this->json([
            'id'        => $user->getId(),
            'email'     => $user->getEmail(),
            'firstName' => $user->getFirstName(),
            'lastName'  => $user->getLastName(),
            'fullName'  => $user->getFullName(),
            'initials'  => $user->getInitials(),
            'isAdmin'   => $user->isAdmin(),
            'canView'   => $user->isCanView(),
            'canEdit'   => $user->isCanEdit(),
        ]);
    }
}
