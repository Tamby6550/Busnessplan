<?php

declare(strict_types=1);

namespace App\Migration;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;


final class Version20260703000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return "expenses : ajout de monthly_amount_m2..monthly_amount_m12 (montant mensuel, monthly_amount = montant Janvier inchangé, seasonality inchangée)";
    }

    public function up(Schema $schema): void
    {
        $db = $this->connection->getDatabase();
        $previous = 'monthly_amount';

        for ($m = 2; $m <= 12; $m++) {
            $col = "monthly_amount_m{$m}";

            $exists = (int) $this->connection->fetchOne(
                'SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = ? AND TABLE_NAME = \'expenses\' AND COLUMN_NAME = ?',
                [$db, $col]
            );

            if ($exists === 0) {
                $this->addSql("ALTER TABLE expenses ADD COLUMN {$col} BIGINT NOT NULL DEFAULT 0 AFTER {$previous}");
            }

            $previous = $col;
        }
    }

    public function down(Schema $schema): void
    {
        for ($m = 2; $m <= 12; $m++) {
            $this->addSql("ALTER TABLE expenses DROP COLUMN monthly_amount_m{$m}");
        }
    }
}
