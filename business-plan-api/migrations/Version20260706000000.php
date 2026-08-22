<?php

declare(strict_types=1);

namespace App\Migration;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;


final class Version20260706000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return "Création de la table investment_terrains (Investissement Terrain, sans durée d'amortissement).";
    }

    public function up(Schema $schema): void
    {
        $this->connection->executeStatement('
            CREATE TABLE IF NOT EXISTS investment_terrains (
                id              INT UNSIGNED AUTO_INCREMENT NOT NULL,
                company_id      INT UNSIGNED NOT NULL,
                name            VARCHAR(255) NOT NULL DEFAULT \'Terrain\',
                amount          BIGINT       NOT NULL DEFAULT 0,
                financed_equity BIGINT       NOT NULL DEFAULT 0,
                financed_loan   BIGINT       NOT NULL DEFAULT 0,
                financed_grant  BIGINT       NOT NULL DEFAULT 0,
                loan_rate       NUMERIC(6,2) NOT NULL DEFAULT \'0\',
                loan_years      SMALLINT     NOT NULL DEFAULT 5,
                sort_order      SMALLINT     NOT NULL DEFAULT 0,
                created_at      DATETIME     NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
                updated_at      DATETIME     NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
                INDEX IDX_investment_terrains_company (company_id),
                PRIMARY KEY (id)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB
        ');

        $this->addFkIfMissing('investment_terrains', 'FK_investment_terrains_company',
            'ALTER TABLE investment_terrains ADD CONSTRAINT FK_investment_terrains_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE');
    }

    public function down(Schema $schema): void
    {
        $this->connection->executeStatement('DROP TABLE IF EXISTS investment_terrains');
    }

    // ── Helper : ajoute une FK seulement si elle n'existe pas déjà ───────────
    private function addFkIfMissing(string $table, string $constraint, string $sql): void
    {
        $exists = (int) $this->connection->executeQuery(
            'SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
             WHERE CONSTRAINT_SCHEMA = DATABASE()
               AND TABLE_NAME       = ?
               AND CONSTRAINT_NAME  = ?',
            [$table, $constraint]
        )->fetchOne();

        if ($exists === 0) {
            $this->connection->executeStatement($sql);
        }
    }
}
