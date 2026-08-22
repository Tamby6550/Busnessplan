<?php

namespace App\Controller\Company;

use App\Entity\Project;
use App\Entity\User;
use App\Manager\Company\CreateCompanyManager;
use Symfony\Bridge\Doctrine\Attribute\MapEntity;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Crée une nouvelle entreprise dans un projet donné.
 * Body attendu : { "name": "...", "secteur": "...", "promoteur": "..." }
 */
#[Route('/api/projects/{projectId}/companies', name: 'api_create_company', methods: ['POST'])]
class CreateCompanyController extends AbstractController
{
    public function __construct(
        private readonly CreateCompanyManager $createCompanyManager,
    ) {}

    public function __invoke(
        #[MapEntity(id: 'projectId')] Project $project,
        Request $request,
        #[CurrentUser] User $user,
    ): JsonResponse {
        $body = json_decode($request->getContent(), true) ?? [];

        $name      = trim($body['name'] ?? '');
        $secteur   = trim($body['secteur'] ?? '');
        $promoteur = trim($body['promoteur'] ?? '');

        if ($name === '') {
            return $this->json(['error' => "Le nom de l'entreprise est obligatoire."], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $company = $this->createCompanyManager->create($project, $name, $secteur, $promoteur, $user);

        return $this->json([
            'id'        => $company->getId(),
            'name'      => $company->getName(),
            'secteur'   => $company->getSecteur(),
            'promoteur' => $company->getPromoteur(),
            'updatedAt' => $company->getUpdatedAt()->format('c'),
            'snapshot'  => null,
        ], Response::HTTP_CREATED);
    }
}
