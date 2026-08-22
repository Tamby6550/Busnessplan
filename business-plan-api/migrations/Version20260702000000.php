<?php

declare(strict_types=1);

namespace App\Migration;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * modele_economique devient un choix MULTIPLE (une entreprise peut être à la fois
 * "production de biens" et "vente de services").
 *
 * Stockage inchangé : toujours une VARCHAR, mais élargie de 20 à 50 caractères pour
 * contenir plusieurs valeurs séparées par des virgules (ex: "production,service"),
 * via le type Doctrine `simple_array` (CSV natif, aucune dépendance JSON).
 *
 * Rétro-compatible avec les données existantes : une valeur simple déjà en base
 * ('production' ou 'service') est lue par `simple_array` comme un tableau à un seul
 * élément — aucune migration de données n'est nécessaire.
 *
 * Idempotente (vérifie la longueur actuelle de la colonne avant de la modifier).
 */
final class Version20260702000000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return "modele_economique : choix multiple (VARCHAR 20 -> 50, format CSV via Doctrine simple_array)";
    }

    public function up(Schema $schema): void
    {
        $db = $this->connection->getDatabase();

        $length = $this->connection->fetchOne(
            "SELECT CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'companies' AND COLUMN_NAME = 'modele_economique'",
            [$db]
        );

        if ($length !== false && (int) $length < 50) {
            $this->addSql('ALTER TABLE companies MODIFY COLUMN modele_economique VARCHAR(50) DEFAULT NULL');
        }
    }

    public function down(Schema $schema): void
    {
        // Retour au choix unique : ne garde que la première valeur si plusieurs étaient sélectionnées.
        $this->addSql("UPDATE companies SET modele_economique = SUBSTRING_INDEX(modele_economique, ',', 1) WHERE modele_economique LIKE '%,%'");
        $this->addSql('ALTER TABLE companies MODIFY COLUMN modele_economique VARCHAR(20) DEFAULT NULL');
    }
}
