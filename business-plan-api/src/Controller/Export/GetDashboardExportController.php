<?php

namespace App\Controller\Export;

use App\Entity\User;
use App\Service\DashboardExportService;
use App\Service\DashboardXlsxBuilder;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * Export Excel complet du tableau de bord, généré côté serveur, destiné à être
 * interrogé directement par Power Query ("Obtenir des données → À partir du Web")
 * — sur le même principe que l'export synchrone de KoboToolBox.
 *
 *   GET /api/export/dashboard.xlsx            → toutes les entreprises visibles par l'utilisateur
 *   GET /api/export/dashboard.xlsx?project=5  → uniquement les entreprises du projet n°5
 *
 * Authentification : Basic Auth (voir le firewall "export" dans security.yaml),
 * avec l'e-mail et le mot de passe habituels du compte BusinessPlanA — Power
 * Query envoie l'en-tête "Authorization: Basic ..." à chaque requête, il n'y a
 * pas d'étape de connexion séparée comme avec le JWT utilisé par le reste de
 * l'API. Le rafraîchissement dans Excel/Power Query reste manuel (bouton
 * "Actualiser" dans l'onglet Données), exactement comme pour KoboToolBox.
 */
#[Route('/api/export/dashboard.xlsx', name: 'api_export_dashboard', methods: ['GET'])]
class GetDashboardExportController extends AbstractController
{
    public function __construct(
        private readonly DashboardExportService $exportService,
        private readonly DashboardXlsxBuilder $xlsxBuilder,
    ) {}

    public function __invoke(Request $request, #[CurrentUser] User $currentUser): Response
    {
        $projectParam = $request->query->get('project');
        $projectId = $projectParam !== null && $projectParam !== '' ? (int) $projectParam : null;

        $data = $this->exportService->loadContexts($currentUser, $projectId);
        $contexts = $data['contexts'];

        $workbook = $this->xlsxBuilder->build($contexts);

        $date = (new \DateTimeImmutable())->format('Y-m-d');
        $filename = $projectId !== null
            ? "TableauDeBord_Projet{$projectId}_{$date}.xlsx"
            : "TableauDeBord_Complet_{$date}.xlsx";

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

        return $response;
    }
}
