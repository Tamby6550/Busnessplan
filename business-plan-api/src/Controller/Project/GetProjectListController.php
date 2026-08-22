<?php

namespace App\Controller\Project;

use App\Entity\User;
use App\Repository\ProjectRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Retourne tous les projets avec leurs entreprises et snapshots.
 * Utilisé par le dashboard pour afficher la liste complète.
 */
#[Route('/api/projects', name: 'api_get_project_list', methods: ['GET'])]
class GetProjectListController extends AbstractController
{
    public function __construct(
        private readonly ProjectRepository $projectRepository,
    ) {}

    public function __invoke(#[CurrentUser] User $user): JsonResponse
    {
        // Tout le monde voit tous les projets (pour pouvoir créer une entreprise dedans)
        $projects = $this->projectRepository->findAllWithCompanies();

        $data = array_map(fn ($project) => [
            'id'          => $project->getId(),
            'name'        => $project->getName(),
            'description' => $project->getDescription(),
            'createdBy'   => [
                'id'        => $project->getCreatedBy()?->getId(),
                'fullName'  => $project->getCreatedBy()?->getFullName(),
                'initials'  => $project->getCreatedBy()?->getInitials(),
            ],
            'createdAt'     => $project->getCreatedAt()->format('c'),
            'updatedAt'     => $project->getUpdatedAt()->format('c'),
            'companyCount'  => $project->getCompanyCount(),
            'companies'     => array_map(fn ($company) => [
                'id'             => $company->getId(),
                'name'           => $company->getName(),
                'secteur'        => $company->getSecteur(),
                'promoteur'      => $company->getPromoteur(),
                'createdBy'      => [
                    'id'       => $company->getCreatedBy()?->getId(),
                    'fullName' => $company->getCreatedBy()?->getFullName(),
                    'initials' => $company->getCreatedBy()?->getInitials(),
                ],
                'lastModifiedBy' => $company->getLastModifiedBy() ? [
                    'id'       => $company->getLastModifiedBy()->getId(),
                    'fullName' => $company->getLastModifiedBy()->getFullName(),
                    'initials' => $company->getLastModifiedBy()->getInitials(),
                ] : null,
                'updatedAt'      => $company->getUpdatedAt()->format('c'),
                'isValidated'    => $company->isValidated(),
                'validatedAt'    => $company->getValidatedAt()?->format('c'),
                'validatedBy'    => $company->getValidatedBy() ? [
                        'id'       => $company->getValidatedBy()->getId(),
                        'fullName' => $company->getValidatedBy()->getFullName(),
                    ] : null,
                'snapshot'       => $company->getSnapshot() ? [
                    'revenueY1'     => $company->getSnapshot()->getRevenueY1(),
                    'netIncomeY1'   => $company->getSnapshot()->getNetIncomeY1(),
                    'cashCumY1'     => $company->getSnapshot()->getCashCumY1(),
                    'breakEven'     => $company->getSnapshot()->getBreakEven(),
                    'completionPct' => $company->getSnapshot()->getCompletionPct(),
                ] : null,
            ], $project->getCompanies()->toArray()),
        ], $projects);

        return $this->json($data);
    }
}
