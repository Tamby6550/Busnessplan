-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Hôte : 127.0.0.1:3306
-- Généré le : sam. 22 août 2026 à 08:04
-- Version du serveur : 9.1.0
-- Version de PHP : 8.3.14

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `business_plan_aides`
--

-- --------------------------------------------------------

--
-- Structure de la table `activity_logs`
--

DROP TABLE IF EXISTS `activity_logs`;
CREATE TABLE IF NOT EXISTS `activity_logs` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `company_id` int UNSIGNED NOT NULL,
  `user_id` int UNSIGNED NOT NULL,
  `section` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entity_id` int UNSIGNED DEFAULT NULL,
  `field_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `old_value` longtext COLLATE utf8mb4_unicode_ci,
  `new_value` longtext COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL COMMENT '(DC2Type:datetime_immutable)',
  PRIMARY KEY (`id`),
  KEY `IDX_F34B1DCE979B1AD6` (`company_id`),
  KEY `idx_company_date` (`company_id`,`created_at`),
  KEY `idx_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `additional_fundings`
--

DROP TABLE IF EXISTS `additional_fundings`;
CREATE TABLE IF NOT EXISTS `additional_fundings` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `company_id` int UNSIGNED NOT NULL,
  `year_number` smallint NOT NULL,
  `equity` bigint NOT NULL DEFAULT '0',
  `loan` bigint NOT NULL DEFAULT '0',
  `loan_rate` decimal(6,2) NOT NULL DEFAULT '0.00',
  `loan_years` smallint NOT NULL DEFAULT '1',
  `subvention` bigint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_company_year` (`company_id`,`year_number`),
  KEY `IDX_CEBC09ED979B1AD6` (`company_id`)
) ENGINE=InnoDB AUTO_INCREMENT=86 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `additional_fundings`
--

INSERT INTO `additional_fundings` (`id`, `company_id`, `year_number`, `equity`, `loan`, `loan_rate`, `loan_years`, `subvention`) VALUES
(21, 5, 1, 0, 0, 0.00, 1, 0),
(22, 5, 2, 0, 0, 5.00, 5, 0),
(23, 5, 3, 0, 0, 0.00, 1, 0),
(24, 5, 4, 0, 0, 0.00, 1, 0),
(25, 5, 5, 0, 0, 0.00, 1, 0),
(31, 7, 1, 0, 0, 0.00, 1, 0),
(32, 7, 2, 0, 500000, 5.00, 2, 0),
(33, 7, 3, 0, 0, 0.00, 1, 0),
(34, 7, 4, 0, 0, 0.00, 1, 0),
(35, 7, 5, 0, 0, 0.00, 1, 0),
(41, 9, 1, 0, 0, 5.00, 1, 0),
(42, 9, 2, 0, 0, 0.00, 1, 0),
(43, 9, 3, 0, 0, 0.00, 1, 0),
(44, 9, 4, 0, 0, 0.00, 1, 0),
(45, 9, 5, 0, 0, 0.00, 1, 0),
(61, 13, 1, 0, 0, 0.00, 1, 0),
(62, 13, 2, 0, 0, 0.00, 1, 0),
(63, 13, 3, 0, 0, 0.00, 1, 0),
(64, 13, 4, 0, 0, 0.00, 1, 0),
(65, 13, 5, 0, 0, 0.00, 1, 0),
(76, 16, 1, 0, 0, 0.00, 1, 0),
(77, 16, 2, 0, 0, 0.00, 1, 0),
(78, 16, 3, 0, 0, 0.00, 1, 0),
(79, 16, 4, 0, 0, 0.00, 1, 0),
(80, 16, 5, 0, 0, 0.00, 1, 0),
(81, 17, 1, 0, 0, 0.00, 1, 0),
(82, 17, 2, 0, 0, 0.00, 1, 0),
(83, 17, 3, 0, 0, 0.00, 1, 0),
(84, 17, 4, 0, 0, 0.00, 1, 0),
(85, 17, 5, 0, 0, 0.00, 1, 0);

-- --------------------------------------------------------

--
-- Structure de la table `companies`
--

DROP TABLE IF EXISTS `companies`;
CREATE TABLE IF NOT EXISTS `companies` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` int UNSIGNED NOT NULL,
  `created_by_id` int UNSIGNED NOT NULL,
  `last_modified_by_id` int UNSIGNED DEFAULT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `secteur` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `promoteur` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `devise` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Ar',
  `created_at` datetime NOT NULL COMMENT '(DC2Type:datetime_immutable)',
  `updated_at` datetime NOT NULL COMMENT '(DC2Type:datetime_immutable)',
  `validated_by_id` int UNSIGNED DEFAULT NULL,
  `is_validated` tinyint(1) NOT NULL DEFAULT '0',
  `validated_at` datetime DEFAULT NULL COMMENT '(DC2Type:datetime_immutable)',
  `description_activite` longtext COLLATE utf8mb4_unicode_ci,
  `marche` longtext COLLATE utf8mb4_unicode_ci,
  `genre` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `modele_economique` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `etat_activite` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `IDX_8244AA3A166D1F9C` (`project_id`),
  KEY `IDX_8244AA3AB03A8386` (`created_by_id`),
  KEY `IDX_8244AA3AF703974A` (`last_modified_by_id`),
  KEY `IDX_8244AA3AC69DE5E5` (`validated_by_id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `companies`
