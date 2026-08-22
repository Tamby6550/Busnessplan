<?php

namespace App\Manager\Project;

use App\Entity\Project;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Validator\Exception\ValidationFailedException;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * Crée un nouveau projet pour un utilisateur.
 */
class CreateProjectManager
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ValidatorInterface     $validator,
    ) {}

    public function create(string $name, ?string $description, User $createdBy): Project
    {
        $project = new Project();
        $project->setName(trim($name));
        $project->setDescription($description ? trim($description) : null);
        $project->setCreatedBy($createdBy);

        $violations = $this->validator->validate($project);
        if (count($violations) > 0) {
            throw new ValidationFailedException($project, $violations);
        }

        $this->em->persist($project);
        $this->em->flush();

        return $project;
    }
}
