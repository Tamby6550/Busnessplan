<?php

namespace App\Manager\Project;

use App\Entity\Project;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Validator\Exception\ValidationFailedException;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * Modifie le nom et la description d'un projet existant.
 */
class UpdateProjectManager
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ValidatorInterface     $validator,
    ) {}

    public function update(Project $project, string $name, ?string $description): Project
    {
        $project->setName(trim($name));
        $project->setDescription($description ? trim($description) : null);

        $violations = $this->validator->validate($project);
        if (count($violations) > 0) {
            throw new ValidationFailedException($project, $violations);
        }

        $this->em->flush();

        return $project;
    }
}
