<?php

namespace App\Service;

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

class DashboardExportCache
{
    public function __construct(
        #[Autowire(param: 'kernel.project_dir')]
        private readonly string $projectDir,
    ) {}

    public function getCacheDir(): string
    {
        return $this->projectDir . '/var/export-cache';
    }

    public function getCachePath(?int $projectId): string
    {
        $name = $projectId !== null ? "dashboard_project_{$projectId}.xlsx" : 'dashboard_all.xlsx';
        return $this->getCacheDir() . '/' . $name;
    }

    public function exists(?int $projectId): bool
    {
        return is_file($this->getCachePath($projectId));
    }

    public function generatedAt(?int $projectId): ?\DateTimeImmutable
    {
        $mtime = @filemtime($this->getCachePath($projectId));
        return $mtime !== false ? (new \DateTimeImmutable())->setTimestamp($mtime) : null;
    }

    /**
     * Écrit le classeur de façon atomique : écriture dans un fichier
     * temporaire puis renommage, pour qu'une requête concurrente ne lise
     * jamais un fichier à moitié écrit pendant la régénération périodique.
     */
    public function write(?int $projectId, Spreadsheet $workbook): void
    {
        $dir = $this->getCacheDir();
        if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
            throw new \RuntimeException("Impossible de créer le dossier de cache : {$dir}");
        }

        $finalPath = $this->getCachePath($projectId);
        $tmpPath = $finalPath . '.tmp-' . bin2hex(random_bytes(4));

        $writer = new Xlsx($workbook);
        $writer->save($tmpPath);

        if (!@rename($tmpPath, $finalPath)) {
            @unlink($tmpPath);
            throw new \RuntimeException("Impossible d'écrire le fichier de cache : {$finalPath}");
        }
    }
}
