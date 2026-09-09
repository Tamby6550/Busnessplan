<?php

namespace App\Manager\Company;

use App\Entity\Company;
use App\Entity\Project;
use App\Entity\User;
use App\Manager\ActivityLog\LogActivityManager;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Copie une entreprise vers un ou plusieurs projets, en une seule transaction.
 *
 * Le projet d'origine est une destination valide comme une autre : y copier
 * revient à dupliquer sur place, avec la même règle de nommage.
 */
class CopyCompanyToProjectsManager
{
    public function __construct(
        private readonly EntityManagerInterface  $em,
        private readonly DuplicateCompanyManager $duplicateCompanyManager,
        private readonly LogActivityManager      $logActivityManager,
    ) {}

    /**
     * @param Project[]   $targetProjects
     * @param string|null $wantedName Nom saisi dans la modale ; l'unicité reste
     *                                garantie projet par projet.
     *
     * @return Company[] Les copies créées, dans l'ordre des projets cibles
     */
    public function copy(
        Company $source,
        array   $targetProjects,
        User    $createdBy,
        ?string $wantedName = null,
    ): array {
        $copies = [];

        $this->em->wrapInTransaction(function () use ($source, $targetProjects, $createdBy, $wantedName, &$copies): void {
            foreach ($targetProjects as $targetProject) {
                $copy = $this->duplicateCompanyManager->duplicate(
                    $source,
                    $createdBy,
                    $targetProject,
                    $wantedName,
                    false,
                );

                $this->logActivityManager->log(
                    $copy,
                    $createdBy,
                    'entreprise',
                    'copy',
                    'company',
                    $source->getId(),
                    null,
                    $source->getProject()?->getName(),
                    $targetProject->getName(),
                );

                $copies[] = $copy;

                // Chaque copie est écrite avant de passer à la cible suivante :
                // les noms déjà pris dans un projet doivent être visibles en base
                // quand on calcule le nom de la copie suivante dans ce même projet.
                $this->em->flush();
            }
        });

        return $copies;
    }
}
