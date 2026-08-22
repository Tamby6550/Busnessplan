; ─── BusinessPlan AIDES — Script Inno Setup ──────────────────────────────────
; Généré pour Inno Setup 6.x
; Placez ce fichier dans : BusinessPlanAI\installer\
; Avant de compiler, vérifiez que les chemins SOURCE pointent bien vers vos dossiers.

#define MyAppName      "BusinessPlan AIDES"
#define MyAppVersion   "1.0.0"
#define MyAppPublisher "AIDES Madagascar"
#define MyAppURL       "https://aides-mada.com"
#define MyAppExe       "lancer.bat"
#define RootSrc        "..\BusinessPlan"

[Setup]
AppId={{A3F2B1C4-9E7D-4A5B-8C6F-2D1E3A4B5C6D}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\BusinessPlanAIDES
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
LicenseFile=
OutputDir=output
OutputBaseFilename=BusinessPlanAIDES_Setup_v{#MyAppVersion}
SetupIconFile=icon.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
WizardImageFile=wizard-banner.bmp
PrivilegesRequired=admin
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64

; Minimum Windows 10
MinVersion=10.0

[Languages]
Name: "french"; MessagesFile: "compiler:Languages\French.isl"

[Tasks]
Name: "desktopicon";     Description: "Créer une icône sur le Bureau";       GroupDescription: "Icônes supplémentaires :"
Name: "quicklaunchicon"; Description: "Créer une icône dans la barre des tâches"; GroupDescription: "Icônes supplémentaires :"; Flags: unchecked
Name: "autostart";       Description: "Démarrer automatiquement au lancement de Windows"; GroupDescription: "Options :"; Flags: unchecked

[Dirs]
Name: "{app}\data";      Permissions: everyone-full
Name: "{app}\logs";      Permissions: everyone-full
Name: "{app}\temp";      Permissions: everyone-full

[Files]
; ── Application principale ────────────────────────────────────────────────────
Source: "{#RootSrc}\business-plan-api\*";   DestDir: "{app}\api";   Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "*.log,var\cache\*,var\log\*,.git\*,node_modules\*"
Source: "{#RootSrc}\business-plan-front\*"; DestDir: "{app}\front"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "*.log,.git\*,dist\*"

; ── Scripts de démarrage ──────────────────────────────────────────────────────
Source: "scripts\lancer.bat";     DestDir: "{app}"; Flags: ignoreversion
Source: "scripts\arreter.bat";    DestDir: "{app}"; Flags: ignoreversion
Source: "scripts\installer.bat";  DestDir: "{app}"; Flags: ignoreversion

; ── Icône de l'application ────────────────────────────────────────────────────
Source: "icon.ico"; DestDir: "{app}"; Flags: ignoreversion

; NOTE : PHP et Node.js portables à ajouter ici si vous les incluez dans l'installeur
; Source: "tools\php\*";  DestDir: "{app}\tools\php";  Flags: ignoreversion recursesubdirs createallsubdirs
; Source: "tools\node\*"; DestDir: "{app}\tools\node"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}";         Filename: "{app}\lancer.bat"; IconFilename: "{app}\icon.ico"; Comment: "Lancer BusinessPlan AIDES"
Name: "{group}\Arrêter le serveur";   Filename: "{app}\arreter.bat"; Comment: "Arrêter le serveur local"
Name: "{group}\Désinstaller";         Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}";   Filename: "{app}\lancer.bat"; IconFilename: "{app}\icon.ico"; Tasks: desktopicon
Name: "{userappdata}\Microsoft\Internet Explorer\Quick Launch\{#MyAppName}"; Filename: "{app}\lancer.bat"; Tasks: quicklaunchicon

[Registry]
; Autostart optionnel
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "BusinessPlanAIDES"; ValueData: """{app}\lancer.bat"""; Flags: uninsdeletevalue; Tasks: autostart

[Run]
; Exécuter l'installation des dépendances après la copie des fichiers
Filename: "{app}\installer.bat"; Description: "Installer les dépendances (npm + composer)"; Flags: runhidden waituntilterminated; StatusMsg: "Installation des dépendances en cours..."

; Ouvrir l'application après installation
Filename: "{app}\lancer.bat"; Description: "Lancer {#MyAppName} maintenant"; Flags: nowait postinstall skipifsilent; StatusMsg: "Démarrage de l'application..."

[UninstallRun]
Filename: "{app}\arreter.bat"; Flags: runhidden waituntilterminated

[Code]
// Vérification des prérequis avant installation
function InitializeSetup(): Boolean;
var
  ErrorCode: Integer;
begin
  Result := True;

  // Vérifier si PHP est installé
  if not FileExists('C:\php\php.exe') and not FileExists('C:\xampp\php\php.exe') then begin
    if MsgBox('PHP 8.2 n''est pas détecté sur votre système.' + #13#10 +
              'L''installation peut continuer mais vous devrez installer PHP manuellement.' + #13#10 + #13#10 +
              'Voulez-vous continuer quand même ?',
              mbConfirmation, MB_YESNO) = IDNO then
      Result := False;
  end;
end;
