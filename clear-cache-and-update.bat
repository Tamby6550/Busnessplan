@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║     BusinessPlan AIDES — Cache + Schema Update       ║
echo ╚══════════════════════════════════════════════════════╝
echo.

cd /d "C:\Logiciel Miavaka\BusinessPlanAI\BusinessPlan\business-plan-api"

echo [1/3] Effacement du cache Symfony...
php bin/console cache:clear --no-warmup
if errorlevel 1 (
    echo   ERREUR lors du cache:clear
    pause & exit /b 1
)
echo   Cache effacé ✓
echo.

echo [2/3] Mise à jour du schéma de base de données...
echo   (création de la table invitation_tokens si absente)
php bin/console doctrine:schema:update --force --no-interaction
if errorlevel 1 (
    echo   ATTENTION : schema:update a retourné une erreur.
    echo   Essayez d'exécuter manuellement migration_invitation_tokens.sql dans phpMyAdmin.
) else (
    echo   Schéma mis à jour ✓
)
echo.

echo [3/3] Réchauffement du cache...
php bin/console cache:warmup
echo   Cache prêt ✓
echo.

echo ══════════════════════════════════════════════════════
echo   Tout est prêt ! Rechargez l'application dans le
echo   navigateur (F5).
echo ══════════════════════════════════════════════════════
echo.
pause
