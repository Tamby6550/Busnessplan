const { app, BrowserWindow, shell } = require('electron')
const path = require('path')

const APP_URL = 'https://businessplan.aides-mada.com'

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(__dirname, 'icon.ico'),
    title: 'BusinessPlan AIDES',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // Masquer la barre de menu
  win.setMenuBarVisibility(false)

  // Charger l'application web hébergée sur LWS
  win.loadURL(APP_URL)

  // Ouvrir les liens externes dans le navigateur système
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(APP_URL)) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })

  // Afficher la fenêtre une fois la page chargée (évite le flash blanc)
  win.once('ready-to-show', () => win.show())
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
