// Electron
import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

// Scripts
import pythonInstaller from './scripts/python'
import callback_server from './scripts/callback'

// Handles
import './handles/projects'

// Assets
import icon from '../../resources/icon.png?asset'
import htmlFile from '../../resources/splashscreen.html?asset'

// Others
import EventEmitter from 'events'
import { join } from 'path'

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
      sandbox: true,
      nodeIntegration: false,
      contextIsolation: true,
      devTools: !app.isPackaged
    }
  })

  loadingEvents.on('python:installing', () => {
    // Hide the main window but not close it
    mainWindow.hide()

    // Load the loading window and show with focus
    loadinWindow.loadFile(htmlFile), loadinWindow.show(), loadinWindow.focus()
  })

  loadingEvents.on('python:installed', () => {
    // Hide the loading window and close it
    loadinWindow.hide(), loadinWindow.close()

    // Show the main window and move it to the top
    mainWindow.show(), mainWindow.moveTop()
  })

  loadingEvents.on('python:failed', () => {
    // Show error if failed to install python
    dialog.showErrorBox('Error 1001', 'Failed to install dependencies.\nPlease check your internet connection and try again.')
  })

  mainWindow.on('ready-to-show', () => {
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
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Install Python if not already installed
  pythonInstaller({
    appOutDir: join(app.getPath('userData')),
    electronPlatformName: process.platform,
    arch: process.arch
  })

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
