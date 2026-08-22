<?php

namespace App\Controller\Investment;

use App\Entity\Company;
use App\Entity\User;
use App\Manager\Investment\CreateInvestmentManager;
use App\Controller\Trait\ValidatedCompanyGuardTrait;
use Symfony\Bridge\Doctrine\Attribute\MapEntity;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Ajoute un investissement (immobilisation) à une entreprise.
 * Body attendu : { "name": "Machine", "amount": 5000000, "usefulLife": 5,
 *                  "financedEquity": 2000000, "financedLoan": 3000000,
 *                  "financedGrant": 0, "loanRate": 12, "loanYears": 5 }
 */
#[Route('/api/companies/{companyId}/investments', name: 'api_create_investment', methods: ['POST'])]
class CreateInvestmentController extends AbstractController
{
    use ValidatedCompanyGuardTrait;

    public function __construct(
        private readonly CreateInvestmentManager $createInvestmentManager,
    ) {}

    public function __invoke(
        #[MapEntity(id: 'companyId')] Company $company,
        Request $request,
        #[CurrentUser] User $user,
    ): JsonResponse {
        if ($deny = $this->denyIfValidated($company, $user)) return $deny;

        $body = json_decode($request->getContent(), true) ?? [];

        $name = trim($body['name'] ?? '');
        if ($name === '') {
            return $this->json(['error' => "Le nom de l'investissement est obligatoire."], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $investment = $this->createInvestmentManager->create($company, $user, [
            'name'             => $name,
            'amount'           => $body['amount'] ?? 0,
            'usefulLife'       => $body['usefulLife'] ?? 5,
            'financedEquity'   => $body['financedEquity'] ?? 0,
            'financedLoan'     => $body['financedLoan'] ?? 0,
            'financedGrant'    => $body['financedGrant'] ?? 0,
            'loanRate'         => $body['loanRate'] ?? 0.0,
            'loanYears'        => $body['loanYears'] ?? 0,
            'equipmentType'    => $body['equipmentType'] ?? null,
            'contributionType' => $body['contributionType'] ?? 'financier',
        ]);

        return $this->json([
            'id'               => $investment->getId(),
            'name'             => $investment->getName(),
            'amount'           => $investment->getAmount(),
            'usefulLife'       => $investment->getUsefulLife(),
            'financedEquity'   => $investment->getFinancedEquity(),
            'financedLoan'     => $investment->getFinancedLoan(),
            'financedGrant'    => $investment->getFinancedGrant(),
            'loanRate'         => $investment->getLoanRate(),
            'loanYears'        => $investment->getLoanYears(),
            'equipmentType'    => $investment->getEquipmentType(),
            'contributionType' => $investment->getContributionType(),
            'sortOrder'        => $investment->getSortOrder(),
        ], Response::HTTP_CREATED);
    }
}
