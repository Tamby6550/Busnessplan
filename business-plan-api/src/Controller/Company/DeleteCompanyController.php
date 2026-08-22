<?php

namespace App\Controller\Company;

use App\Entity\Company;
use App\Entity\User;
use App\Manager\Company\DeleteCompanyManager;
use Symfony\Bridge\Doctrine\Attribute\MapEntity;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Supprime une entreprise et toutes ses données associées (cascade remove).
 */
#[Route('/api/companies/{id}', name: 'api_delete_company', methods: ['DELETE'])]
class DeleteCompanyController extends AbstractController
{
    public function __construct(
        private readonly DeleteCompanyManager $deleteCompanyManager,
    ) {}

    public function __invoke(
        #[MapEntity(id: 'id')] Company $company,
        #[CurrentUser] User $user,
    ): JsonResponse {
        $this->deleteCompanyManager->delete($company);

        return $this->json(null, Response::HTTP_NO_CONTENT);
    }
}
