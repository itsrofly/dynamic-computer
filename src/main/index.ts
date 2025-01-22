// Electron
import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

// Scripts
import callback_server from './scripts/callback'
import pythonInstaller from './dependencies/python'

// Handles
import './handles/projects'

// Assets
import icon from '../../resources/icon.png?asset'
import splashScreen from '../../resources/splashscreen.html?asset'

// Others
import EventEmitter from 'events'
import { join } from 'path'
import { isPythonInstalled } from './dependencies/python'

// Create the event emitter for loading events
export const loadingEvents = new EventEmitter()

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      devTools: !app.isPackaged
    }
  })

  const loadinWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    show: false,
    resizable: false,
    webPreferences: {
      preload:  join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      devTools: !app.isPackaged
    }
  })

  // Load the splash screen
  loadinWindow.loadFile(splashScreen)

  loadinWindow.on('ready-to-show', async () => {
    // Here we are going to manage the dependencies
    // For now the only dependency is python

    // Check if python is installed
    const hasPython = await isPythonInstalled()
    if (!hasPython) {
      // Show the loading window
      loadinWindow.show()
      // Install python
      pythonInstaller()
    } else {
      loadingEvents.emit('dependencies:installed')
    }
  })

  loadingEvents.on('dependencies:installed', () => {
    // Close the loading window
    loadinWindow.close()

    // Load the main window
    mainWindow.on('ready-to-show', async () => {
      mainWindow.show()
    })

    mainWindow.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url)
      return { action: 'deny' }
    })

    // HMR for renderer base on electron-vite cli.
    // Load the remote URL for development or the local html file for production.
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('dynamic.computer')

  // Handle OAuth server requests
  ipcMain.handle('callback:server', async () => {
    // Start the OAuth server
    return callback_server()
  })

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
