<?php

namespace App\Manager\Company;

use App\Entity\Company;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Supprime une entreprise et toutes ses données associées (CASCADE).
 */
class DeleteCompanyManager
{
    public function __construct(
        private readonly EntityManagerInterface $em,
    ) {}

    public function delete(Company $company): void
    {
        $this->em->remove($company);
        $this->em->flush();
    }
}
