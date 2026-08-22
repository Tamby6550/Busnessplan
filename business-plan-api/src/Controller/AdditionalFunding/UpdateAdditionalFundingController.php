<?php

namespace App\Controller\AdditionalFunding;

use App\Entity\Company;
use App\Entity\User;
use App\Manager\AdditionalFunding\UpdateAdditionalFundingManager;
use App\Controller\Trait\ValidatedCompanyGuardTrait;
use Symfony\Bridge\Doctrine\Attribute\MapEntity;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Met à jour les apports complémentaires An 1-5 d'une entreprise en une seule requête.
 * Body attendu : tableau de 1 à 5 objets —
 * [
 *   { "yearNumber": 1, "equity": 0, "loan": 0, "loanRate": 0, "loanYears": 0, "grant": 0 },
 *   ...
 * ]
 */
#[Route('/api/companies/{companyId}/additional-fundings', name: 'api_update_additional_fundings', methods: ['PUT'])]
class UpdateAdditionalFundingController extends AbstractController
{
    use ValidatedCompanyGuardTrait;

    public function __construct(
        private readonly UpdateAdditionalFundingManager $updateAdditionalFundingManager,
    ) {}

    public function __invoke(
        #[MapEntity(id: 'companyId')] Company $company,
        Request $request,
        #[CurrentUser] User $user,
    ): JsonResponse {
        if ($deny = $this->denyIfValidated($company, $user)) return $deny;

        $body = json_decode($request->getContent(), true);

        if (!is_array($body)) {
            return $this->json(['error' => 'Body doit être un tableau JSON.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $this->updateAdditionalFundingManager->update($company, $user, $body);

        $fundings = array_map(fn ($f) => [
            'yearNumber' => $f->getYearNumber(),
            'equity'     => $f->getEquity(),
            'loan'       => $f->getLoan(),
            'loanRate'   => $f->getLoanRate(),
            'loanYears'  => $f->getLoanYears(),
            'grant'      => $f->getGrant(),
        ], $company->getAdditionalFundings()->toArray());

        return $this->json($fundings);
    }
}
