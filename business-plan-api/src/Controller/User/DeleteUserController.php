<?php

namespace App\Controller\User;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * DELETE /api/users/{id}
 *
 * - Si l'utilisateur a des projets ou entreprises → désactivation (soft delete)
 * - Si l'utilisateur n'a aucune donnée → suppression physique
 */
#[Route('/api/users/{id}', name: 'api_delete_user', methods: ['DELETE'])]
class DeleteUserController extends AbstractController
{
    public function __construct(
        private readonly UserRepository        $userRepository,
        private readonly EntityManagerInterface $em,
    ) {}

    public function __invoke(int $id, #[CurrentUser] User $currentUser): JsonResponse
    {
        if (!$currentUser->isAdmin()) {
            return $this->json(['error' => 'Accès réservé aux administrateurs.'], Response::HTTP_FORBIDDEN);
        }

        if ($currentUser->getId() === $id) {
            return $this->json(['error' => 'Vous ne pouvez pas supprimer votre propre compte.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $user = $this->userRepository->find($id);
        if (!$user) {
            return $this->json(['error' => 'Utilisateur introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $hasData = $user->getProjects()->count() > 0 || $user->getCompanies()->count() > 0;

        if ($hasData) {
            // L'utilisateur a des projets/entreprises → désactivation uniquement
            $user->setIsActive(false);
            $this->em->flush();

            return $this->json([
                'deactivated' => true,
                'message' => 'Cet utilisateur a des projets associés. Son compte a été désactivé plutôt que supprimé.',
                'id' => $user->getId(),
            ]);
        }

        // Aucune donnée associée → suppression physique
        $this->em->remove($user);
        $this->em->flush();

        return $this->json(['deleted' => true], Response::HTTP_OK);
    }
}
