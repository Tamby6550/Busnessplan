@echo off
title BusinessPlan AIDES — Arrêt
echo.
echo  Arrêt des serveurs BusinessPlan AIDES...
echo.

:: Fermer les fenêtres des serveurs par titre
taskkill /FI "WINDOWTITLE eq API BusinessPlan*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Front BusinessPlan*" /F >nul 2>&1

:: Tuer les processus PHP et Node sur les ports utilisés
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000"') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000"') do taskkill /PID %%a /F >nul 2>&1

echo  ✓ Serveurs arrêtés.
timeout /t 2 /nobreak >nul
