<?php

namespace App\Controller\Project;

use App\Entity\User;
use App\Manager\Project\CreateProjectManager;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Crée un nouveau projet pour l'utilisateur connecté.
 * Body attendu : { "name": "...", "description": "..." }
 */
#[Route('/api/projects', name: 'api_create_project', methods: ['POST'])]
class CreateProjectController extends AbstractController
{
    public function __construct(
        private readonly CreateProjectManager $createProjectManager,
    ) {}

    public function __invoke(Request $request, #[CurrentUser] User $user): JsonResponse
    {
        $body = json_decode($request->getContent(), true) ?? [];

        $name        = trim($body['name'] ?? '');
        $description = trim($body['description'] ?? '');

        if ($name === '') {
            return $this->json(['error' => 'Le nom du projet est obligatoire.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $project = $this->createProjectManager->create($name, $description, $user);

        return $this->json([
            'id'          => $project->getId(),
            'name'        => $project->getName(),
            'description' => $project->getDescription(),
            'createdAt'   => $project->getCreatedAt()->format('c'),
            'updatedAt'   => $project->getUpdatedAt()->format('c'),
            'companyCount' => 0,
            'companies'   => [],
        ], Response::HTTP_CREATED);
    }
}
