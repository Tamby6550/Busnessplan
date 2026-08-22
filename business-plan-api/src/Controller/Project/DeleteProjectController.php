<?php

namespace App\Controller\Project;

use App\Entity\Project;
use App\Entity\User;
use App\Manager\Project\DeleteProjectManager;
use Symfony\Bridge\Doctrine\Attribute\MapEntity;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Supprime un projet ainsi que toutes ses entreprises associées (cascade).
 */
#[Route('/api/projects/{id}', name: 'api_delete_project', methods: ['DELETE'])]
class DeleteProjectController extends AbstractController
{
    public function __construct(
        private readonly DeleteProjectManager $deleteProjectManager,
    ) {}

    public function __invoke(
        #[MapEntity(id: 'id')] Project $project,
        #[CurrentUser] User $user,
    ): JsonResponse {
        $this->deleteProjectManager->delete($project);

        return $this->json(null, Response::HTTP_NO_CONTENT);
    }
}
