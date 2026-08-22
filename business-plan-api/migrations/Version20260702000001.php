<?php

declare(strict_types=1);

namespace App\Migration;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Le prix des produits devient mensuel (variation saisonnière possible, ex: vente de poisson).
 *
 * La colonne existante `price` n'est PAS touchée : elle continue de représenter le prix de
 * Janvier (mois 1) — aucune donnée existante n'est perdue ou modifiée.
 *
 * 11 nouvelles colonnes sont ajoutées pour les mois 2 à 12 (Février à Décembre) :
 * price_m2, price_m3, ..., price_m12 — BIGINT NOT NULL DEFAULT 0.
 * Elles démarrent à 0 (et non recopiées depuis Janvier) : c'est un choix assumé,
 * à saisir par l'utilisateur dans l'éditeur.
 *
 * Idempotente (vérifie chaque colonne via INFORMATION_SCHEMA avant de l'ajouter).
 */
final class Version20260702000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'products : ajout de price_m2..price_m12 (prix mensuel, price = prix Janvier inchangé)';
    }

    public function up(Schema $schema): void
    {
        $db = $this->connection->getDatabase();
        $previous = 'price';

        for ($m = 2; $m <= 12; $m++) {
            $col = "price_m{$m}";

            $exists = (int) $this->connection->fetchOne(
                'SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_SCHEMA = ? AND TABLE_NAME = \'products\' AND COLUMN_NAME = ?',
                [$db, $col]
            );

            if ($exists === 0) {
                $this->addSql("ALTER TABLE products ADD COLUMN {$col} BIGINT NOT NULL DEFAULT 0 AFTER {$previous}");
            }

            $previous = $col;
        }
    }

    public function down(Schema $schema): void
    {
        for ($m = 2; $m <= 12; $m++) {
            $this->addSql("ALTER TABLE products DROP COLUMN price_m{$m}");
        }
    }
}
