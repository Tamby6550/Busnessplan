<?php

namespace App\Manager\Project;

use App\Entity\Project;
use App\Entity\User;
use App\Manager\ActivityLog\LogActivityManager;
use App\Manager\Company\DuplicateCompanyManager;
use App\Repository\ProjectRepository;
use App\Service\CopyNameGenerator;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Duplique un projet entier : le projet lui-même, toutes ses entreprises et
 * l'intégralité de leurs données.
 *
 * Tout est écrit dans une seule transaction : un projet à moitié copié serait
 * pire que pas de copie du tout, l'utilisateur ne pouvant pas deviner ce qui
 * manque. Les entreprises copiées gardent leur nom d'origine — le suffixe
 * "-copie" ne porte que sur le projet, sinon la copie d'"Angovo" contiendrait
 * "Boulangerie Rabe-copie", ce qui n'est pas l'intention.
 */
class DuplicateProjectManager
{
    public function __construct(
        private readonly EntityManagerInterface  $em,
        private readonly ProjectRepository       $projectRepository,
        private readonly CopyNameGenerator       $copyNameGenerator,
        private readonly DuplicateCompanyManager $duplicateCompanyManager,
        private readonly LogActivityManager      $logActivityManager,
    ) {}

    public function duplicate(Project $source, User $createdBy): Project
    {
        $copy = new Project();
        $copy->setName($this->copyNameGenerator->forCopy(
            $source->getName(),
            $this->projectRepository->findAllNames(),
        ));
        $copy->setDescription($source->getDescription());
        $copy->setCreatedBy($createdBy);

        $this->em->persist($copy);

        $this->em->wrapInTransaction(function () use ($source, $copy, $createdBy): void {
            foreach ($source->getCompanies() as $company) {
                $companyCopy = $this->duplicateCompanyManager->duplicate(
                    $company,
                    $createdBy,
                    $copy,
                    // Nom d'origine conservé : le projet cible est vide, aucun conflit possible.
                    $company->getName(),
                    // Un seul flush pour tout le projet, à la fin de la transaction.
                    false,
                );

                // Tient la collection du nouveau projet à jour pour que la réponse
                // renvoyée au tableau de bord contienne bien les entreprises copiées.
                $copy->addCompany($companyCopy);

                $this->logActivityManager->log(
                    $companyCopy,
                    $createdBy,
                    'projet',
                    'duplicate',
                    'company',
                    $company->getId(),
                    null,
                    $source->getName(),
                    $copy->getName(),
                );
            }

            $this->em->flush();
        });

        return $copy;
    }
}
