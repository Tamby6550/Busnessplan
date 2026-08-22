<?php

namespace App\Controller\Company;

use App\Entity\Company;
use App\Entity\User;
use App\Manager\Company\UpdateCompanyMetaManager;
use App\Controller\Trait\ValidatedCompanyGuardTrait;
use Symfony\Bridge\Doctrine\Attribute\MapEntity;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Met à jour les métadonnées d'une entreprise (nom, secteur, promoteur, devise).
 * Body attendu : { "name": "...", "secteur": "...", "promoteur": "..." }
 */
#[Route('/api/companies/{id}/meta', name: 'api_update_company_meta', methods: ['PATCH'])]
class UpdateCompanyMetaController extends AbstractController
{
    use ValidatedCompanyGuardTrait;

    public function __construct(
        private readonly UpdateCompanyMetaManager $updateCompanyMetaManager,
    ) {}

    public function __invoke(
        #[MapEntity(id: 'id')] Company $company,
        Request $request,
        #[CurrentUser] User $user,
    ): JsonResponse {
        if ($deny = $this->denyIfValidated($company, $user)) return $deny;

        $body = json_decode($request->getContent(), true) ?? [];

        $name      = trim($body['name'] ?? '');
        if ($name === '') {
            return $this->json(['error' => "Le nom de l'entreprise est obligatoire."], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $this->updateCompanyMetaManager->update($company, $user, [
            'name'                => $name,
            'secteur'             => trim($body['secteur'] ?? ''),
            'promoteur'           => trim($body['promoteur'] ?? ''),
            'descriptionActivite' => trim($body['descriptionActivite'] ?? ''),
            'marche'              => trim($body['marche'] ?? ''),
            'genre'               => trim($body['genre'] ?? ''),
            'modeleEconomique'    => is_array($body['modeleEconomique'] ?? null) ? $body['modeleEconomique'] : [],
            'etatActivite'        => trim($body['etatActivite'] ?? ''),
        ]);

        return $this->json([
            'id'                  => $company->getId(),
            'name'                => $company->getName(),
            'secteur'             => $company->getSecteur(),
            'promoteur'           => $company->getPromoteur(),
            'descriptionActivite' => $company->getDescriptionActivite(),
            'marche'              => $company->getMarche(),
            'genre'               => $company->getGenre(),
            'modeleEconomique'    => $company->getModeleEconomique(),
            'etatActivite'        => $company->getEtatActivite(),
            'updatedAt'           => $company->getUpdatedAt()->format('c'),
        ]);
    }
}
