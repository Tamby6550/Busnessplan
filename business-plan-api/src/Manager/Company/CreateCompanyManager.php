<?php

namespace App\Manager\Company;

use App\Entity\AdditionalFunding;
use App\Entity\Company;
use App\Entity\CompanySettings;
use App\Entity\CompanySnapshot;
use App\Entity\Project;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Validator\Exception\ValidationFailedException;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * Crée une nouvelle entreprise avec ses entités associées par défaut :
 * - CompanySettings (paramètres financiers)
 * - AdditionalFunding × 5 (apports complémentaires An 1-5)
 * - CompanySnapshot (KPI dashboard — vide au départ)
 */
class CreateCompanyManager
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ValidatorInterface     $validator,
    ) {}

    public function create(Project $project, string $name, ?string $secteur, ?string $promoteur, User $createdBy): Company
    {
        $company = new Company();
        $company->setProject($project);
        $company->setName(trim($name));
        $company->setSecteur($secteur ? trim($secteur) : null);
        $company->setPromoteur($promoteur ? trim($promoteur) : null);
        $company->setCreatedBy($createdBy);
        $company->setLastModifiedBy($createdBy);

        $violations = $this->validator->validate($company);
        if (count($violations) > 0) {
            throw new ValidationFailedException($company, $violations);
        }

        // Paramètres financiers par défaut
        $settings = new CompanySettings();
        $settings->setCompany($company);
        $company->setSettings($settings);

        // Apports complémentaires — 5 lignes (An 1 à 5)
        for ($year = 1; $year <= 5; $year++) {
            $funding = new AdditionalFunding();
            $funding->setCompany($company);
            $funding->setYearNumber($year);
            $this->em->persist($funding);
        }

        // Snapshot KPI (vide au départ)
        $snapshot = new CompanySnapshot();
        $snapshot->setCompany($company);
        $this->em->persist($snapshot);

        $this->em->persist($settings);
        $this->em->persist($company);
        $this->em->flush();

        return $company;
    }
}
