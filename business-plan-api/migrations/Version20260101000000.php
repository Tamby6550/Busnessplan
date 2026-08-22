<?php

declare(strict_types=1);

namespace App\Migration;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;


final class Version20260101000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Création fondation : users, projects, companies et toutes les sous-entités (IF NOT EXISTS).';
    }

    public function up(Schema $schema): void
    {
      
        $this->connection->executeStatement('
            CREATE TABLE IF NOT EXISTS users (
                id            INT UNSIGNED AUTO_INCREMENT NOT NULL,
                email         VARCHAR(180)  NOT NULL,
                password_hash VARCHAR(255)  NOT NULL,
                first_name    VARCHAR(100)  NOT NULL DEFAULT \'\',
                last_name     VARCHAR(100)  NOT NULL DEFAULT \'\',
                is_admin      TINYINT(1)    NOT NULL DEFAULT 0,
                can_view      TINYINT(1)    NOT NULL DEFAULT 0,
                can_edit      TINYINT(1)    NOT NULL DEFAULT 0,
                is_active     TINYINT(1)    NOT NULL DEFAULT 1,
                created_at    DATETIME      NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
                last_login_at DATETIME      DEFAULT NULL COMMENT \'(DC2Type:datetime_immutable)\',
                UNIQUE INDEX UNIQ_users_email (email),
                PRIMARY KEY (id)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB
        ');

       
        $this->connection->executeStatement('
            CREATE TABLE IF NOT EXISTS projects (
                id             INT UNSIGNED AUTO_INCREMENT NOT NULL,
                created_by_id  INT UNSIGNED NOT NULL,
                name           VARCHAR(255) NOT NULL,
                description    LONGTEXT     DEFAULT NULL,
                created_at     DATETIME     NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
                updated_at     DATETIME     NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
                INDEX IDX_projects_created_by (created_by_id),
                PRIMARY KEY (id)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB
        ');

       
        $this->connection->executeStatement('
            CREATE TABLE IF NOT EXISTS companies (
                id                  INT UNSIGNED AUTO_INCREMENT NOT NULL,
                project_id          INT UNSIGNED NOT NULL,
                created_by_id       INT UNSIGNED NOT NULL,
                last_modified_by_id INT UNSIGNED DEFAULT NULL,
                validated_by_id     INT UNSIGNED DEFAULT NULL,
                name                VARCHAR(255) NOT NULL,
                secteur             VARCHAR(255) DEFAULT NULL,
                promoteur           VARCHAR(255) DEFAULT NULL,
                devise              VARCHAR(10)  NOT NULL DEFAULT \'Ar\',
                is_validated        TINYINT(1)   NOT NULL DEFAULT 0,
                validated_at        DATETIME     DEFAULT NULL COMMENT \'(DC2Type:datetime_immutable)\',
                created_at          DATETIME     NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
                updated_at          DATETIME     NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
                INDEX IDX_companies_project     (project_id),
                INDEX IDX_companies_created_by  (created_by_id),
                INDEX IDX_companies_modified_by (last_modified_by_id),
                INDEX IDX_companies_validated_by(validated_by_id),
                PRIMARY KEY (id)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB
        ');

       
        $this->connection->executeStatement('
            CREATE TABLE IF NOT EXISTS company_settings (
                id               INT UNSIGNED AUTO_INCREMENT NOT NULL,
                company_id       INT UNSIGNED NOT NULL,
                infl2            NUMERIC(6,2) NOT NULL DEFAULT \'0\',
                infl3            NUMERIC(6,2) NOT NULL DEFAULT \'0\',
                infl4            NUMERIC(6,2) NOT NULL DEFAULT \'0\',
                infl5            NUMERIC(6,2) NOT NULL DEFAULT \'0\',
                discount_rate    NUMERIC(6,2) NOT NULL DEFAULT \'10\',
                tax_regime       VARCHAR(2)   NOT NULL DEFAULT \'IR\',
                tax_rate         NUMERIC(6,2) NOT NULL DEFAULT \'20\',
                tax_rate_is      NUMERIC(6,2) NOT NULL DEFAULT \'5\',
                fonds_roulement  BIGINT       NOT NULL DEFAULT 0,
                UNIQUE INDEX UNIQ_company_settings_company (company_id),
                PRIMARY KEY (id)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB
        ');

      
        $this->connection->executeStatement('
            CREATE TABLE IF NOT EXISTS company_snapshots (
                company_id      INT UNSIGNED NOT NULL,
                revenue_y1      BIGINT       NOT NULL DEFAULT 0,
                net_income_y1   BIGINT       NOT NULL DEFAULT 0,
                cash_cum_y1     BIGINT       NOT NULL DEFAULT 0,
                break_even      BIGINT       NOT NULL DEFAULT 0,
                completion_pct  SMALLINT     NOT NULL DEFAULT 0,
                updated_at      DATETIME     NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
                PRIMARY KEY (company_id)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB
        ');

      
        $this->connection->executeStatement('
            CREATE TABLE IF NOT EXISTS products (
                id           INT UNSIGNED AUTO_INCREMENT NOT NULL,
                company_id   INT UNSIGNED NOT NULL,
                name         VARCHAR(255) NOT NULL DEFAULT \'Produit\',
                price        BIGINT       NOT NULL DEFAULT 0,
                monthly_qty  JSON         NOT NULL,
                growth_rates JSON         NOT NULL,
                sort_order   SMALLINT     NOT NULL DEFAULT 0,
                created_at   DATETIME     NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
                updated_at   DATETIME     NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
                INDEX IDX_products_company (company_id),
                PRIMARY KEY (id)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB
        ');

      
        $this->connection->executeStatement('
            CREATE TABLE IF NOT EXISTS materials (
                id           INT UNSIGNED AUTO_INCREMENT NOT NULL,
                company_id   INT UNSIGNED NOT NULL,
                name         VARCHAR(255) NOT NULL DEFAULT \'Matière\',
                unit_cost    BIGINT       NOT NULL DEFAULT 0,
                monthly_qty  JSON         NOT NULL,
                growth_rates JSON         NOT NULL,
                sort_order   SMALLINT     NOT NULL DEFAULT 0,
                created_at   DATETIME     NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
                updated_at   DATETIME     NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
                INDEX IDX_materials_company (company_id),
                PRIMARY KEY (id)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB
        ');

       
        $this->connection->executeStatement('
            CREATE TABLE IF NOT EXISTS expenses (
                id               INT UNSIGNED AUTO_INCREMENT NOT NULL,
                company_id       INT UNSIGNED NOT NULL,
                name             VARCHAR(255) NOT NULL DEFAULT \'Charge\',
                monthly_amount   BIGINT       NOT NULL DEFAULT 0,
                seasonality      JSON         NOT NULL,
                inflation_growth JSON         NOT NULL,
                sort_order       SMALLINT     NOT NULL DEFAULT 0,
                created_at       DATETIME     NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
                updated_at       DATETIME     NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
                INDEX IDX_expenses_company (company_id),
                PRIMARY KEY (id)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB
        ');

      
        $this->connection->executeStatement('
            CREATE TABLE IF NOT EXISTS staff_members (
                id              INT UNSIGNED AUTO_INCREMENT NOT NULL,
                company_id      INT UNSIGNED NOT NULL,
                role_name       VARCHAR(255) NOT NULL DEFAULT \'Poste\',
                monthly_salary  BIGINT       NOT NULL DEFAULT 0,
                headcount       SMALLINT     NOT NULL DEFAULT 1,
                charges_rate    NUMERIC(6,2) NOT NULL DEFAULT \'13\',
                growth_rates    JSON         NOT NULL,
                sort_order      SMALLINT     NOT NULL DEFAULT 0,
                created_at      DATETIME     NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
                updated_at      DATETIME     NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
                INDEX IDX_staff_members_company (company_id),
                PRIMARY KEY (id)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB
        ');

      
        $this->connection->executeStatement('
            CREATE TABLE IF NOT EXISTS investments (
                id              INT UNSIGNED AUTO_INCREMENT NOT NULL,
                company_id      INT UNSIGNED NOT NULL,
                name            VARCHAR(255) NOT NULL DEFAULT \'Immobilisation\',
                category        VARCHAR(255) DEFAULT NULL,
                amount          BIGINT       NOT NULL DEFAULT 0,
                useful_life     SMALLINT     NOT NULL DEFAULT 5,
                financed_equity BIGINT       NOT NULL DEFAULT 0,
                financed_loan   BIGINT       NOT NULL DEFAULT 0,
                financed_grant  BIGINT       NOT NULL DEFAULT 0,
                loan_rate       NUMERIC(6,2) NOT NULL DEFAULT \'0\',
                loan_years      SMALLINT     NOT NULL DEFAULT 5,
                sort_order      SMALLINT     NOT NULL DEFAULT 0,
                created_at      DATETIME     NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
                updated_at      DATETIME     NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
                INDEX IDX_investments_company (company_id),
                PRIMARY KEY (id)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB
        ');

       
        $this->connection->executeStatement('
            CREATE TABLE IF NOT EXISTS additional_fundings (
                id          INT UNSIGNED AUTO_INCREMENT NOT NULL,
                company_id  INT UNSIGNED NOT NULL,
                year_number SMALLINT     NOT NULL,
                equity      BIGINT       NOT NULL DEFAULT 0,
                loan        BIGINT       NOT NULL DEFAULT 0,
                loan_rate   NUMERIC(6,2) NOT NULL DEFAULT \'0\',
                loan_years  SMALLINT     NOT NULL DEFAULT 1,
                subvention  BIGINT       NOT NULL DEFAULT 0,
                UNIQUE INDEX uk_company_year (company_id, year_number),
                PRIMARY KEY (id)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB
        ');

        
        $this->connection->executeStatement('
            CREATE TABLE IF NOT EXISTS activity_logs (
                id          INT UNSIGNED AUTO_INCREMENT NOT NULL,
                company_id  INT UNSIGNED NOT NULL,
                user_id     INT UNSIGNED NOT NULL,
                section     VARCHAR(50)  NOT NULL,
                action      VARCHAR(30)  NOT NULL,
                entity_type VARCHAR(50)  DEFAULT NULL,
                entity_id   INT UNSIGNED DEFAULT NULL,
                field_name  VARCHAR(100) DEFAULT NULL,
                old_value   LONGTEXT     DEFAULT NULL,
                new_value   LONGTEXT     DEFAULT NULL,
                created_at  DATETIME     NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
                INDEX idx_company_date (company_id, created_at),
                INDEX idx_user         (user_id),
                PRIMARY KEY (id)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB
        ');

        
        $this->connection->executeStatement('
            CREATE TABLE IF NOT EXISTS invitation_tokens (
                id         INT UNSIGNED AUTO_INCREMENT NOT NULL,
                email      VARCHAR(180) NOT NULL,
                first_name VARCHAR(100) NOT NULL DEFAULT \'\',
                last_name  VARCHAR(100) NOT NULL DEFAULT \'\',
                token      VARCHAR(10)  NOT NULL,
                created_at DATETIME     NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
                expires_at DATETIME     NOT NULL COMMENT \'(DC2Type:datetime_immutable)\',
                is_used    TINYINT(1)   NOT NULL DEFAULT 0,
                PRIMARY KEY (id)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB
        ');

     
        $this->addFkIfMissing('projects',          'FK_projects_created_by',
            'ALTER TABLE projects ADD CONSTRAINT FK_projects_created_by FOREIGN KEY (created_by_id) REFERENCES users (id) ON DELETE RESTRICT');

        $this->addFkIfMissing('companies',         'FK_companies_project',
            'ALTER TABLE companies ADD CONSTRAINT FK_companies_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE');
        $this->addFkIfMissing('companies',         'FK_companies_created_by',
            'ALTER TABLE companies ADD CONSTRAINT FK_companies_created_by FOREIGN KEY (created_by_id) REFERENCES users (id) ON DELETE RESTRICT');
        $this->addFkIfMissing('companies',         'FK_companies_modified_by',
            'ALTER TABLE companies ADD CONSTRAINT FK_companies_modified_by FOREIGN KEY (last_modified_by_id) REFERENCES users (id) ON DELETE SET NULL');
        $this->addFkIfMissing('companies',         'FK_companies_validated_by',
            'ALTER TABLE companies ADD CONSTRAINT FK_companies_validated_by FOREIGN KEY (validated_by_id) REFERENCES users (id) ON DELETE SET NULL');

        $this->addFkIfMissing('company_settings',  'FK_settings_company',
            'ALTER TABLE company_settings ADD CONSTRAINT FK_settings_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE');
        $this->addFkIfMissing('company_snapshots', 'FK_snapshots_company',
            'ALTER TABLE company_snapshots ADD CONSTRAINT FK_snapshots_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE');
        $this->addFkIfMissing('products',          'FK_products_company',
            'ALTER TABLE products ADD CONSTRAINT FK_products_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE');
        $this->addFkIfMissing('materials',         'FK_materials_company',
            'ALTER TABLE materials ADD CONSTRAINT FK_materials_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE');
        $this->addFkIfMissing('expenses',          'FK_expenses_company',
            'ALTER TABLE expenses ADD CONSTRAINT FK_expenses_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE');
        $this->addFkIfMissing('staff_members',     'FK_staff_company',
            'ALTER TABLE staff_members ADD CONSTRAINT FK_staff_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE');
        $this->addFkIfMissing('investments',       'FK_investments_company',
            'ALTER TABLE investments ADD CONSTRAINT FK_investments_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE');
        $this->addFkIfMissing('additional_fundings','FK_fundings_company',
            'ALTER TABLE additional_fundings ADD CONSTRAINT FK_fundings_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE');
        $this->addFkIfMissing('activity_logs',     'FK_logs_company',
            'ALTER TABLE activity_logs ADD CONSTRAINT FK_logs_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE');
        $this->addFkIfMissing('activity_logs',     'FK_logs_user',
            'ALTER TABLE activity_logs ADD CONSTRAINT FK_logs_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT');
    }

    public function down(Schema $schema): void
    {
        // Suppression dans l'ordre inverse (FK d'abord)
        $this->connection->executeStatement('SET FOREIGN_KEY_CHECKS = 0');
        foreach ([
            'activity_logs', 'invitation_tokens', 'additional_fundings',
            'investments', 'staff_members', 'expenses', 'materials',
            'products', 'company_snapshots', 'company_settings',
            'companies', 'projects', 'users',
        ] as $table) {
            $this->connection->executeStatement("DROP TABLE IF EXISTS `$table`");
        }
        $this->connection->executeStatement('SET FOREIGN_KEY_CHECKS = 1');
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
