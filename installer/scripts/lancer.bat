@echo off
title BusinessPlan AIDES — Démarrage
color 0A
echo.
echo  ██████╗ ██╗   ██╗███████╗██╗███╗   ██╗███████╗███████╗███████╗
echo  ██╔══██╗██║   ██║██╔════╝██║████╗  ██║██╔════╝██╔════╝██╔════╝
echo  ██████╔╝██║   ██║███████╗██║██╔██╗ ██║█████╗  ███████╗███████╗
echo  ██╔══██╗██║   ██║╚════██║██║██║╚██╗██║██╔══╝  ╚════██║╚════██║
echo  ██████╔╝╚██████╔╝███████║██║██║ ╚████║███████╗███████║███████║
echo  ╚═════╝  ╚═════╝ ╚══════╝╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝╚══════╝
echo.
echo  BusinessPlan AIDES — Version 1.0.0
echo  AIDES Madagascar
echo  ════════════════════════════════════
echo.

SET APP_DIR=%~dp0
SET API_DIR=%APP_DIR%api
SET FRONT_DIR=%APP_DIR%front

:: ── Démarrer Symfony (API backend) ───────────────────────────────────────────
echo  [1/2] Démarrage du serveur API (port 8000)...
start "API BusinessPlan" cmd /k "cd /d %API_DIR% && php -S localhost:8000 -t public"

:: Attendre que l'API soit prête
timeout /t 3 /nobreak >nul

:: ── Démarrer le frontend React (dev) ─────────────────────────────────────────
echo  [2/2] Démarrage du frontend (port 3000)...
start "Front BusinessPlan" cmd /k "cd /d %FRONT_DIR% && npm run dev"

:: Attendre que Vite soit prêt
timeout /t 5 /nobreak >nul

:: ── Ouvrir dans le navigateur ─────────────────────────────────────────────────
echo.
echo  ✓ Application démarrée !
echo  ✓ Ouvrez votre navigateur à : http://localhost:3000
echo.
start "" "http://localhost:3000"

echo  Appuyez sur une touche pour fermer cette fenêtre...
echo  (Les serveurs continuent de tourner en arrière-plan)
pause >nul
