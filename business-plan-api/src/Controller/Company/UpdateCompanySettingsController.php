<?php

namespace App\Controller\Company;

use App\Entity\Company;
use App\Entity\User;
use App\Manager\Company\UpdateCompanySettingsManager;
use App\Controller\Trait\ValidatedCompanyGuardTrait;
use Symfony\Bridge\Doctrine\Attribute\MapEntity;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Met à jour les paramètres économiques d'une entreprise.
 * Body attendu : { "infl2": 3.5, "infl3": 3.5, "infl4": 3.5, "infl5": 3.5,
 *                  "discountRate": 10, "taxRegime": "IR", "taxRate": 20,
 *                  "taxRateIs": 20, "fondsRoulement": 0 }
 */
#[Route('/api/companies/{id}/settings', name: 'api_update_company_settings', methods: ['PATCH'])]
class UpdateCompanySettingsController extends AbstractController
{
    use ValidatedCompanyGuardTrait;

    public function __construct(
        private readonly UpdateCompanySettingsManager $updateCompanySettingsManager,
    ) {}

    public function __invoke(
        #[MapEntity(id: 'id')] Company $company,
        Request $request,
        #[CurrentUser] User $user,
    ): JsonResponse {
        if ($deny = $this->denyIfValidated($company, $user)) return $deny;

        $body = json_decode($request->getContent(), true) ?? [];

        $this->updateCompanySettingsManager->update($company, $user, $body);

        $s = $company->getSettings();

        return $this->json([
            'infl2'          => $s?->getInfl2(),
            'infl3'          => $s?->getInfl3(),
            'infl4'          => $s?->getInfl4(),
            'infl5'          => $s?->getInfl5(),
            'discountRate'   => $s?->getDiscountRate(),
            'taxRegime'      => $s?->getTaxRegime(),
            'taxRate'        => $s?->getTaxRate(),
            'taxRateIs'      => $s?->getTaxRateIs(),
            'fondsRoulement' => $s?->getFondsRoulement(),
        ]);
    }
}
