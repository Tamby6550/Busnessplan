<?php

namespace App\Manager\ActivityLog;

use App\Entity\ActivityLog;
use App\Entity\Company;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Enregistre une entrée dans le journal d'activité.
 * Appelé par les managers après chaque modification significative.
 */
class LogActivityManager
{
    public function __construct(
        private readonly EntityManagerInterface $em,
    ) {}

    public function log(
        Company  $company,
        User     $user,
        string   $section,
        string   $action,
        ?string  $entityType = null,
        ?int     $entityId   = null,
        ?string  $fieldName  = null,
        mixed    $oldValue   = null,
        mixed    $newValue   = null,
    ): ActivityLog {
        $log = new ActivityLog();
        $log->setCompany($company);
        $log->setUser($user);
        $log->setSection($section);
        $log->setAction($action);
        $log->setEntityType($entityType);
        $log->setEntityId($entityId);
        $log->setFieldName($fieldName);
        $log->setOldValue($oldValue !== null ? (string) $oldValue : null);
        $log->setNewValue($newValue !== null ? (string) $newValue : null);

        $this->em->persist($log);
        // Pas de flush ici — le flush est fait par le manager appelant

        return $log;
    }
}
