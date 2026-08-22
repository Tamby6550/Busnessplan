<?php

namespace App\Controller\Company;

use App\Entity\Company;
use App\Entity\User;
use App\Manager\Company\DuplicateCompanyManager;
use Symfony\Bridge\Doctrine\Attribute\MapEntity;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Duplique une entreprise (deep clone de tous ses sous-entités).
 * La copie est ajoutée au même projet avec "(Copie)" dans le nom.
 */
#[Route('/api/companies/{id}/duplicate', name: 'api_duplicate_company', methods: ['POST'])]
class DuplicateCompanyController extends AbstractController
{
    public function __construct(
        private readonly DuplicateCompanyManager $duplicateCompanyManager,
    ) {}

    public function __invoke(
        #[MapEntity(id: 'id')] Company $company,
        #[CurrentUser] User $user,
    ): JsonResponse {
        $copy = $this->duplicateCompanyManager->duplicate($company, $user);

        return $this->json([
            'id'        => $copy->getId(),
            'name'      => $copy->getName(),
            'secteur'   => $copy->getSecteur(),
            'promoteur' => $copy->getPromoteur(),
            'updatedAt' => $copy->getUpdatedAt()->format('c'),
            'snapshot'  => null,
        ], Response::HTTP_CREATED);
    }
}
