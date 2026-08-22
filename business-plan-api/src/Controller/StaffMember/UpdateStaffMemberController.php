<?php

namespace App\Controller\StaffMember;

use App\Entity\StaffMember;
use App\Entity\User;
use App\Manager\StaffMember\UpdateStaffMemberManager;
use App\Controller\Trait\ValidatedCompanyGuardTrait;
use Symfony\Bridge\Doctrine\Attribute\MapEntity;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Met à jour un poste salarial (intitulé, salaire, effectif, taux de charges).
 */
#[Route('/api/staff-members/{id}', name: 'api_update_staff_member', methods: ['PATCH'])]
class UpdateStaffMemberController extends AbstractController
{
    use ValidatedCompanyGuardTrait;

    public function __construct(
        private readonly UpdateStaffMemberManager $updateStaffMemberManager,
    ) {}

    public function __invoke(
        #[MapEntity(id: 'id')] StaffMember $staffMember,
        Request $request,
        #[CurrentUser] User $user,
    ): JsonResponse {
        if ($deny = $this->denyIfValidated($staffMember->getCompany(), $user)) return $deny;

        $body = json_decode($request->getContent(), true) ?? [];

        $this->updateStaffMemberManager->update($staffMember, $user, $body);

        return $this->json([
            'id'            => $staffMember->getId(),
            'roleName'      => $staffMember->getRoleName(),
            'monthlySalary' => $staffMember->getMonthlySalary(),
            'headcount'     => $staffMember->getHeadcount(),
            'chargesRate'   => $staffMember->getChargesRate(),
            'growthRates'   => $staffMember->getGrowthRates(),
            'sortOrder'     => $staffMember->getSortOrder(),
        ]);
    }
}
