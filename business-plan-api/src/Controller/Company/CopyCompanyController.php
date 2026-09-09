<?php

namespace App\Controller\Company;

use App\Entity\Company;
use App\Entity\User;
use App\Manager\Company\CopyCompanyToProjectsManager;
use App\Repository\ProjectRepository;
use App\Service\ProjectSerializer;
use Symfony\Bridge\Doctrine\Attribute\MapEntity;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Copie une entreprise vers un ou plusieurs projets.
 * Body attendu : { "targetProjectIds": [2, 5], "name": "Boulangerie Rabe-copie" }
 *
 * Endpoint distinct de /duplicate : le geste utilisateur n'est pas le même et le
 * nom de la copie vient ici de la modale, alors que /duplicate le calcule seul.
 */
#[Route('/api/companies/{id}/copy', name: 'api_copy_company', methods: ['POST'])]
class CopyCompanyController extends AbstractController
{
    public function __construct(
        private readonly CopyCompanyToProjectsManager $copyCompanyToProjectsManager,
        private readonly ProjectRepository            $projectRepository,
        private readonly ProjectSerializer            $projectSerializer,
    ) {}

    public function __invoke(
        #[MapEntity(id: 'id')] Company $company,
        Request $request,
        #[CurrentUser] User $user,
    ): JsonResponse {
        if (!$user->isCanDuplicateProject()) {
            return $this->json(
                ['error' => "Vous n'avez pas la permission de copier une entreprise vers un autre projet."],
                Response::HTTP_FORBIDDEN,
            );
        }

        $body = json_decode($request->getContent(), true) ?? [];

        $ids = array_values(array_unique(array_filter(
            array_map('intval', (array) ($body['targetProjectIds'] ?? [])),
        )));

        if ($ids === []) {
            return $this->json(
                ['error' => 'Sélectionnez au moins un projet de destination.'],
                Response::HTTP_UNPROCESSABLE_ENTITY,
            );
        }

        $targetProjects = $this->projectRepository->findBy(['id' => $ids]);

        if (count($targetProjects) !== count($ids)) {
            return $this->json(
                ['error' => "Un des projets sélectionnés n'existe plus."],
                Response::HTTP_NOT_FOUND,
            );
        }

        $wantedName = isset($body['name']) ? trim((string) $body['name']) : null;
        if ($wantedName === '') {
            $wantedName = null;
        }

        $copies = $this->copyCompanyToProjectsManager->copy($company, $targetProjects, $user, $wantedName);

        return $this->json(
            array_map(fn (Company $copy) => [
                'projectId' => $copy->getProject()?->getId(),
                'company'   => $this->projectSerializer->serializeCompany($copy),
            ], $copies),
            Response::HTTP_CREATED,
        );
    }
}
