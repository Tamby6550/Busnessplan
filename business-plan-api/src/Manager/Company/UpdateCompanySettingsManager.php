<?php

namespace App\Manager\Company;

use App\Entity\Company;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Modifie les paramètres financiers d'une entreprise
 * (régime fiscal, inflation, taux d'actualisation, fonds de roulement).
 */
class UpdateCompanySettingsManager
{
    public function __construct(
        private readonly EntityManagerInterface $em,
    ) {}

    public function update(Company $company, User $modifiedBy, array $data): Company
    {
        $settings = $company->getSettings();

        if (isset($data['infl2']))        $settings->setInfl2((float) $data['infl2']);
        if (isset($data['infl3']))        $settings->setInfl3((float) $data['infl3']);
        if (isset($data['infl4']))        $settings->setInfl4((float) $data['infl4']);
        if (isset($data['infl5']))        $settings->setInfl5((float) $data['infl5']);
        if (isset($data['discountRate'])) $settings->setDiscountRate((float) $data['discountRate']);
        if (isset($data['taxRegime']))    $settings->setTaxRegime((string) $data['taxRegime']);
        if (isset($data['taxRate']))      $settings->setTaxRate((float) $data['taxRate']);
        if (isset($data['taxRateIs']))    $settings->setTaxRateIs((float) $data['taxRateIs']);
        if (isset($data['fondsRoulement'])) $settings->setFondsRoulement((int) $data['fondsRoulement']);

        $company->setLastModifiedBy($modifiedBy);

        $this->em->flush();

        return $company;
    }
}
