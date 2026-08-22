-- Script SQL à exécuter dans phpMyAdmin si vous souhaitez utiliser
-- le système d'invitation par email (futur usage).
-- Base de données : business_plan_aides

CREATE TABLE IF NOT EXISTS `invitation_tokens` (
  `id`         INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  `email`      VARCHAR(180)      NOT NULL,
  `first_name` VARCHAR(100)      NOT NULL DEFAULT '',
  `last_name`  VARCHAR(100)      NOT NULL DEFAULT '',
  `token`      VARCHAR(10)       NOT NULL,
  `created_at` DATETIME          NOT NULL COMMENT '(DC2Type:datetime_immutable)',
  `expires_at` DATETIME          NOT NULL COMMENT '(DC2Type:datetime_immutable)',
  `is_used`    TINYINT(1)        NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  INDEX `idx_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
