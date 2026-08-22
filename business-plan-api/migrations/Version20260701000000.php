<?php

declare(strict_types=1);

namespace App\Migration;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Ajout des champs entreprise : description_activite, marche, genre,
 * modele_economique, etat_activite.
 * Compatible MySQL 5.7 (vérifie INFORMATION_SCHEMA avant d'ajouter).
 */
final class Version20260701000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Ajout des champs description_activite, marche, genre, modele_economique, etat_activite sur companies';
    }

    public function up(Schema $schema): void
    {
        $db = $this->connection->getDatabase();

        $columns = [
            'description_activite' => 'LONGTEXT DEFAULT NULL',
            'marche'               => 'LONGTEXT DEFAULT NULL',
            'genre'                => 'VARCHAR(10) DEFAULT NULL',
            'modele_economique'    => 'VARCHAR(20) DEFAULT NULL',
            'etat_activite'        => 'VARCHAR(20) DEFAULT NULL',
        ];

        foreach ($columns as $col => $definition) {
            $exists = (int) $this->connection->fetchOne(
                "SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'companies' AND COLUMN_NAME = ?",
                [$db, $col]
            );
            if ($exists === 0) {
                $this->addSql("ALTER TABLE companies ADD COLUMN {$col} {$definition}");
            }
        }
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE companies DROP COLUMN description_activite');
        $this->addSql('ALTER TABLE companies DROP COLUMN marche');
        $this->addSql('ALTER TABLE companies DROP COLUMN genre');
        $this->addSql('ALTER TABLE companies DROP COLUMN modele_economique');
        $this->addSql('ALTER TABLE companies DROP COLUMN etat_activite');
    }
}
