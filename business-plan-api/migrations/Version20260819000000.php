<?php

declare(strict_types=1);

namespace App\Migration;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;


final class Version20260819000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return "investments : ajout de equipment_type (électrique / non électrique) et contribution_type "
             . "(apport en nature = toujours 100% / apport financier = 0 à 99%). Colonnes purement additives, "
             . "aucune donnée existante (amount, financed_equity, financed_loan, financed_grant...) n'est modifiée. "
             . "Les lignes déjà saisies sont classées automatiquement : financed_equity = amount (et amount > 0) "
             . "=> 'nature', sinon => 'financier' (comportement identique à aujourd'hui, rien ne change pour elles).";
    }

    public function up(Schema $schema): void
    {
        $db = $this->connection->getDatabase();

        if (!$this->columnExists($db, 'investments', 'equipment_type')) {
            $this->addSql("ALTER TABLE investments ADD COLUMN equipment_type VARCHAR(20) DEFAULT NULL AFTER category");
        }

        if (!$this->columnExists($db, 'investments', 'contribution_type')) {
            $this->addSql("ALTER TABLE investments ADD COLUMN contribution_type VARCHAR(20) NOT NULL DEFAULT 'financier' AFTER financed_equity");

            // Rétro-classement des lignes existantes, sans toucher aux montants :
            // fonds propres = 100% du montant => apport en nature ; sinon => apport financier (inchangé).
            $this->addSql("UPDATE investments SET contribution_type = 'nature' WHERE amount > 0 AND financed_equity = amount");
        }
    }

    public function down(Schema $schema): void
    {
        $db = $this->connection->getDatabase();

        if ($this->columnExists($db, 'investments', 'contribution_type')) {
            $this->addSql("ALTER TABLE investments DROP COLUMN contribution_type");
        }

        if ($this->columnExists($db, 'investments', 'equipment_type')) {
            $this->addSql("ALTER TABLE investments DROP COLUMN equipment_type");
        }
    }

    private function columnExists(string $db, string $table, string $column): bool
    {
        return (int) $this->connection->fetchOne(
            'SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?',
            [$db, $table, $column]
        ) > 0;
    }
}
