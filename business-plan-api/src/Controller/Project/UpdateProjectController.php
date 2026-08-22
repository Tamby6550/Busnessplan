<?php

namespace App\Controller\Project;

use App\Entity\Project;
use App\Entity\User;
use App\Manager\Project\UpdateProjectManager;
use Symfony\Bridge\Doctrine\Attribute\MapEntity;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Met à jour le nom et la description d'un projet existant.
 * Body attendu : { "name": "...", "description": "..." }
 */
#[Route('/api/projects/{id}', name: 'api_update_project', methods: ['PUT'])]
class UpdateProjectController extends AbstractController
{
    public function __construct(
        private readonly UpdateProjectManager $updateProjectManager,
    ) {}

    public function __invoke(
        #[MapEntity(id: 'id')] Project $project,
        Request $request,
        #[CurrentUser] User $user,
    ): JsonResponse {
        $body = json_decode($request->getContent(), true) ?? [];

        $name        = trim($body['name'] ?? '');
        $description = trim($body['description'] ?? '');

        if ($name === '') {
            return $this->json(['error' => 'Le nom du projet est obligatoire.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $this->updateProjectManager->update($project, $name, $description);

        return $this->json([
            'id'          => $project->getId(),
            'name'        => $project->getName(),
            'description' => $project->getDescription(),
            'updatedAt'   => $project->getUpdatedAt()->format('c'),
        ]);
    }
}
