<?php

namespace App\Controller\ActivityLog;

use App\Repository\ActivityLogRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Retourne les dernières entrées du journal d'activité pour une entreprise.
 * Query param : ?limit=50 (défaut 50, max 200)
 */
#[Route('/api/companies/{companyId}/activity-logs', name: 'api_get_activity_logs', methods: ['GET'])]
class GetActivityLogController extends AbstractController
{
    public function __construct(
        private readonly ActivityLogRepository $activityLogRepository,
    ) {}

    public function __invoke(int $companyId, Request $request): JsonResponse
    {
        $limit = min((int) $request->query->get('limit', 50), 200);

        $logs = $this->activityLogRepository->findRecentByCompany($companyId, $limit);

        if (empty($logs) && $companyId <= 0) {
            return $this->json(['error' => 'Entreprise introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $data = array_map(fn ($log) => [
            'id'         => $log->getId(),
            'section'    => $log->getSection(),
            'action'     => $log->getAction(),
            'entityType' => $log->getEntityType(),
            'entityId'   => $log->getEntityId(),
            'fieldName'  => $log->getFieldName(),
            'oldValue'   => $log->getOldValue(),
            'newValue'   => $log->getNewValue(),
            'user'       => [
                'id'       => $log->getUser()?->getId(),
                'fullName' => $log->getUser()?->getFullName(),
                'initials' => $log->getUser()?->getInitials(),
            ],
            'createdAt'  => $log->getCreatedAt()->format('c'),
        ], $logs);

        return $this->json($data);
    }
}
