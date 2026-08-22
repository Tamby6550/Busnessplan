<?php

declare(strict_types=1);

namespace App\Migration;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;


final class Version20260608000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Synchronisation LWS : ajoute les colonnes manquantes sans toucher aux données existantes.';
    }

    public function up(Schema $schema): void
    {
        // ── TABLE : users ─────────────────────────────────────────────────────
        $this->addColIfMissing('users', 'is_admin',
            'ALTER TABLE users ADD COLUMN is_admin TINYINT(1) NOT NULL DEFAULT 0 AFTER last_name');
        $this->addColIfMissing('users', 'can_view',
            'ALTER TABLE users ADD COLUMN can_view TINYINT(1) NOT NULL DEFAULT 0 AFTER is_admin');
        $this->addColIfMissing('users', 'can_edit',
            'ALTER TABLE users ADD COLUMN can_edit TINYINT(1) NOT NULL DEFAULT 0 AFTER can_view');
        $this->addColIfMissing('users', 'is_active',
            'ALTER TABLE users ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER can_edit');
        $this->addColIfMissing('users', 'last_login_at',
            'ALTER TABLE users ADD COLUMN last_login_at DATETIME DEFAULT NULL COMMENT \'(DC2Type:datetime_immutable)\' AFTER created_at');

        // ── TABLE : companies ─────────────────────────────────────────────────
        $this->addColIfMissing('companies', 'secteur',
            'ALTER TABLE companies ADD COLUMN secteur VARCHAR(255) DEFAULT NULL AFTER name');
        $this->addColIfMissing('companies', 'promoteur',
            'ALTER TABLE companies ADD COLUMN promoteur VARCHAR(255) DEFAULT NULL AFTER secteur');
        $this->addColIfMissing('companies', 'devise',
            'ALTER TABLE companies ADD COLUMN devise VARCHAR(10) NOT NULL DEFAULT \'Ar\' AFTER promoteur');
        $this->addColIfMissing('companies', 'last_modified_by_id',
            'ALTER TABLE companies ADD COLUMN last_modified_by_id INT UNSIGNED DEFAULT NULL AFTER created_by_id');
        $this->addColIfMissing('companies', 'is_validated',
            'ALTER TABLE companies ADD COLUMN is_validated TINYINT(1) NOT NULL DEFAULT 0 AFTER updated_at');
        $this->addColIfMissing('companies', 'validated_at',
            'ALTER TABLE companies ADD COLUMN validated_at DATETIME DEFAULT NULL COMMENT \'(DC2Type:datetime_immutable)\' AFTER is_validated');
        $this->addColIfMissing('companies', 'validated_by_id',
            'ALTER TABLE companies ADD COLUMN validated_by_id INT UNSIGNED DEFAULT NULL AFTER validated_at');

        // ── TABLE : company_settings ──────────────────────────────────────────
        $this->addColIfMissing('company_settings', 'infl2',
            'ALTER TABLE company_settings ADD COLUMN infl2 NUMERIC(6,2) NOT NULL DEFAULT \'0\'');
        $this->addColIfMissing('company_settings', 'infl3',
            'ALTER TABLE company_settings ADD COLUMN infl3 NUMERIC(6,2) NOT NULL DEFAULT \'0\'');
        $this->addColIfMissing('company_settings', 'infl4',
            'ALTER TABLE company_settings ADD COLUMN infl4 NUMERIC(6,2) NOT NULL DEFAULT \'0\'');
        $this->addColIfMissing('company_settings', 'infl5',
            'ALTER TABLE company_settings ADD COLUMN infl5 NUMERIC(6,2) NOT NULL DEFAULT \'0\'');
        $this->addColIfMissing('company_settings', 'discount_rate',
            'ALTER TABLE company_settings ADD COLUMN discount_rate NUMERIC(6,2) NOT NULL DEFAULT \'10\'');
        $this->addColIfMissing('company_settings', 'tax_regime',
            'ALTER TABLE company_settings ADD COLUMN tax_regime VARCHAR(2) NOT NULL DEFAULT \'IR\'');
        $this->addColIfMissing('company_settings', 'tax_rate',
            'ALTER TABLE company_settings ADD COLUMN tax_rate NUMERIC(6,2) NOT NULL DEFAULT \'20\'');
        $this->addColIfMissing('company_settings', 'tax_rate_is',
            'ALTER TABLE company_settings ADD COLUMN tax_rate_is NUMERIC(6,2) NOT NULL DEFAULT \'5\'');
        $this->addColIfMissing('company_settings', 'fonds_roulement',
            'ALTER TABLE company_settings ADD COLUMN fonds_roulement BIGINT NOT NULL DEFAULT 0');

        // ── TABLE : company_snapshots ─────────────────────────────────────────
        $this->addColIfMissing('company_snapshots', 'revenue_y1',
            'ALTER TABLE company_snapshots ADD COLUMN revenue_y1 BIGINT NOT NULL DEFAULT 0');
        $this->addColIfMissing('company_snapshots', 'net_income_y1',
            'ALTER TABLE company_snapshots ADD COLUMN net_income_y1 BIGINT NOT NULL DEFAULT 0');
        $this->addColIfMissing('company_snapshots', 'cash_cum_y1',
            'ALTER TABLE company_snapshots ADD COLUMN cash_cum_y1 BIGINT NOT NULL DEFAULT 0');
        $this->addColIfMissing('company_snapshots', 'break_even',
            'ALTER TABLE company_snapshots ADD COLUMN break_even BIGINT NOT NULL DEFAULT 0');
        $this->addColIfMissing('company_snapshots', 'completion_pct',
            'ALTER TABLE company_snapshots ADD COLUMN completion_pct SMALLINT NOT NULL DEFAULT 0');

        // ── TABLE : products ──────────────────────────────────────────────────
        $this->addColIfMissing('products', 'growth_rates',
            'ALTER TABLE products ADD COLUMN growth_rates JSON NOT NULL AFTER monthly_qty');
        // Initialiser les lignes existantes si growth_rates vient d\'être ajouté
        $this->addSql("UPDATE products SET growth_rates = '[0,0,0,0,0]' WHERE growth_rates IS NULL OR JSON_LENGTH(growth_rates) = 0");
        $this->addColIfMissing('products', 'sort_order',
            'ALTER TABLE products ADD COLUMN sort_order SMALLINT NOT NULL DEFAULT 0');

        // ── TABLE : materials ─────────────────────────────────────────────────
        $this->addColIfMissing('materials', 'growth_rates',
            'ALTER TABLE materials ADD COLUMN growth_rates JSON NOT NULL AFTER monthly_qty');
        $this->addSql("UPDATE materials SET growth_rates = '[0,0,0,0,0]' WHERE growth_rates IS NULL OR JSON_LENGTH(growth_rates) = 0");
        $this->addColIfMissing('materials', 'sort_order',
            'ALTER TABLE materials ADD COLUMN sort_order SMALLINT NOT NULL DEFAULT 0');

        // ── TABLE : expenses ──────────────────────────────────────────────────
        $this->addColIfMissing('expenses', 'inflation_growth',
            'ALTER TABLE expenses ADD COLUMN inflation_growth JSON NOT NULL AFTER seasonality');
        $this->addSql("UPDATE expenses SET inflation_growth = '[0,0,0,0,0]' WHERE inflation_growth IS NULL OR JSON_LENGTH(inflation_growth) = 0");
        $this->addColIfMissing('expenses', 'sort_order',
            'ALTER TABLE expenses ADD COLUMN sort_order SMALLINT NOT NULL DEFAULT 0');

        // ── TABLE : staff_members ─────────────────────────────────────────────
        // growth_rates déjà géré par Version20260515000001
        $this->addColIfMissing('staff_members', 'sort_order',
            'ALTER TABLE staff_members ADD COLUMN sort_order SMALLINT NOT NULL DEFAULT 0');

        // ── TABLE : investments ───────────────────────────────────────────────
        $this->addColIfMissing('investments', 'category',
            'ALTER TABLE investments ADD COLUMN category VARCHAR(255) DEFAULT NULL AFTER name');
        $this->addColIfMissing('investments', 'financed_grant',
            'ALTER TABLE investments ADD COLUMN financed_grant BIGINT NOT NULL DEFAULT 0 AFTER financed_loan');
        $this->addColIfMissing('investments', 'loan_rate',
            'ALTER TABLE investments ADD COLUMN loan_rate NUMERIC(6,2) NOT NULL DEFAULT \'0\' AFTER financed_grant');
        $this->addColIfMissing('investments', 'loan_years',
            'ALTER TABLE investments ADD COLUMN loan_years SMALLINT NOT NULL DEFAULT 5 AFTER loan_rate');
        $this->addColIfMissing('investments', 'sort_order',
            'ALTER TABLE investments ADD COLUMN sort_order SMALLINT NOT NULL DEFAULT 0');

        // ── TABLE : additional_fundings ───────────────────────────────────────
        $this->addColIfMissing('additional_fundings', 'loan_rate',
            'ALTER TABLE additional_fundings ADD COLUMN loan_rate NUMERIC(6,2) NOT NULL DEFAULT \'0\'');
        $this->addColIfMissing('additional_fundings', 'loan_years',
            'ALTER TABLE additional_fundings ADD COLUMN loan_years SMALLINT NOT NULL DEFAULT 1');
        $this->addColIfMissing('additional_fundings', 'subvention',
            'ALTER TABLE additional_fundings ADD COLUMN subvention BIGINT NOT NULL DEFAULT 0');

        // ── TABLE : activity_logs ─────────────────────────────────────────────
        $this->addColIfMissing('activity_logs', 'entity_type',
            'ALTER TABLE activity_logs ADD COLUMN entity_type VARCHAR(50) DEFAULT NULL');
        $this->addColIfMissing('activity_logs', 'entity_id',
            'ALTER TABLE activity_logs ADD COLUMN entity_id INT UNSIGNED DEFAULT NULL');
        $this->addColIfMissing('activity_logs', 'field_name',
            'ALTER TABLE activity_logs ADD COLUMN field_name VARCHAR(100) DEFAULT NULL');
        $this->addColIfMissing('activity_logs', 'old_value',
            'ALTER TABLE activity_logs ADD COLUMN old_value LONGTEXT DEFAULT NULL');
        $this->addColIfMissing('activity_logs', 'new_value',
            'ALTER TABLE activity_logs ADD COLUMN new_value LONGTEXT DEFAULT NULL');

        // ── TABLE : invitation_tokens ─────────────────────────────────────────
        $this->addColIfMissing('invitation_tokens', 'expires_at',
            'ALTER TABLE invitation_tokens ADD COLUMN expires_at DATETIME NOT NULL DEFAULT \'2099-01-01 00:00:00\' COMMENT \'(DC2Type:datetime_immutable)\' AFTER created_at');

        $this->write('  <info>Synchronisation terminée — toutes les colonnes sont à jour.</info>');
    }

    public function down(Schema $schema): void
    {
        // Le down ne supprime pas les colonnes pour éviter toute perte de données.
        $this->write('  <comment>down() non implémenté : les colonnes ajoutées sont conservées.</comment>');
    }

    // ── Helper ────────────────────────────────────────────────────────────────
    /**
     * Vérifie si la colonne existe dans la table, et exécute le SQL seulement si elle est absente.
     */
    private function addColIfMissing(string $table, string $column, string $sql): void
    {
        // Vérifie d'abord si la table existe (au cas où elle n'aurait pas été créée du tout)
        $tableExists = (int) $this->connection->executeQuery(
            'SELECT COUNT(*) FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
            [$table]
        )->fetchOne();

        if ($tableExists === 0) {
            $this->write("  <comment>Table '$table' introuvable — ignorée.</comment>");
            return;
        }

        $rows = $this->connection->executeQuery(
            "SHOW COLUMNS FROM `$table` LIKE ?",
            [$column]
        )->fetchAllAssociative();

        if (!empty($rows)) {
            // Colonne déjà présente → rien à faire
            return;
        }

        $this->write("  <info>Ajout colonne '$column' dans '$table'...</info>");
        $this->connection->executeStatement($sql);
    }
}
