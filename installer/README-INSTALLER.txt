════════════════════════════════════════════════════════════
  BusinessPlan AIDES — Guide de création de l'installeur
════════════════════════════════════════════════════════════

PRÉREQUIS SUR VOTRE PC DE DÉVELOPPEMENT
────────────────────────────────────────
1. Inno Setup 6.x  → https://jrsoftware.org/isinfo.php
2. Une icône icon.ico (format 256x256) à placer dans installer/

STRUCTURE DES FICHIERS ATTENDUE
────────────────────────────────
installer/
  BusinessPlanAI.iss     ← script Inno Setup (déjà créé)
  icon.ico               ← icône de l'application (à ajouter)
  wizard-banner.bmp      ← image optionnelle 497x314px (à ajouter)
  scripts/
    lancer.bat           ← déjà créé
    arreter.bat          ← déjà créé
    installer.bat        ← déjà créé
  output/                ← dossier créé automatiquement par Inno Setup

ÉTAPES POUR CRÉER LE .EXE
───────────────────────────
1. Ouvrez Inno Setup
2. Fichier → Ouvrir → sélectionnez BusinessPlanAI.iss
3. Cliquez sur le bouton "Compiler" (F9)
4. Le fichier généré sera dans : installer/output/BusinessPlanAIDES_Setup_v1.0.0.exe

PRÉREQUIS SUR LE PC DE L'UTILISATEUR FINAL
────────────────────────────────────────────
L'utilisateur doit avoir installé :
  • PHP 8.2 (https://windows.php.net/download/)
  • Composer (https://getcomposer.org/download/)
  • Node.js 20+ LTS (https://nodejs.org/)
  • MySQL ou XAMPP (https://www.apachefriends.org/)

MISE EN LIGNE SUR LWS
──────────────────────
1. Après compilation, uploadez le .exe dans :
   /htdocs/downloads/BusinessPlanAIDES_Setup_v1.0.0.exe

2. Lien de téléchargement public :
   https://aides-mada.com/downloads/BusinessPlanAIDES_Setup_v1.0.0.exe

3. Protégez le dossier downloads/ si nécessaire avec un .htaccess :
   AuthType Basic
   AuthName "Téléchargement réservé"
   AuthUserFile /htdocs/.htpasswd
   Require valid-user
════════════════════════════════════════════════════════════
