<?php

namespace App\Manager\Company;

use App\Entity\Company;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Validator\Exception\ValidationFailedException;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * Met à jour les métadonnées d'une entreprise (nom, secteur, promoteur).
 * updatedAt est géré automatiquement par le lifecycle callback #[PreUpdate].
 */
class UpdateCompanyMetaManager
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ValidatorInterface     $validator,
    ) {}

    public function update(Company $company, User $user, array $data): Company
    {
        $company->setName($data['name']);
        $company->setSecteur($data['secteur'] !== '' ? $data['secteur'] : null);
        $company->setPromoteur($data['promoteur'] !== '' ? $data['promoteur'] : null);
        $company->setDescriptionActivite($data['descriptionActivite'] !== '' ? $data['descriptionActivite'] : null);
        $company->setMarche($data['marche'] !== '' ? $data['marche'] : null);
        $company->setGenre($data['genre'] !== '' ? $data['genre'] : null);
        $company->setModeleEconomique($data['modeleEconomique']);
        $company->setEtatActivite($data['etatActivite'] !== '' ? $data['etatActivite'] : null);
        $company->setLastModifiedBy($user);

        $violations = $this->validator->validate($company);
        if (count($violations) > 0) {
            throw new ValidationFailedException($company, $violations);
        }

        $this->em->flush();

        return $company;
    }
}
