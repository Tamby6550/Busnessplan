<?php

namespace App\Command;

use App\Entity\User;
use App\Repository\ProjectRepository;
use App\Repository\UserRepository;
use App\Service\DashboardExportCache;
use App\Service\DashboardExportService;
use App\Service\DashboardXlsxBuilder;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Pré-génère les fichiers Excel du tableau de bord (un par projet + un
 * global "tous projets") et les écrit dans var/export-cache/ via
 * DashboardExportCache. GetDashboardExportController sert ensuite ces
 * fichiers tels quels, instantanément, au lieu de reconstruire le classeur
 * à chaque requête — ce qui dépassait la limite de 60s de PHP-FPM (web) sur
 * l'hébergement mutualisé LWS dès que le volume de données grandissait.
 *
 * Le CLI PHP n'a pas cette limite de 60s, d'où l'exécution ici plutôt que
 * dans le contrôleur.
 *
 * À planifier périodiquement dans le panneau LWS (tâche CRON), par exemple
 * toutes les 15 minutes :
 *   php bin/console app:cache-dashboard-exports --env=prod --no-debug
 *
 * Usage manuel : php bin/console app:cache-dashboard-exports
 */
#[AsCommand(
    name: 'app:cache-dashboard-exports',
    description: "Pré-génère les fichiers Excel du tableau de bord pour l'export Power Query / téléchargement.",
)]
class CacheDashboardExportsCommand extends Command
{
    public function __construct(
        private readonly ProjectRepository $projectRepository,
        private readonly UserRepository $userRepository,
        private readonly DashboardExportService $exportService,
        private readonly DashboardXlsxBuilder $xlsxBuilder,
        private readonly DashboardExportCache $exportCache,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $io->title('Pré-génération des exports Excel du tableau de bord');

        // N'importe quel utilisateur actif admin/manager convient : ces deux
        // rôles ont toujours isCanView() = true (voir User::isCanExport() /
        // isCanView()), donc les données visibles sont identiques quel que
        // soit celui choisi ici.
        $refUser = $this->userRepository->findOneActiveCanExport();
        if ($refUser === null) {
            $io->error('Aucun utilisateur actif admin/manager trouvé — impossible de déterminer les données visibles.');
            return Command::FAILURE;
        }
        $io->writeln(sprintf('Utilisateur de référence : %s (%s)', $refUser->getEmail(), $refUser->getRole()));

        $projects = $this->projectRepository->findAllWithCompanies();
        $io->writeln(sprintf('%d projet(s) trouvé(s).', count($projects)));
        $io->newLine();

        $t0 = microtime(true);
        $failures = 0;

        foreach ($projects as $project) {
            $label = sprintf('Projet #%d (%s)', $project->getId(), $project->getName());
            try {
                $this->generateOne($refUser, $project->getId(), $label, $io);
            } catch (\Throwable $e) {
                $failures++;
                $io->writeln(sprintf('  <error>ÉCHEC</error> %s : %s', $label, $e->getMessage()));
            }
        }

        try {
            $this->generateOne($refUser, null, 'Tous les projets', $io);
        } catch (\Throwable $e) {
            $failures++;
            $io->writeln(sprintf('  <error>ÉCHEC</error> Tous les projets : %s', $e->getMessage()));
        }

        $io->newLine();
        $total = microtime(true) - $t0;
        if ($failures > 0) {
            $io->warning(sprintf('Terminé en %.1fs avec %d échec(s) — voir ci-dessus.', $total, $failures));
            return Command::FAILURE;
        }
        $io->success(sprintf('Terminé en %.1fs — tous les fichiers ont été régénérés.', $total));
        return Command::SUCCESS;
    }

    private function generateOne(User $user, ?int $projectId, string $label, SymfonyStyle $io): void
    {
        $t0 = microtime(true);
        $data = $this->exportService->loadContexts($user, $projectId);
        $workbook = $this->xlsxBuilder->build($data['contexts']);
        $this->exportCache->write($projectId, $workbook);
        $workbook->disconnectWorksheets();
        $io->writeln(sprintf(
            '  <info>OK</info>  %-40s %.2fs  (%d entreprise(s), %d ignorée(s))',
            $label,
            microtime(true) - $t0,
            count($data['contexts']),
            count($data['skipped']),
        ));
    }
}
