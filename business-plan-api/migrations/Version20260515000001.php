<?php

declare(strict_types=1);

namespace App\Migration;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;


final class Version20260515000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Ajout de growth_rates (JSON) dans staff_members.';
    }

    public function up(Schema $schema): void
    {
        // 1. Vérifier si la colonne existe déjà
        $rows = $this->connection->executeQuery(
            "SHOW COLUMNS FROM staff_members LIKE 'growth_rates'"
        )->fetchAllAssociative();

        if (!empty($rows)) {
            $this->write('  <info>Colonne growth_rates deja presente - migration ignoree.</info>');
            return;
        }

        // 2. Ajouter en nullable d'abord (MySQL interdit NOT NULL sans DEFAULT sur JSON)
        $this->addSql("ALTER TABLE staff_members ADD COLUMN growth_rates JSON AFTER charges_rate");

        // 3. Initialiser toutes les lignes existantes
        $this->addSql("UPDATE staff_members SET growth_rates = '[0, 0, 0, 0]' WHERE growth_rates IS NULL");

        // 4. Passer en NOT NULL maintenant que toutes les lignes ont une valeur
        $this->addSql("ALTER TABLE staff_members MODIFY COLUMN growth_rates JSON NOT NULL");
    }

    public function down(Schema $schema): void
    {
        $rows = $this->connection->executeQuery(
            "SHOW COLUMNS FROM staff_members LIKE 'growth_rates'"
        )->fetchAllAssociative();

        if (!empty($rows)) {
            $this->addSql('ALTER TABLE staff_members DROP COLUMN growth_rates');
        }
    }
}