--

INSERT INTO `companies` (`id`, `project_id`, `created_by_id`, `last_modified_by_id`, `name`, `secteur`, `promoteur`, `devise`, `created_at`, `updated_at`, `validated_by_id`, `is_validated`, `validated_at`, `description_activite`, `marche`, `genre`, `modele_economique`, `etat_activite`) VALUES
(5, 2, 2, 6, 'Boulangerie Rabe', 'Commerce', 'Rabe Jean', 'Ar', '2026-05-15 06:45:12', '2026-08-20 11:45:56', 6, 1, '2026-06-30 03:35:56', 'Vente local de pain', 'les villageois', 'femme', 'service', 'existante'),
(7, 2, 1, 6, 'Voanjo', 'Agriculture', 'Rakoto', 'Ar', '2026-05-18 11:56:30', '2026-06-04 06:05:36', NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL),
(9, 2, 1, 6, 'Elevage Avicole Test', 'Avicole', 'Rasoa', 'Ar', '2026-05-19 12:17:47', '2026-07-24 07:25:05', 7, 1, '2026-06-30 03:36:42', NULL, NULL, NULL, NULL, NULL),
(13, 2, 5, 6, 'Epicerie', 'Commerce', 'Rasoa', 'Ar', '2026-06-04 07:51:12', '2026-07-02 13:42:37', NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL),
(16, 2, 6, 6, 'Couture', 'Commerce', 'Miavaka', 'Ar', '2026-07-14 11:34:23', '2026-07-14 11:37:02', NULL, 0, NULL, 'Projet Couture', 'client', 'femme', 'production', 'nouvelle'),
(17, 2, 6, 6, 'Poule pandeuse', 'Elevage', NULL, 'Ar', '2026-08-20 13:29:21', '2026-08-20 13:30:37', NULL, 0, NULL, NULL, 'Epicerie Ambositra, en gros', 'homme', 'production', 'nouvelle');

-- --------------------------------------------------------

--
-- Structure de la table `company_settings`
--

