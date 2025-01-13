import { app, ipcMain } from 'electron/main'
import { existsSync, promises as fsPromises } from 'fs'
import { join } from 'path'
import git from 'isomorphic-git'

app.whenReady().then(() => {
  ipcMain.handle('gitInit', async (_ev, folder: string) => {
    // Get the path to the project folder stored in the user data directory
    const path = join(app.getPath('userData'), folder)

    // Check if the folder exists
    if (existsSync(path)) {
      // Initialize the git repository
      await git.init({ fs: fsPromises, dir: path })
    }
  })

  ipcMain.handle('gitCommit', async (_ev, folder, message: string) => {
    // Get the path to the project folder stored in the user data directory
    const dir = join(app.getPath('userData'), folder)

    // Check if the folder exists
    if (existsSync(dir)) {
      // Commit the changes
      await git.commit({
        fs: fsPromises,
        dir,
        message,
        author: { name: 'Dynamic Computer' }
      })
    }
  })

  ipcMain.handle('gitAdd', async (_ev, folder, name: string) => {
    // Get the path to the project folder stored in the user data directory
    const dir = join(app.getPath('userData'), folder)

    // Check if the folder & file exists
    if (existsSync(dir) && existsSync(join(dir, name))) {
      // Add the file to the staging area
      await git.add({ fs: fsPromises, dir, filepath: name })
    }
  })

  ipcMain.handle('gitRemove', async (_ev, folder, name: string) => {
    // Get the path to the project folder stored in the user data directory
    const dir = join(app.getPath('userData'), folder)

    // Check if the folder & file exists
    if (existsSync(dir) && existsSync(join(dir, name))) {
      // Remove the file from the staging area
      await git.remove({ fs: fsPromises, dir, filepath: name })
    }
  })

  ipcMain.handle('gitListFiles', async (_ev, folder) => {
    // Get the path to the project folder stored in the user data directory
    const dir = join(app.getPath('userData'), folder)

    // Check if the folder exists
    if (existsSync(dir)) {
      // List all the files in the repository
      return await git.listFiles({ fs: fsPromises, dir, ref: 'HEAD' })
    }
    return []
  })
})
