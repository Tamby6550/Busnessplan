@echo off
title BusinessPlan AIDES — Installation des dépendances
echo.
echo  Installation des dépendances BusinessPlan AIDES...
echo  (Cette étape peut prendre 2-5 minutes)
echo.

SET APP_DIR=%~dp0
SET API_DIR=%APP_DIR%api
SET FRONT_DIR=%APP_DIR%front

:: ── Backend Symfony ───────────────────────────────────────────────────────────
echo  [1/4] Installation des dépendances PHP (Composer)...
cd /d "%API_DIR%"
composer install --no-dev --optimize-autoloader --no-interaction
if %ERRORLEVEL% neq 0 (
    echo  ERREUR : Composer a échoué. Vérifiez que PHP et Composer sont installés.
    pause
    exit /b 1
)

:: ── Générer la clé JWT ────────────────────────────────────────────────────────
echo  [2/4] Génération des clés JWT...
php bin/console lexik:jwt:generate-keypair --skip-if-exists --no-interaction

:: ── Base de données ───────────────────────────────────────────────────────────
echo  [3/4] Création de la base de données...
php bin/console doctrine:database:create --if-not-exists --no-interaction
php bin/console doctrine:migrations:migrate --no-interaction
if %ERRORLEVEL% neq 0 (
    echo  AVERTISSEMENT : Les migrations ont rencontré une erreur.
    echo  Vérifiez que MySQL/MariaDB est démarré.
)

:: ── Frontend React ────────────────────────────────────────────────────────────
echo  [4/4] Installation des dépendances JavaScript (npm)...
cd /d "%FRONT_DIR%"
npm install --prefer-offline
if %ERRORLEVEL% neq 0 (
    echo  ERREUR : npm install a échoué. Vérifiez que Node.js est installé.
    pause
    exit /b 1
)

echo.
echo  ✓ Installation terminée avec succès !
echo.