DROP TABLE IF EXISTS `company_settings`;
CREATE TABLE IF NOT EXISTS `company_settings` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `company_id` int UNSIGNED NOT NULL,
  `infl2` decimal(6,2) NOT NULL DEFAULT '0.00',
  `infl3` decimal(6,2) NOT NULL DEFAULT '0.00',
  `infl4` decimal(6,2) NOT NULL DEFAULT '0.00',
  `infl5` decimal(6,2) NOT NULL DEFAULT '0.00',
  `discount_rate` decimal(6,2) NOT NULL DEFAULT '10.00',
  `tax_regime` varchar(2) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'IR',
  `tax_rate` decimal(6,2) NOT NULL DEFAULT '20.00',
  `tax_rate_is` decimal(6,2) NOT NULL DEFAULT '5.00',
  `fonds_roulement` bigint NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `UNIQ_FDD2B5A8979B1AD6` (`company_id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `company_settings`
--

INSERT INTO `company_settings` (`id`, `company_id`, `infl2`, `infl3`, `infl4`, `infl5`, `discount_rate`, `tax_regime`, `tax_rate`, `tax_rate_is`, `fonds_roulement`) VALUES
(5, 5, 6.00, 6.00, 6.00, 6.00, 10.00, 'IS', 20.00, 5.00, 500000),
(7, 7, 0.00, 0.00, 0.00, 0.00, 10.00, 'IS', 20.00, 5.00, 0),
(9, 9, 0.00, 0.00, 0.00, 0.00, 10.00, 'IR', 20.00, 50.00, 0),
(13, 13, 0.00, 0.00, 0.00, 0.00, 10.00, 'IR', 20.00, 5.00, 0),
(16, 16, 0.00, 0.00, 0.00, 0.00, 0.00, 'IR', 0.00, 0.00, 0),
(17, 17, 0.00, 0.00, 0.00, 0.00, 0.00, 'IR', 0.00, 0.00, 0);

-- --------------------------------------------------------

--
-- Structure de la table `company_snapshots`
--

DROP TABLE IF EXISTS `company_snapshots`;
CREATE TABLE IF NOT EXISTS `company_snapshots` (
  `company_id` int UNSIGNED NOT NULL,
  `revenue_y1` bigint NOT NULL DEFAULT '0',
  `net_income_y1` bigint NOT NULL DEFAULT '0',
  `cash_cum_y1` bigint NOT NULL DEFAULT '0',
  `break_even` bigint NOT NULL DEFAULT '0',
  `completion_pct` smallint NOT NULL DEFAULT '0',
  `updated_at` datetime NOT NULL COMMENT '(DC2Type:datetime_immutable)',
  PRIMARY KEY (`company_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `company_snapshots`
--

INSERT INTO `company_snapshots` (`company_id`, `revenue_y1`, `net_income_y1`, `cash_cum_y1`, `break_even`, `completion_pct`, `updated_at`) VALUES
(5, 12000000, 3514000, 5014000, 5610909, 100, '2026-08-20 11:45:56'),
(7, 18000000, 3600000, 3600000, 0, 75, '2026-06-30 03:30:11'),
(9, 86400000, 8236800, 9528000, 78163200, 88, '2026-08-19 08:10:09'),
(13, 4350000, 4350000, 4350000, 0, 63, '2026-07-02 13:47:06'),
(16, 6372220, 468972, 470060, 2322466, 88, '2026-07-24 07:09:45'),
(17, 58500000, 55420000, 56100000, 3080000, 75, '2026-08-20 13:47:25');

-- --------------------------------------------------------

--
-- Structure de la table `doctrine_migration_versions`
--

DROP TABLE IF EXISTS `doctrine_migration_versions`;
CREATE TABLE IF NOT EXISTS `doctrine_migration_versions` (
  `version` varchar(191) COLLATE utf8mb3_unicode_ci NOT NULL,
  `executed_at` datetime DEFAULT NULL,
  `execution_time` int DEFAULT NULL,
  PRIMARY KEY (`version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_unicode_ci;

--
-- Déchargement des données de la table `doctrine_migration_versions`
--

INSERT INTO `doctrine_migration_versions` (`version`, `executed_at`, `execution_time`) VALUES
('App\\Migration\\Version20260101000000', '2026-05-15 06:22:28', 179),
('App\\Migration\\Version20260515000001', '2026-05-15 06:29:40', 150),
('App\\Migration\\Version20260607183758', '2026-06-29 13:21:56', 561),
('App\\Migration\\Version20260608000000', '2026-06-29 13:21:56', 200),
('App\\Migration\\Version20260629000000', '2026-06-29 13:25:36', 230),
('App\\Migration\\Version20260701000000', '2026-06-30 08:02:31', 943),
('App\\Migration\\Version20260702000000', '2026-07-02 10:37:36', 473),
('App\\Migration\\Version20260702000001', '2026-07-02 13:39:40', 511),
('App\\Migration\\Version20260703000000', '2026-07-03 09:55:40', 731),
('App\\Migration\\Version20260703000001', '2026-07-05 15:37:07', 640),
('App\\Migration\\Version20260706000000', '2026-07-06 12:44:10', 324),
('App\\Migration\\Version20260706000001', '2026-08-19 06:39:30', 327),
('App\\Migration\\Version20260819000000', '2026-08-19 06:39:30', 289),
('DoctrineMigrations\\Version20250916180513', '2026-06-16 12:35:36', 35),
('DoctrineMigrations\\Version20250923090250', '2026-06-16 12:35:36', 3),
('DoctrineMigrations\\Version20250924064319', '2026-06-16 12:35:36', 3),
('DoctrineMigrations\\Version20250924132902', '2026-06-16 12:35:36', 1),
('DoctrineMigrations\\Version20251016105939', '2026-06-16 12:35:36', 4),
('DoctrineMigrations\\Version20251017132046', '2026-06-16 12:35:36', 2),
('DoctrineMigrations\\Version20251021082633', '2026-06-16 12:35:36', 16),
('DoctrineMigrations\\Version20251022075551', '2026-06-16 12:35:36', 0),
('DoctrineMigrations\\Version20251023134033', '2026-06-16 12:35:36', 4),
('DoctrineMigrations\\Version20251024133421', '2026-06-16 12:35:36', 2),
('DoctrineMigrations\\Version20251028125210', '2026-06-16 12:35:36', 1),
('DoctrineMigrations\\Version20251030111350', '2026-06-16 12:35:36', 2035),
('DoctrineMigrations\\Version20251108124720', '2026-06-16 12:35:38', 7),
('DoctrineMigrations\\Version20260311080914', '2026-06-16 12:40:12', 3),
('DoctrineMigrations\\Version20260311123206', '2026-06-16 12:40:12', 29),
('DoctrineMigrations\\Version20260609000001', '2026-06-16 12:40:12', 2),
('DoctrineMigrations\\Version20260610000001', '2026-06-16 12:40:12', 7),
('DoctrineMigrations\\Version20260612000001', '2026-06-16 12:40:12', 2),
('DoctrineMigrations\\Version20260616000001', '2026-06-16 12:40:12', 1929),
('DoctrineMigrations\\Version20260617000001', '2026-06-16 12:50:50', 27),
('DoctrineMigrations\\Version20260617000002', '2026-06-18 15:06:58', 10),
('DoctrineMigrations\\Version20260617000003', '2026-06-18 15:06:58', 2),
('DoctrineMigrations\\Version20260618000001', '2026-06-18 15:06:58', 51);

-- --------------------------------------------------------

--
-- Structure de la table `expenses`
--

DROP TABLE IF EXISTS `expenses`;
CREATE TABLE IF NOT EXISTS `expenses` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `company_id` int UNSIGNED NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Charge',
  `monthly_amount` bigint NOT NULL DEFAULT '0',
  `monthly_amount_m2` bigint NOT NULL DEFAULT '0',
  `monthly_amount_m3` bigint NOT NULL DEFAULT '0',
  `monthly_amount_m4` bigint NOT NULL DEFAULT '0',
  `monthly_amount_m5` bigint NOT NULL DEFAULT '0',
  `monthly_amount_m6` bigint NOT NULL DEFAULT '0',
  `monthly_amount_m7` bigint NOT NULL DEFAULT '0',
  `monthly_amount_m8` bigint NOT NULL DEFAULT '0',
  `monthly_amount_m9` bigint NOT NULL DEFAULT '0',
  `monthly_amount_m10` bigint NOT NULL DEFAULT '0',
  `monthly_amount_m11` bigint NOT NULL DEFAULT '0',
  `monthly_amount_m12` bigint NOT NULL DEFAULT '0',
  `seasonality` json NOT NULL,
  `inflation_growth` json NOT NULL,
  `sort_order` smallint NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL COMMENT '(DC2Type:datetime_immutable)',
  `updated_at` datetime NOT NULL COMMENT '(DC2Type:datetime_immutable)',
  PRIMARY KEY (`id`),
  KEY `IDX_2496F35B979B1AD6` (`company_id`)
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `expenses`
--

INSERT INTO `expenses` (`id`, `company_id`, `name`, `monthly_amount`, `monthly_amount_m2`, `monthly_amount_m3`, `monthly_amount_m4`, `monthly_amount_m5`, `monthly_amount_m6`, `monthly_amount_m7`, `monthly_amount_m8`, `monthly_amount_m9`, `monthly_amount_m10`, `monthly_amount_m11`, `monthly_amount_m12`, `seasonality`, `inflation_growth`, `sort_order`, `created_at`, `updated_at`) VALUES
(12, 5, 'Electricité', 60000, 50000, 60000, 60000, 80000, 60000, 60000, 60000, 60000, 60000, 60000, 60000, '[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]', '[5, 5, 5, 5, 0]', 1, '2026-05-15 07:00:40', '2026-08-19 06:46:26'),
(17, 9, 'Eau/Electricité', 300000, 300000, 300000, 300000, 300000, 300000, 300000, 300000, 300000, 300000, 300000, 300000, '[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]', '[0, 0, 0, 0, 0]', 1, '2026-05-19 12:34:27', '2026-08-19 08:10:09'),
(18, 9, 'Médicaments', 6000, 6000, 6000, 6000, 6000, 6000, 6000, 6000, 6000, 6000, 6000, 6000, '[500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500]', '[0, 0, 0, 0, 0]', 2, '2026-05-19 12:35:03', '2026-08-19 08:10:09'),
(21, 9, 'Provende avant pente', 18000, 18000, 18000, 18000, 18000, 18000, 18000, 18000, 18000, 18000, 18000, 18000, '[160, 160, 160, 160, 160, 160, 160, 160, 160, 160, 160, 160]', '[0, 0, 0, 0, 0]', 3, '2026-05-26 11:52:18', '2026-08-19 08:10:09'),
(31, 16, 'Electricité', 20000, 20000, 47859, 20000, 20000, 20000, 20000, 20000, 20000, 20000, 20000, 20000, '[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]', '[0, 0, 0, 0, 0]', -1, '2026-07-14 11:49:02', '2026-07-24 07:09:45'),
(32, 17, 'Provende poullette', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]', '[0, 0, 0, 0, 0]', -1, '2026-08-20 13:47:25', '2026-08-20 13:47:25');

-- --------------------------------------------------------

--
-- Structure de la table `investments`
--

DROP TABLE IF EXISTS `investments`;
CREATE TABLE IF NOT EXISTS `investments` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `company_id` int UNSIGNED NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Immobilisation',
  `category` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `equipment_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` bigint NOT NULL DEFAULT '0',
  `useful_life` smallint NOT NULL DEFAULT '5',
  `financed_equity` bigint NOT NULL DEFAULT '0',
  `contribution_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'financier',
  `financed_loan` bigint NOT NULL DEFAULT '0',
  `financed_grant` bigint NOT NULL DEFAULT '0',
  `loan_rate` decimal(6,2) NOT NULL DEFAULT '0.00',
  `loan_years` smallint NOT NULL DEFAULT '5',
  `sort_order` smallint NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL COMMENT '(DC2Type:datetime_immutable)',
  `updated_at` datetime NOT NULL COMMENT '(DC2Type:datetime_immutable)',
  PRIMARY KEY (`id`),
  KEY `IDX_74FD72E0979B1AD6` (`company_id`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `investments`
--

INSERT INTO `investments` (`id`, `company_id`, `name`, `category`, `equipment_type`, `amount`, `useful_life`, `financed_equity`, `contribution_type`, `financed_loan`, `financed_grant`, `loan_rate`, `loan_years`, `sort_order`, `created_at`, `updated_at`) VALUES
(9, 5, 'Four éléctrique', NULL, 'non_electrique', 3000000, 5, 0, 'financier', 3000000, 0, 20.00, 1, 1, '2026-05-15 07:01:40', '2026-08-19 06:46:26'),
(10, 5, 'Pétrin', NULL, 'non_electrique', 2000000, 5, 0, 'financier', 0, 2000000, 8.00, 5, 2, '2026-05-15 08:59:07', '2026-08-19 06:46:26'),
(17, 9, 'Local', NULL, 'non_electrique', 820000, 5, 820000, 'nature', 0, 0, 0.00, 1, 3, '2026-05-19 12:21:56', '2026-08-19 08:10:09'),
(22, 9, 'congélateur horizontal', NULL, 'electrique', 1640000, 5, 1640000, 'nature', 0, 0, 0.00, 1, 4, '2026-05-28 07:25:17', '2026-08-19 08:10:09'),
(30, 16, 'kkkk', NULL, NULL, 5444, 5, 2722, 'financier', 0, 2722, 0.00, 1, -1, '2026-07-22 18:47:28', '2026-07-24 07:09:45'),
(31, 9, 'Balance', NULL, 'electrique', 210000, 5, 210000, 'nature', 0, 0, 0.00, 1, 2, '2026-07-24 07:17:56', '2026-08-19 08:10:09'),
(32, 9, 'Caisse isotherme', NULL, 'electrique', 286000, 5, 0, 'financier', 0, 286000, 0.00, 1, 1, '2026-07-24 07:18:47', '2026-08-19 08:10:09'),
(33, 9, 'Congélateur 500l', NULL, 'electrique', 3500000, 5, 3500000, 'nature', 0, 0, 0.00, 1, 0, '2026-07-24 07:20:08', '2026-08-19 08:10:09'),
(34, 17, 'Cage', NULL, 'non_electrique', 3400000, 5, 3400000, 'nature', 0, 0, 0.00, 1, -1, '2026-08-20 13:39:48', '2026-08-20 13:47:25');

-- --------------------------------------------------------

--
-- Structure de la table `investment_terrains`
--

DROP TABLE IF EXISTS `investment_terrains`;
CREATE TABLE IF NOT EXISTS `investment_terrains` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `company_id` int UNSIGNED NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Terrain',
  `amount` bigint NOT NULL DEFAULT '0',
  `sort_order` smallint NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL COMMENT '(DC2Type:datetime_immutable)',
  `updated_at` datetime NOT NULL COMMENT '(DC2Type:datetime_immutable)',
  PRIMARY KEY (`id`),
  KEY `IDX_investment_terrains_company` (`company_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `investment_terrains`
--

INSERT INTO `investment_terrains` (`id`, `company_id`, `name`, `amount`, `sort_order`, `created_at`, `updated_at`) VALUES
(4, 5, 'Terrain 3', 1000000, -3, '2026-07-07 06:34:16', '2026-08-19 06:46:27'),
(6, 17, 'Local', 3500000, -1, '2026-08-20 13:37:44', '2026-08-20 13:41:59');

-- --------------------------------------------------------

--
-- Structure de la table `invitation_tokens`
--

DROP TABLE IF EXISTS `invitation_tokens`;
CREATE TABLE IF NOT EXISTS `invitation_tokens` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `email` varchar(180) COLLATE utf8mb4_unicode_ci NOT NULL,
  `first_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL COMMENT '(DC2Type:datetime_immutable)',
  `expires_at` datetime NOT NULL COMMENT '(DC2Type:datetime_immutable)',
  `is_used` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `materials`
--

DROP TABLE IF EXISTS `materials`;
CREATE TABLE IF NOT EXISTS `materials` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `company_id` int UNSIGNED NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Matière',
  `unit_cost` bigint NOT NULL DEFAULT '0',
  `unit_cost_m2` bigint NOT NULL DEFAULT '0',
  `unit_cost_m3` bigint NOT NULL DEFAULT '0',
  `unit_cost_m4` bigint NOT NULL DEFAULT '0',
  `unit_cost_m5` bigint NOT NULL DEFAULT '0',
  `unit_cost_m6` bigint NOT NULL DEFAULT '0',
  `unit_cost_m7` bigint NOT NULL DEFAULT '0',
  `unit_cost_m8` bigint NOT NULL DEFAULT '0',
  `unit_cost_m9` bigint NOT NULL DEFAULT '0',
  `unit_cost_m10` bigint NOT NULL DEFAULT '0',
  `unit_cost_m11` bigint NOT NULL DEFAULT '0',
  `unit_cost_m12` bigint NOT NULL DEFAULT '0',
  `monthly_qty` json NOT NULL,
  `growth_rates` json NOT NULL,
  `sort_order` smallint NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL COMMENT '(DC2Type:datetime_immutable)',
  `updated_at` datetime NOT NULL COMMENT '(DC2Type:datetime_immutable)',
  PRIMARY KEY (`id`),
  KEY `IDX_9B1716B5979B1AD6` (`company_id`)
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `materials`
--

INSERT INTO `materials` (`id`, `company_id`, `name`, `unit_cost`, `unit_cost_m2`, `unit_cost_m3`, `unit_cost_m4`, `unit_cost_m5`, `unit_cost_m6`, `unit_cost_m7`, `unit_cost_m8`, `unit_cost_m9`, `unit_cost_m10`, `unit_cost_m11`, `unit_cost_m12`, `monthly_qty`, `growth_rates`, `sort_order`, `created_at`, `updated_at`) VALUES
(7, 5, 'Farine (50 kg)', 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, 150000, '[3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]', '[4, 4, 4, 4, 0]', 1, '2026-05-15 06:50:09', '2026-08-19 06:46:26'),
(26, 7, 'Farine', 12000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '[100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100]', '[0, 0, 0, 0, 0]', 1, '2026-06-03 13:46:22', '2026-06-04 06:43:34'),
(39, 16, 'Tissu viscose robe', 8000, 8000, 8000, 8000, 8000, 8000, 8000, 8000, 8000, 8000, 8000, 8000, '[25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25]', '[0, 0, 0, 0, 0]', -1, '2026-07-14 11:45:49', '2026-07-24 07:09:45'),
(40, 16, 'Fil', 3500, 3500, 3500, 3500, 3500, 3500, 3500, 3500, 3500, 3500, 3500, 3500, '[2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]', '[0, 0, 0, 0, 0]', -2, '2026-07-14 11:48:34', '2026-07-24 07:09:45'),
(41, 16, 'Tissu fibrane', 8000, 8000, 8000, 8000, 8000, 8000, 8000, 8000, 8000, 8000, 8000, 8000, '[20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20]', '[0, 0, 0, 0, 0]', -3, '2026-07-15 08:47:30', '2026-07-24 07:09:45'),
(42, 16, 'Tissu à poids', 12000, 12000, 12000, 120, 12000, 12000, 7455, 7455, 12000, 12000, 12000, 12000, '[10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10]', '[0, 0, 0, 0, 0]', -4, '2026-07-15 11:23:01', '2026-07-24 07:09:45');

-- --------------------------------------------------------

--
-- Structure de la table `products`
--

DROP TABLE IF EXISTS `products`;
CREATE TABLE IF NOT EXISTS `products` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `company_id` int UNSIGNED NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Produit',
  `price` bigint NOT NULL DEFAULT '0',
  `price_m2` bigint NOT NULL DEFAULT '0',
  `price_m3` bigint NOT NULL DEFAULT '0',
  `price_m4` bigint NOT NULL DEFAULT '0',
  `price_m5` bigint NOT NULL DEFAULT '0',
  `price_m6` bigint NOT NULL DEFAULT '0',
  `price_m7` bigint NOT NULL DEFAULT '0',
  `price_m8` bigint NOT NULL DEFAULT '0',
  `price_m9` bigint NOT NULL DEFAULT '0',
  `price_m10` bigint NOT NULL DEFAULT '0',
  `price_m11` bigint NOT NULL DEFAULT '0',
  `price_m12` bigint NOT NULL DEFAULT '0',
  `monthly_qty` json NOT NULL,
  `growth_rates` json NOT NULL,
  `sort_order` smallint NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL COMMENT '(DC2Type:datetime_immutable)',
  `updated_at` datetime NOT NULL COMMENT '(DC2Type:datetime_immutable)',
  PRIMARY KEY (`id`),
  KEY `IDX_B3BA5A5A979B1AD6` (`company_id`)
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `products`
--

INSERT INTO `products` (`id`, `company_id`, `name`, `price`, `price_m2`, `price_m3`, `price_m4`, `price_m5`, `price_m6`, `price_m7`, `price_m8`, `price_m9`, `price_m10`, `price_m11`, `price_m12`, `monthly_qty`, `growth_rates`, `sort_order`, `created_at`, `updated_at`) VALUES
(8, 5, 'Brioche', 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, '[1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000]', '[0, 0, 0, 0, 0]', 1, '2026-05-15 06:46:58', '2026-08-19 06:46:26'),
(11, 9, 'Poisson', 8000, 8000, 8000, 8000, 8000, 8000, 8000, 8000, 8000, 8000, 8000, 8000, '[500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500]', '[0, 0, 0, 0, 0]', 1, '2026-05-19 12:23:15', '2026-08-19 08:10:09'),
(13, 9, 'Poules', 20000, 20000, 20000, 20000, 20000, 20000, 20000, 20000, 20000, 20000, 20000, 20000, '[160, 160, 160, 160, 160, 160, 160, 160, 160, 160, 160, 160]', '[0, 0, 0, 0, 0]', 2, '2026-05-26 12:33:59', '2026-08-19 08:10:09'),
(14, 7, 'Farine', 15000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '[100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100]', '[0, 0, 0, 0, 0]', 1, '2026-05-31 18:53:30', '2026-06-04 06:43:34'),
(18, 13, 'Sucre', 3500, 3500, 3500, 3500, 3500, 3500, 3500, 3500, 3500, 3500, 3500, 3500, '[100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100]', '[5, 5, 5, 5, 0]', 1, '2026-06-04 11:43:43', '2026-07-02 13:47:06'),
(19, 13, 'Riz', 3000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '[50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50]', '[5, 5, 5, 5, 0]', 2, '2026-06-04 11:44:57', '2026-07-02 13:47:06'),
(26, 5, 'donuts', 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, '[1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000]', '[5, 9, 5, 5, 0]', 0, '2026-07-05 15:58:17', '2026-08-19 06:46:26'),
(28, 16, 'Robe babyd', 35000, 35000, 35000, 35000, 35000, 35000, 35000, 35000, 35000, 35000, 35000, 35000, '[10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10]', '[0, 0, 0, 0, 0]', -2, '2026-07-14 11:41:30', '2026-07-24 07:09:45'),
(30, 16, 'Haut', 20000, 4444, 7444, 20000, 20000, 20000, 41222, 20000, 4112, 20000, 20000, 20000, '[10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10]', '[0, 0, 0, 0, 0]', -4, '2026-07-15 08:46:54', '2026-07-24 07:09:45'),
(31, 17, 'Oeufs', 650, 650, 650, 650, 650, 650, 650, 650, 650, 650, 650, 650, '[7500, 7500, 7500, 7500, 7500, 7500, 7500, 7500, 7500, 7500, 7500, 7500]', '[0, 0, 0, 0, 0]', -1, '2026-08-20 13:30:47', '2026-08-20 13:47:25');

-- --------------------------------------------------------

--
-- Structure de la table `projects`
--

DROP TABLE IF EXISTS `projects`;
CREATE TABLE IF NOT EXISTS `projects` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `created_by_id` int UNSIGNED NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` longtext COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL COMMENT '(DC2Type:datetime_immutable)',
  `updated_at` datetime NOT NULL COMMENT '(DC2Type:datetime_immutable)',
  PRIMARY KEY (`id`),
  KEY `IDX_5C93B3A4B03A8386` (`created_by_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `projects`
--

INSERT INTO `projects` (`id`, `created_by_id`, `name`, `description`, `created_at`, `updated_at`) VALUES
(2, 2, 'Angovo', 'Businesss plan Toliara', '2026-05-15 06:44:43', '2026-05-15 06:44:43');

-- --------------------------------------------------------

--
-- Structure de la table `staff_members`
--

DROP TABLE IF EXISTS `staff_members`;
CREATE TABLE IF NOT EXISTS `staff_members` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `company_id` int UNSIGNED NOT NULL,
  `role_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Poste',
  `monthly_salary` bigint NOT NULL DEFAULT '0',
  `headcount` smallint NOT NULL DEFAULT '1',
  `charges_rate` decimal(6,2) NOT NULL DEFAULT '13.00',
  `growth_rates` json NOT NULL,
  `sort_order` smallint NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL COMMENT '(DC2Type:datetime_immutable)',
  `updated_at` datetime NOT NULL COMMENT '(DC2Type:datetime_immutable)',
  PRIMARY KEY (`id`),
  KEY `IDX_1916C549979B1AD6` (`company_id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `staff_members`
--

INSERT INTO `staff_members` (`id`, `company_id`, `role_name`, `monthly_salary`, `headcount`, `charges_rate`, `growth_rates`, `sort_order`, `created_at`, `updated_at`) VALUES
(8, 5, 'Livreur', 50000, 2, 13.00, '[8, 6, 6, 6]', 1, '2026-05-15 06:53:55', '2026-08-19 06:46:26'),
(10, 9, 'Assistant', 200000, 1, 13.00, '[0, 0, 0, 0]', 1, '2026-05-19 12:32:34', '2026-08-19 08:10:09'),
(16, 17, 'Assistant', 200000, 1, 0.00, '[5, 5, 5, 5]', -1, '2026-08-20 13:44:51', '2026-08-20 13:47:25');

-- --------------------------------------------------------

--
-- Structure de la table `users`
--

DROP TABLE IF EXISTS `users`;
CREATE TABLE IF NOT EXISTS `users` (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `email` varchar(180) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `first_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL COMMENT '(DC2Type:datetime_immutable)',
  `last_login_at` datetime DEFAULT NULL COMMENT '(DC2Type:datetime_immutable)',
  `is_admin` tinyint(1) NOT NULL DEFAULT '0',
  `can_view` tinyint(1) NOT NULL DEFAULT '0',
  `can_edit` tinyint(1) NOT NULL DEFAULT '0',
  `role` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'standard',
  PRIMARY KEY (`id`),
  UNIQUE KEY `UNIQ_1483A5E9E7927C74` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `users`
--

INSERT INTO `users` (`id`, `email`, `password_hash`, `first_name`, `last_name`, `is_active`, `created_at`, `last_login_at`, `is_admin`, `can_view`, `can_edit`, `role`) VALUES
(1, 'admin@businessplan.mg', '$2y$13$f7DP.IV1seGSlfb0PrASFuPsFqhOJqGTT2ulWQV6gtIX8o.FIEnAO', 'Admin', 'BusinessPlan', 0, '2026-05-12 06:46:19', NULL, 1, 0, 0, 'manager'),
(2, 'miavakanilaina@aides-mada.com', '$2y$13$ZTd3tMDOEg8CiCzq9D397OznrZx7X.hbQOUffcQbgk74u6JxKm8SS', 'Miavaka', 'Nilaina', 0, '2026-05-13 05:53:18', NULL, 0, 0, 0, 'standard'),
(5, 'famenontsoaherimiavaka@gmail.com', '$2y$13$Uii7gRLACAUWeb5ZN3.UgeEylEmuwPbmDOQ7iiWQ6yXcH0R/vLDDW', 'Famenontsoa', 'ANDRIANILAINA', 0, '2026-06-03 11:51:52', NULL, 0, 1, 1, 'editor'),
(6, 'erick@gmail.com', '$2y$13$0svIQRRiHtiI6E4lvGUPbOm5B/1TKFh5CSRYqzRA/efYHkee6XTv2', 'Erick', 'Ratsaratera', 1, '2026-06-04 05:47:23', NULL, 1, 0, 0, 'admin'),
(7, 'herimanitra@yopmail.com', '$2y$13$m9BNXIOkschyXd9E3B6ZS.eNEJ3GBLKp7ghWoXhqytcZfADf7E3Aq', 'herimanitra', 'Rakoto', 1, '2026-06-30 03:31:11', NULL, 0, 0, 0, 'manager'),
(13, 'miavaka@yopmail.com', '$2y$13$Ikwivhh60SViq0Vc5G5TIOgDfTPBFQtRe1ZWyizIMqwv8mr45kgmm', 'Miavaka', 'Nilainaa', 1, '2026-06-30 03:43:24', NULL, 0, 0, 0, 'editor'),
(14, 'setra@yopmail.com', '$2y$13$RWe5FBYxbs3pqDRGFV5JaeGA2TDJ0AJsozjntDyKe9qRfCD0z5bQG', 'setra', 'tiana', 1, '2026-06-30 03:55:12', NULL, 0, 0, 0, 'standard');

--
-- Contraintes pour les tables déchargées
--

--
-- Contraintes pour la table `activity_logs`
--
ALTER TABLE `activity_logs`
  ADD CONSTRAINT `FK_F34B1DCE979B1AD6` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `FK_F34B1DCEA76ED395` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT;

--
-- Contraintes pour la table `additional_fundings`
--
ALTER TABLE `additional_fundings`
  ADD CONSTRAINT `FK_CEBC09ED979B1AD6` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `companies`
--
ALTER TABLE `companies`
  ADD CONSTRAINT `FK_8244AA3A166D1F9C` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `FK_8244AA3AB03A8386` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `FK_8244AA3AC69DE5E5` FOREIGN KEY (`validated_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `FK_8244AA3AF703974A` FOREIGN KEY (`last_modified_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Contraintes pour la table `company_settings`
--
ALTER TABLE `company_settings`
  ADD CONSTRAINT `FK_FDD2B5A8979B1AD6` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `company_snapshots`
--
ALTER TABLE `company_snapshots`
  ADD CONSTRAINT `FK_7E8ACCCD979B1AD6` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `expenses`
--
ALTER TABLE `expenses`
  ADD CONSTRAINT `FK_2496F35B979B1AD6` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `investments`
--
ALTER TABLE `investments`
  ADD CONSTRAINT `FK_74FD72E0979B1AD6` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `investment_terrains`
--
ALTER TABLE `investment_terrains`
  ADD CONSTRAINT `FK_investment_terrains_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `materials`
--
ALTER TABLE `materials`
  ADD CONSTRAINT `FK_9B1716B5979B1AD6` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `FK_B3BA5A5A979B1AD6` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `projects`
--
ALTER TABLE `projects`
  ADD CONSTRAINT `FK_5C93B3A4B03A8386` FOREIGN KEY (`created_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT;

--
-- Contraintes pour la table `staff_members`
--
ALTER TABLE `staff_members`
  ADD CONSTRAINT `FK_1916C549979B1AD6` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
