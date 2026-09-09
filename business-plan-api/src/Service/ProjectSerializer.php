<?php

namespace App\Service;

use App\Entity\Company;
use App\Entity\Project;

/**
 * Sérialisation d'un projet et de ses entreprises au format attendu par le
 * tableau de bord (types ProjectSummary / CompanySummary côté React).
 *
 * Extrait de GetProjectListController pour que la duplication d'un projet et la
 * copie d'une entreprise renvoient exactement la même forme : le front peut
 * alors insérer le résultat directement dans son état, sans recharger la liste.
 */
class ProjectSerializer
{
    /** @return array<string, mixed> */
    public function serializeProject(Project $project): array
    {
        return [
            'id'          => $project->getId(),
            'name'        => $project->getName(),
            'description' => $project->getDescription(),
            'createdBy'   => [
                'id'       => $project->getCreatedBy()?->getId(),
                'fullName' => $project->getCreatedBy()?->getFullName(),
                'initials' => $project->getCreatedBy()?->getInitials(),
            ],
            'createdAt'    => $project->getCreatedAt()->format('c'),
            'updatedAt'    => $project->getUpdatedAt()->format('c'),
            'companyCount' => $project->getCompanyCount(),
            'companies'    => array_map(
                fn (Company $company) => $this->serializeCompany($company),
                $project->getCompanies()->toArray(),
            ),
        ];
    }

    /** @return array<string, mixed> */
    public function serializeCompany(Company $company): array
    {
        return [
            'id'        => $company->getId(),
            'name'      => $company->getName(),
            'secteur'   => $company->getSecteur(),
            'promoteur' => $company->getPromoteur(),
            'createdBy' => [
                'id'       => $company->getCreatedBy()?->getId(),
                'fullName' => $company->getCreatedBy()?->getFullName(),
                'initials' => $company->getCreatedBy()?->getInitials(),
            ],
            'lastModifiedBy' => $company->getLastModifiedBy() ? [
                'id'       => $company->getLastModifiedBy()->getId(),
                'fullName' => $company->getLastModifiedBy()->getFullName(),
                'initials' => $company->getLastModifiedBy()->getInitials(),
            ] : null,
            'updatedAt'   => $company->getUpdatedAt()->format('c'),
            'isValidated' => $company->isValidated(),
            'validatedAt' => $company->getValidatedAt()?->format('c'),
            'validatedBy' => $company->getValidatedBy() ? [
                'id'       => $company->getValidatedBy()->getId(),
                'fullName' => $company->getValidatedBy()->getFullName(),
            ] : null,
            'snapshot' => $company->getSnapshot() ? [
                'revenueY1'     => $company->getSnapshot()->getRevenueY1(),
                'netIncomeY1'   => $company->getSnapshot()->getNetIncomeY1(),
                'cashCumY1'     => $company->getSnapshot()->getCashCumY1(),
                'breakEven'     => $company->getSnapshot()->getBreakEven(),
                'completionPct' => $company->getSnapshot()->getCompletionPct(),
            ] : null,
        ];
    }
}
