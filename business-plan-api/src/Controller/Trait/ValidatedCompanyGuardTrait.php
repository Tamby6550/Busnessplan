<?php

namespace App\Controller\Trait;

use App\Entity\Company;
use App\Entity\User;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * Protège les endpoints d'écriture selon les règles :
 *  - BP validé          → refusé pour tout non-admin
 *  - Sans canEdit        → refusé sauf si l'utilisateur est le créateur du BP
 */
trait ValidatedCompanyGuardTrait
{
    private function denyIfValidated(Company $company, User $user): ?JsonResponse
    {
        // BP validé → seuls admin et manager peuvent modifier
        if ($company->isValidated() && !$user->isCanEditValidated()) {
            return $this->json(
                ['error' => 'Ce business plan est validé et ne peut plus être modifié.'],
                Response::HTTP_FORBIDDEN
            );
        }

        // Sans canEdit → seul le créateur peut modifier son propre BP non validé
        if (!$user->isCanEdit()) {
            $isOwner = $company->getCreatedBy()?->getId() === $user->getId();
            if (!$isOwner) {
                return $this->json(
                    ['error' => 'Vous n\'avez pas la permission de modifier ce business plan.'],
                    Response::HTTP_FORBIDDEN
                );
            }
        }

        return null;
    }
}
