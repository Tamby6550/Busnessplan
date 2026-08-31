<?php

declare(strict_types=1);

namespace App\Migration;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;


final class Version20260825000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return "investment_terrains : ajout de la colonne nature_type ('immateriel' / 'physique'), défaut 'physique'.";
    }

    public function up(Schema $schema): void
    {
        $this->addColIfNotExists('investment_terrains', 'nature_type', "VARCHAR(20) NOT NULL DEFAULT 'physique' AFTER amount");
    }

    public function down(Schema $schema): void
    {
        $this->dropColIfExists('investment_terrains', 'nature_type');
    }

    // Helper : ajoute une colonne seulement si elle n'existe pas déjà 
    private function addColIfNotExists(string $table, string $col, string $definition): void
    {
        $exists = (int) $this->connection->fetchOne(
            'SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
            [$table, $col]
        );

        if ($exists === 0) {
            $this->connection->executeStatement("ALTER TABLE {$table} ADD COLUMN {$col} {$definition}");
        }
    }

    // Helper : supprime une colonne seulement si elle existe 
    private function dropColIfExists(string $table, string $col): void
    {
        $exists = (int) $this->connection->fetchOne(
            'SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
            [$table, $col]
        );

        if ($exists > 0) {
            $this->connection->executeStatement("ALTER TABLE {$table} DROP COLUMN {$col}");
        }
    }
}
