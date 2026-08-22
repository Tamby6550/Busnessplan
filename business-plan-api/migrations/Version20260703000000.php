<?php

declare(strict_types=1);

namespace App\Migration;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Le coût unitaire des matières premières devient mensuel (variation saisonnière possible),
 * même principe que Version20260702000001.php pour le prix des produits.
 *
 * La colonne existante `unit_cost` n'est PAS touchée : elle continue de représenter le coût de
 * Janvier (mois 1) — aucune donnée existante n'est perdue ou modifiée.
 *
 * 11 nouvelles colonnes sont ajoutées pour les mois 2 à 12 (Février à Décembre) :
 * unit_cost_m2, unit_cost_m3, ..., unit_cost_m12 — BIGINT NOT NULL DEFAULT 0.
 * Elles démarrent à 0 (et non recopiées depuis Janvier), à saisir par l'utilisateur.
 *
 * Idempotente (vérifie chaque colonne via INFORMATION_SCHEMA avant de l'ajouter).
 */
final class Version20260703000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'materials : ajout de unit_cost_m2..unit_cost_m12 (coût mensuel, unit_cost = coût Janvier inchangé)';
    }

    public function up(Schema $schema): void
    {
        $db = $this->connection->getDatabase();
        $previous = 'unit_cost';

        for ($m = 2; $m <= 12; $m++) {
            $col = "unit_cost_m{$m}";

            $exists = (int) $this->connection->fetchOne(
                'SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = ? AND TABLE_NAME = \'materials\' AND COLUMN_NAME = ?',
                [$db, $col]
            );

            if ($exists === 0) {
                $this->addSql("ALTER TABLE materials ADD COLUMN {$col} BIGINT NOT NULL DEFAULT 0 AFTER {$previous}");
            }

            $previous = $col;
        }
    }

    public function down(Schema $schema): void
    {
        for ($m = 2; $m <= 12; $m++) {
            $this->addSql("ALTER TABLE materials DROP COLUMN unit_cost_m{$m}");
        }
    }
}
