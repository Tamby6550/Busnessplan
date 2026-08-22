<?php

namespace App\Controller\StaffMember;

use App\Entity\StaffMember;
use App\Entity\User;
use App\Manager\StaffMember\DeleteStaffMemberManager;
use App\Controller\Trait\ValidatedCompanyGuardTrait;
use Symfony\Bridge\Doctrine\Attribute\MapEntity;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Supprime un poste salarial et recalcule le snapshot.
 */
#[Route('/api/staff-members/{id}', name: 'api_delete_staff_member', methods: ['DELETE'])]
class DeleteStaffMemberController extends AbstractController
{
    use ValidatedCompanyGuardTrait;

    public function __construct(
        private readonly DeleteStaffMemberManager $deleteStaffMemberManager,
    ) {}

    public function __invoke(
        #[MapEntity(id: 'id')] StaffMember $staffMember,
        #[CurrentUser] User $user,
    ): JsonResponse {
        if ($deny = $this->denyIfValidated($staffMember->getCompany(), $user)) return $deny;

        $this->deleteStaffMemberManager->delete($staffMember, $user);

        return $this->json(null, Response::HTTP_NO_CONTENT);
    }
}
