<?php

declare(strict_types=1);

namespace App\Migration;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;


final class Version20260706000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return "investment_terrains : suppression des colonnes de financement (financed_equity, financed_loan, financed_grant, loan_rate, loan_years), inutiles pour un terrain.";
    }

    public function up(Schema $schema): void
    {
        foreach (['financed_equity', 'financed_loan', 'financed_grant', 'loan_rate', 'loan_years'] as $col) {
            $this->dropColIfExists('investment_terrains', $col);
        }
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE investment_terrains ADD COLUMN financed_equity BIGINT NOT NULL DEFAULT 0 AFTER amount');
        $this->addSql('ALTER TABLE investment_terrains ADD COLUMN financed_loan BIGINT NOT NULL DEFAULT 0 AFTER financed_equity');
        $this->addSql('ALTER TABLE investment_terrains ADD COLUMN financed_grant BIGINT NOT NULL DEFAULT 0 AFTER financed_loan');
        $this->addSql('ALTER TABLE investment_terrains ADD COLUMN loan_rate NUMERIC(6,2) NOT NULL DEFAULT \'0\' AFTER financed_grant');
        $this->addSql('ALTER TABLE investment_terrains ADD COLUMN loan_years SMALLINT NOT NULL DEFAULT 5 AFTER loan_rate');
    }

    // ── Helper : supprime une colonne seulement si elle existe ───────────────
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
