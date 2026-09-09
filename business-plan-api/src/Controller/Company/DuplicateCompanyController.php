<?php

namespace App\Controller\Company;

use App\Entity\Company;
use App\Entity\User;
use App\Manager\Company\DuplicateCompanyManager;
use App\Service\ProjectSerializer;
use Symfony\Bridge\Doctrine\Attribute\MapEntity;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Duplique une entreprise (copie complète de toutes ses données).
 * La copie est ajoutée au même projet, sous le nom "<nom>-copie".
 */
#[Route('/api/companies/{id}/duplicate', name: 'api_duplicate_company', methods: ['POST'])]
class DuplicateCompanyController extends AbstractController
{
    public function __construct(
        private readonly DuplicateCompanyManager $duplicateCompanyManager,
        private readonly ProjectSerializer       $projectSerializer,
    ) {}

    public function __invoke(
        #[MapEntity(id: 'id')] Company $company,
        #[CurrentUser] User $user,
    ): JsonResponse {
        $copy = $this->duplicateCompanyManager->duplicate($company, $user);

        // Réponse au format complet du tableau de bord : la ligne créée affiche
        // tout de suite son créateur, son statut et ses KPI, sans rechargement.
        return $this->json(
            $this->projectSerializer->serializeCompany($copy),
            Response::HTTP_CREATED,
        );
    }
}
