<?php

namespace App\Controller\Project;

use App\Entity\Project;
use App\Entity\User;
use App\Manager\Project\DuplicateProjectManager;
use App\Service\ProjectSerializer;
use Symfony\Bridge\Doctrine\Attribute\MapEntity;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Duplique un projet avec toutes ses entreprises et leurs données.
 *
 * Réservé aux administrateurs et managers, et ce contrôle est fait ici, côté
 * serveur : la liste des projets est renvoyée en entier à tout le monde et c'est
 * le navigateur qui masque les entreprises qu'un rôle ne doit pas voir. Sans ce
 * garde-fou, un utilisateur "standard" copierait des entreprises invisibles pour lui.
 */
#[Route('/api/projects/{id}/duplicate', name: 'api_duplicate_project', methods: ['POST'])]
class DuplicateProjectController extends AbstractController
{
    public function __construct(
        private readonly DuplicateProjectManager $duplicateProjectManager,
        private readonly ProjectSerializer       $projectSerializer,
    ) {}

    public function __invoke(
        #[MapEntity(id: 'id')] Project $project,
        #[CurrentUser] User $user,
    ): JsonResponse {
        if (!$user->isCanDuplicateProject()) {
            return $this->json(
                ['error' => "Vous n'avez pas la permission de dupliquer un projet."],
                Response::HTTP_FORBIDDEN,
            );
        }

        $copy = $this->duplicateProjectManager->duplicate($project, $user);

        return $this->json(
            $this->projectSerializer->serializeProject($copy),
            Response::HTTP_CREATED,
        );
    }
}
