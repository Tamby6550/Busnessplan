<?php

declare(strict_types=1);

namespace App\Migration;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;


final class Version20260629000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Ajoute la colonne role dans la table users (remplace is_admin/can_view/can_edit)';
    }

    public function up(Schema $schema): void
    {
        // 1. Vérifier si la colonne role existe déjà
        $columns = $this->connection->executeQuery("
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME   = 'users'
              AND COLUMN_NAME  = 'role'
        ")->fetchAllAssociative();

        if (empty($columns)) {
            // La colonne n'existe pas → on l'ajoute
            $this->addSql("
                ALTER TABLE users
                ADD COLUMN `role` VARCHAR(20) NOT NULL DEFAULT 'standard'
            ");
        }

        // 2. Peupler role depuis les anciennes colonnes booléennes
        //    (uniquement si ces colonnes existent encore)
        $oldCols = $this->connection->executeQuery("
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME   = 'users'
              AND COLUMN_NAME  IN ('is_admin', 'can_edit', 'can_view')
        ")->fetchAllAssociative();

        if (!empty($oldCols)) {
            $this->addSql("
                UPDATE users
                SET `role` = CASE
                    WHEN is_admin = 1 THEN 'admin'
                    WHEN can_edit = 1 THEN 'editor'
                    WHEN can_view = 1 THEN 'viewer'
                    ELSE 'standard'
                END
                WHERE `role` = 'standard'
            ");
        }
    }

    public function down(Schema $schema): void
    {
        // Vérifier si la colonne existe avant de la supprimer
        $columns = $this->connection->executeQuery("
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME   = 'users'
              AND COLUMN_NAME  = 'role'
        ")->fetchAllAssociative();

        if (!empty($columns)) {
            $this->addSql("ALTER TABLE users DROP COLUMN `role`");
        }
    }
}
