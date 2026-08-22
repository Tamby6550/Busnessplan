@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║          BusinessPlan AI — Installation complète         ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

:: ─── Vérifications préalables ─────────────────────────────────────────────────

echo [1/8] Vérification de PHP 8.2...
php -r "if(version_compare(PHP_VERSION,'8.2.0','<')){echo 'ERREUR';exit(1);}" 2>nul
if errorlevel 1 (
    echo   ERREUR : PHP 8.2+ est requis. Vérifiez que WampServer est démarré.
    pause & exit /b 1
)
for /f "tokens=*" %%v in ('php -r "echo PHP_VERSION;"') do echo   PHP %%v détecté ✓

echo.
echo [2/8] Vérification de Composer...
composer --version >nul 2>&1
if errorlevel 1 (
    echo   ERREUR : Composer introuvable. Installez-le depuis https://getcomposer.org
    pause & exit /b 1
)
echo   Composer détecté ✓

echo.
echo [3/8] Vérification de Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo   ERREUR : Node.js introuvable. Installez-le depuis https://nodejs.org
    pause & exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do echo   Node.js %%v détecté ✓

:: ─── Backend Symfony ──────────────────────────────────────────────────────────

echo.
echo ════════════════════════════════════════
echo  BACKEND SYMFONY
echo ════════════════════════════════════════

echo.
echo [4/8] Installation des dépendances Composer...
cd /d "%~dp0business-plan-api"
call composer install --no-interaction --optimize-autoloader
if errorlevel 1 (
    echo   ERREUR : composer install a échoué.
    pause & exit /b 1
)
echo   Dépendances installées ✓

:: Générer les clés JWT
echo.
echo [5/8] Génération des clés JWT...
if not exist "config\jwt" mkdir config\jwt

:: Vérification d'OpenSSL
openssl version >nul 2>&1
if errorlevel 1 (
    echo   AVERTISSEMENT : openssl introuvable dans PATH.
    echo   Ajoutez C:\wamp64\bin\php\php8.2.x à votre PATH ou installez OpenSSL.
    echo   Vous pouvez aussi lancer : php bin/console lexik:jwt:generate-keypair
    echo   depuis le dossier business-plan-api après avoir ajouté OpenSSL au PATH.
) else (
    :: Générer clé privée
    openssl genpkey -algorithm RSA -out config\jwt\private.pem -pkeyopt rsa_keygen_bits:4096 -pass pass:BusinessPlanAides2026 2>nul
    :: Extraire clé publique
    openssl pkey -in config\jwt\private.pem -out config\jwt\public.pem -pubout -passin pass:BusinessPlanAides2026 2>nul
    if exist "config\jwt\private.pem" (
        echo   Clés JWT générées ✓
    ) else (
        echo   AVERTISSEMENT : Clés JWT non générées. Lancez manuellement :
        echo   php bin/console lexik:jwt:generate-keypair
    )
)

:: Créer la base de données
echo.
echo [6/8] Création de la base de données MySQL...
echo   Assurez-vous que WampServer est démarré et MySQL accessible.
echo.
call php bin/console doctrine:database:create --if-not-exists --no-interaction
if errorlevel 1 (
    echo   ERREUR : Impossible de créer la base de données.
    echo   Vérifiez que WampServer est démarré et que le .env est correct.
    pause & exit /b 1
)
echo   Base de données créée ✓

:: Migrations
echo.
echo [7/8] Exécution des migrations Doctrine...
call php bin/console doctrine:migrations:migrate --no-interaction
if errorlevel 1 (
    echo   AVERTISSEMENT : Les migrations ont échoué. Tentative avec schema:update...
    call php bin/console doctrine:schema:update --force --no-interaction
)
echo   Schéma de base de données créé ✓

:: Créer un utilisateur administrateur par défaut
echo.
echo   Création de l'utilisateur administrateur...
call php bin/console app:create-admin-user --no-interaction 2>nul
if errorlevel 1 (
    echo   (Utilisateur admin à créer manuellement via l'API POST /api/users)
)

:: ─── Frontend React ───────────────────────────────────────────────────────────

echo.
echo ════════════════════════════════════════
echo  FRONTEND REACT
echo ════════════════════════════════════════

echo.
echo [8/8] Installation des dépendances NPM...
cd /d "%~dp0business-plan-front"
call npm install
if errorlevel 1 (
    echo   ERREUR : npm install a échoué.
    pause & exit /b 1
)
echo   Dépendances React installées ✓

:: ─── Résumé ───────────────────────────────────────────────────────────────────

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║              Installation terminée avec succès !         ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
echo  Pour démarrer l'application :
echo.
echo  1. Backend Symfony (dans un terminal) :
echo     cd business-plan-api
echo     php -S localhost:8000 -t public
echo.
echo  2. Frontend React (dans un autre terminal) :
echo     cd business-plan-front
echo     npm run dev
echo.
echo  3. Ouvrez votre navigateur sur : http://localhost:3000
echo.
echo  Identifiants par défaut :
echo     Email    : admin@businessplan.mg
echo     Password : Admin@2026
echo.
echo  API disponible sur    : http://localhost:8000/api
echo  phpMyAdmin            : http://localhost/phpmyadmin
echo.

cd /d "%~dp0"
pause
