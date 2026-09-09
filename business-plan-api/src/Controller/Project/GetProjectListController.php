<?php

namespace App\Controller\Project;

use App\Entity\Project;
use App\Entity\User;
use App\Repository\ProjectRepository;
use App\Service\ProjectSerializer;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Retourne tous les projets avec leurs entreprises et snapshots.
 * Utilisé par le dashboard pour afficher la liste complète.
 */
#[Route('/api/projects', name: 'api_get_project_list', methods: ['GET'])]
class GetProjectListController extends AbstractController
{
    public function __construct(
        private readonly ProjectRepository $projectRepository,
        private readonly ProjectSerializer $projectSerializer,
    ) {}

    public function __invoke(#[CurrentUser] User $user): JsonResponse
    {
        // Tout le monde voit tous les projets (pour pouvoir créer une entreprise dedans)
        $projects = $this->projectRepository->findAllWithCompanies();

        // Sérialisation partagée avec la duplication de projet et la copie
        // d'entreprise, pour que le front reçoive toujours la même forme.
        $data = array_map(
            fn (Project $project) => $this->projectSerializer->serializeProject($project),
            $projects,
        );

        return $this->json($data);
    }
}
