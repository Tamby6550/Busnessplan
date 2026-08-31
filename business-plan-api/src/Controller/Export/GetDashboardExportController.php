<?php

namespace App\Controller\Export;

use App\Entity\User;
use App\Service\DashboardExportCache;
use App\Service\DashboardExportService;
use App\Service\DashboardXlsxBuilder;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

#[Route('/api/export/dashboard.xlsx', name: 'api_export_dashboard', methods: ['GET'])]
class GetDashboardExportController extends AbstractController
{
    public function __construct(
        private readonly DashboardExportService $exportService,
        private readonly DashboardXlsxBuilder $xlsxBuilder,
        private readonly DashboardExportCache $exportCache,
    ) {}

    public function __invoke(Request $request, #[CurrentUser] User $currentUser): Response
    {
        if (!$currentUser->isCanExport()) {
            throw $this->createAccessDeniedException(
                "L'export Excel est réservé aux administrateurs et managers.",
            );
        }

        $projectParam = $request->query->get('project');
        $projectId = $projectParam !== null && $projectParam !== '' ? (int) $projectParam : null;

        $date = (new \DateTimeImmutable())->format('Y-m-d');
        $filename = $projectId !== null
            ? "TableauDeBord_Projet{$projectId}_{$date}.xlsx"
            : "TableauDeBord_Complet_{$date}.xlsx";

        // 1) Sert le fichier pré-généré par la tâche planifiée
        //    app:cache-dashboard-exports (voir var/export-cache/) : lecture
        //    disque instantanée, aucune limite de temps d'exécution PHP-FPM
        //    à respecter. C'est le chemin normal une fois la tâche CRON
        //    configurée dans le panneau LWS.
        if ($this->exportCache->exists($projectId)) {
            $path = $this->exportCache->getCachePath($projectId);
            $response = new BinaryFileResponse($path);
            $response->setContentDisposition(ResponseHeaderBag::DISPOSITION_ATTACHMENT, $filename);
            $response->headers->set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            $response->headers->set('Cache-Control', 'no-store');
            $generatedAt = $this->exportCache->generatedAt($projectId);
            if ($generatedAt !== null) {
                $response->headers->set('X-Export-Generated-At', $generatedAt->format(\DateTimeInterface::ATOM));
            }
            return $response;
        }

        // 2) Repli : génération à la demande, uniquement si le cache n'existe
        //    pas encore (projet tout juste créé, ou tâche CRON pas encore
        //    lancée une première fois). Peut dépasser la limite de 60s de
        //    PHP-FPM sur l'hébergement mutualisé LWS si le volume de données
        //    est important — set_time_limit()/ini_set() n'ont, eux, aucun
        //    effet confirmé sur cet hébergement (limite non modifiable côté
        //    web). Voir app:cache-dashboard-exports pour la solution normale.
        @set_time_limit(300);
        @ini_set('memory_limit', '512M');

        $data = $this->exportService->loadContexts($currentUser, $projectId);
        $contexts = $data['contexts'];

        $workbook = $this->xlsxBuilder->build($contexts);

        $response = new StreamedResponse(function () use ($workbook) {
            $writer = new Xlsx($workbook);
            $writer->save('php://output');
            $workbook->disconnectWorksheets();
        });
        $response->headers->set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        $response->headers->set(
            'Content-Disposition',
            $response->headers->makeDisposition(ResponseHeaderBag::DISPOSITION_ATTACHMENT, $filename),
        );
        $response->headers->set('Cache-Control', 'no-store');
        $response->headers->set('X-Export-Generated-At', 'live');

        return $response;
    }
}
