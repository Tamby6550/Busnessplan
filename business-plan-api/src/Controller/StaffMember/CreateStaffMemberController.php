<?php

namespace App\Controller\StaffMember;

use App\Entity\Company;
use App\Entity\User;
use App\Manager\StaffMember\CreateStaffMemberManager;
use App\Controller\Trait\ValidatedCompanyGuardTrait;
use Symfony\Bridge\Doctrine\Attribute\MapEntity;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Ajoute un poste salarial à une entreprise.
 * Body attendu : { "roleName": "Directeur", "monthlySalary": 500000,
 *                  "headcount": 1, "chargesRate": 13 }
 */
#[Route('/api/companies/{companyId}/staff-members', name: 'api_create_staff_member', methods: ['POST'])]
class CreateStaffMemberController extends AbstractController
{
    use ValidatedCompanyGuardTrait;

    public function __construct(
        private readonly CreateStaffMemberManager $createStaffMemberManager,
    ) {}

    public function __invoke(
        #[MapEntity(id: 'companyId')] Company $company,
        Request $request,
        #[CurrentUser] User $user,
    ): JsonResponse {
        if ($deny = $this->denyIfValidated($company, $user)) return $deny;

        $body = json_decode($request->getContent(), true) ?? [];

        $roleName = trim($body['roleName'] ?? '');
        if ($roleName === '') {
            return $this->json(['error' => 'Le nom du poste est obligatoire.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $staffMember = $this->createStaffMemberManager->create($company, $user, [
            'roleName'      => $roleName,
            'monthlySalary' => $body['monthlySalary'] ?? 0,
            'headcount'     => $body['headcount'] ?? 1,
            'chargesRate'   => $body['chargesRate'] ?? 13.0,
        ]);

        return $this->json([
            'id'            => $staffMember->getId(),
            'roleName'      => $staffMember->getRoleName(),
            'monthlySalary' => $staffMember->getMonthlySalary(),
            'headcount'     => $staffMember->getHeadcount(),
            'chargesRate'   => $staffMember->getChargesRate(),
            'growthRates'   => $staffMember->getGrowthRates(),
            'sortOrder'     => $staffMember->getSortOrder(),
        ], Response::HTTP_CREATED);
    }
}
