import { app, ipcMain } from 'electron/main'
import { existsSync, promises as fsPromises } from 'fs'
import { join, parse } from 'path'

app.whenReady().then(() => {
  ipcMain.handle('writeFile', async (_ev, name: string, content = '') => {
    // Get the path to the user data directory
    const userDataPath = app.getPath('userData')
    // Create the full path to the file
    const filePath = join(userDataPath, name)
    // Parse the path to get the file basename
    const parsedPath = parse(filePath)

    // Ensure the directory exists, if not create it
    await fsPromises.mkdir(filePath.replace(parsedPath.base, ''), { recursive: true })

    fsPromises.writeFile(filePath, content, 'utf-8')
  })

  ipcMain.handle('deleteFile', async (_ev, name: string) => {
    // Get the path to the user data directory
    const userDataPath = app.getPath('userData')
    //  Create the full path to the file
    const filePath = join(userDataPath, name)

    // Check if the file exists
    if (existsSync(filePath)) {
      // Get the file stats
      const stats = await fsPromises.stat(filePath)
      if (stats.isDirectory()) {
        // Remove the directory and all its contents
        fsPromises.rm(filePath, { recursive: true, force: true })
      } else {
        // Remove the file
        fsPromises.unlink(filePath)
      }
    }
  })

  ipcMain.handle('readFile', async (_ev, name: string) => {
    // Get the path to the user data directory
    const userDataPath = app.getPath('userData')
    // Create the full path to the file
    const filePath = join(userDataPath, name)

    // Check if the file exists
    if (existsSync(filePath))
      // Read the file and return the content
      return await fsPromises.readFile(filePath, 'utf-8')
    return undefined
  })
})
