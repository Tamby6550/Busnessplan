<?php

namespace App\Manager\Project;

use App\Entity\Project;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Supprime un projet et toutes ses entreprises (CASCADE).
 */
class DeleteProjectManager
{
    public function __construct(
        private readonly EntityManagerInterface $em,
    ) {}

    public function delete(Project $project): void
    {
        $this->em->remove($project);
        $this->em->flush();
    }
}
