import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Import embedded printer service
// @ts-ignore - JS file has dynamic exports
import { EmbeddedPrinterService } from './main-printer-service.js'

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null
let tray: Tray | null = null
let printerService: EmbeddedPrinterService | null = null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC!, 'icons', 'icon-256x256.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Allow connections to local network IPs
    },
  })

  // Start fullscreen
  win.setFullScreen(true)

  // Minimize to tray behavior on close/minimize (Windows)
  win.on('minimize', (event: Electron.Event) => {
    event.preventDefault()
    win?.hide()
  })
  win.on('close', (event: Electron.Event) => {
    if (process.platform === 'win32') {
      event.preventDefault()
      win?.hide()
    }
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    // Stop printer service before quitting
    if (printerService) {
      await printerService.stop()
    }
    app.quit()
    win = null
  }
})

// Cleanup on before-quit
app.on('before-quit', async () => {
  if (printerService) {
    await printerService.stop()
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(async () => {
  // Disable web security for local network connections
  app.commandLine.appendSwitch('disable-web-security')
  app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor')
  
  // Start embedded printer service
  printerService = new EmbeddedPrinterService(8105)
  try {
    await printerService.start()
    console.log('Embedded printer service started successfully')
  } catch (error) {
    console.error('Failed to start embedded printer service:', error)
  }
  
  createWindow()

  // Create tray icon
  const iconPath = path.join(process.env.VITE_PUBLIC!, 'icons', 'icon-256x256.png')
  const trayIcon = nativeImage.createFromPath(iconPath)
  tray = new Tray(trayIcon)
  tray.setToolTip('Wasla Choice')
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Afficher', click: () => { win?.show(); win?.focus(); } },
    { label: 'Quitter', click: () => { tray?.destroy(); app.quit(); } }
  ])
  tray.setContextMenu(contextMenu)
  tray.on('click', () => {
    win?.show()
    win?.focus()
  })

  // Auto-launch on Windows
  if (process.platform === 'win32') {
    // Check if already set
    const isAlreadySet = app.getLoginItemSettings().openAtLogin
    
    if (!isAlreadySet) {
      // First run: enable auto-start
      app.setLoginItemSettings({
        openAtLogin: true,
        path: process.execPath,
        args: [],
        name: 'Wasla Management'
      })
      console.log('✅ Auto-start enabled for Wasla Management')
    } else {
      console.log('✅ Auto-start already enabled')
    }
  }

  // Auto-update: Enhanced with better error handling and UI communication
  setupAutoUpdater()
})

function setupAutoUpdater() {
  // Register IPC handler for app version (works in dev and prod)
  ipcMain.handle('get-app-version', () => {
    return app.getVersion()
  })

  // Only enable auto-updater in production (not in dev mode)
  if (VITE_DEV_SERVER_URL) {
    console.log('Auto-updater disabled in development mode')
    
    // Register stub handlers for dev mode
    ipcMain.handle('check-for-updates', async () => {
      return { success: false, error: 'Auto-update non disponible en mode développement' }
    })
    
    ipcMain.handle('download-update', async () => {
      return { success: false, error: 'Auto-update non disponible en mode développement' }
    })
    
    ipcMain.handle('install-update', async () => {
      return { success: false, error: 'Auto-update non disponible en mode développement' }
    })
    
    return
  }

  try {
    // Configure auto-updater for automatic updates
    autoUpdater.autoDownload = true // Automatically download updates
    autoUpdater.autoInstallOnAppQuit = true // Auto-install on quit if update is ready
    
    // Set update check interval (check every 4 hours)
    setInterval(() => {
      autoUpdater.checkForUpdates().catch(err => {
        console.error('Error checking for updates:', err)
      })
    }, 4 * 60 * 60 * 1000) // 4 hours

    // Check for updates on startup (with delay to not block app startup)
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(err => {
        console.error('Error checking for updates on startup:', err)
      })
    }, 2000) // Wait 2 seconds after app start

    // Update available - automatically downloading
    autoUpdater.on('update-available', (info) => {
      console.log('Update available:', info.version)
      console.log('Downloading update automatically...')
      win?.webContents.send('update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes
      })
    })

    // Update not available
    autoUpdater.on('update-not-available', (info) => {
      console.log('No update available. Current version:', info.version)
      win?.webContents.send('update-not-available', {
        version: info.version
      })
    })

    // Update error
    autoUpdater.on('error', (err: Error) => {
      console.error('AutoUpdater error:', err)
      win?.webContents.send('update-error', {
        message: err.message
      })
    })

    // Download progress
    autoUpdater.on('download-progress', (progress) => {
      console.log(`Download progress: ${Math.round(progress.percent)}%`)
      win?.webContents.send('update-download-progress', {
        percent: Math.round(progress.percent),
        transferred: progress.transferred,
        total: progress.total
      })
    })

    // Update downloaded - automatically install without user prompt
    autoUpdater.on('update-downloaded', async (info) => {
      console.log('Update downloaded:', info.version)
      console.log('Installing update automatically...')
      win?.webContents.send('update-downloaded', {
        version: info.version
      })
      
      // Automatically quit and install without asking user
      // Delay a bit to ensure UI is updated
      setTimeout(() => {
        autoUpdater.quitAndInstall(false, true) // isSilent=false, isForceRunAfter=true
      }, 2000)
    })

    // IPC handlers for app version check
    ipcMain.handle('check-for-updates', async () => {
      try {
        const result = await autoUpdater.checkForUpdates()
        return { success: true, updateInfo: result?.updateInfo }
      } catch (error) {
        const err = error as Error
        return { success: false, error: err.message }
      }
    })

    ipcMain.handle('download-update', async () => {
      try {
        autoUpdater.downloadUpdate()
        return { success: true }
      } catch (error) {
        const err = error as Error
        return { success: false, error: err.message }
      }
    })

    ipcMain.handle('install-update', async () => {
      try {
        autoUpdater.quitAndInstall(false, true)
        return { success: true }
      } catch (error) {
        const err = error as Error
        return { success: false, error: err.message }
      }
    })

  } catch (e) {
    console.error('Failed to init autoUpdater', e)
  }
}
