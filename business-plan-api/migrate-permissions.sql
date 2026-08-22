-- Migration : ajout des colonnes permissions utilisateur et validation BP
-- À exécuter UNE SEULE FOIS sur la base de données

ALTER TABLE `users`
    ADD COLUMN `is_admin` TINYINT(1) NOT NULL DEFAULT 0 AFTER `last_name`,
    ADD COLUMN `can_view` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_admin`,
    ADD COLUMN `can_edit` TINYINT(1) NOT NULL DEFAULT 0 AFTER `can_view`;

ALTER TABLE `companies`
    ADD COLUMN `is_validated` TINYINT(1) NOT NULL DEFAULT 0 AFTER `updated_at`,
    ADD COLUMN `validated_at` DATETIME DEFAULT NULL AFTER `is_validated`,
    ADD COLUMN `validated_by_id` INT UNSIGNED DEFAULT NULL AFTER `validated_at`,
    ADD CONSTRAINT `fk_companies_validated_by`
        FOREIGN KEY (`validated_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

-- Mettre le premier utilisateur comme admin (optionnel, à adapter)
-- UPDATE `users` SET `is_admin` = 1 WHERE `email` = 'admin@businessplan.mg';
