<?php

namespace App\Controller\Company;

use App\Entity\User;
use App\Repository\CompanyRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * PATCH /api/companies/{id}/validate   → valide le BP (admin uniquement)
 * PATCH /api/companies/{id}/unvalidate → annule la validation (admin validateur uniquement)
 */
class ValidateCompanyController extends AbstractController
{
    public function __construct(
        private readonly CompanyRepository     $companyRepository,
        private readonly EntityManagerInterface $em,
    ) {}

    #[Route('/api/companies/{id}/validate', name: 'api_company_validate', methods: ['PATCH'])]
    public function validate(int $id, #[CurrentUser] User $user): JsonResponse
    {
        if (!$user->isCanValidate()) {
            return $this->json(['error' => 'Seuls les administrateurs et managers peuvent valider un business plan.'], Response::HTTP_FORBIDDEN);
        }

        $company = $this->companyRepository->find($id);
        if (!$company) {
            return $this->json(['error' => 'Entreprise introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $company->validate($user);
        $this->em->flush();

        return $this->json([
            'isValidated' => true,
            'validatedAt' => $company->getValidatedAt()?->format('c'),
            'validatedBy' => $company->getValidatedBy() ? [
                'id'       => $company->getValidatedBy()->getId(),
                'fullName' => $company->getValidatedBy()->getFullName(),
            ] : null,
        ]);
    }

    #[Route('/api/companies/{id}/unvalidate', name: 'api_company_unvalidate', methods: ['PATCH'])]
    public function unvalidate(int $id, #[CurrentUser] User $user): JsonResponse
    {
        if (!$user->isCanValidate()) {
            return $this->json(['error' => 'Seuls les administrateurs et managers peuvent invalider un business plan.'], Response::HTTP_FORBIDDEN);
        }

        $company = $this->companyRepository->find($id);
        if (!$company) {
            return $this->json(['error' => 'Entreprise introuvable.'], Response::HTTP_NOT_FOUND);
        }

        // Seul celui qui a validé peut dévalider
        if ($company->getValidatedBy()?->getId() !== $user->getId()) {
            return $this->json(
                ['error' => 'Seul l\'administrateur ayant validé ce BP peut le invalider.'],
                Response::HTTP_FORBIDDEN
            );
        }

        $company->unvalidate();
        $this->em->flush();

        return $this->json(['isValidated' => false]);
    }
}
