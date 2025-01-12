import { ChildProcess, spawn } from 'child_process'
import { app, ipcMain, webContents } from 'electron/main'
import { existsSync, promises as fsPromises } from 'fs'
import { join, parse } from 'path'
import { callback_server } from './oauthServer'
import git from 'isomorphic-git'

interface projectSettings {
  file: string
  messages: { role: 'user' | 'assistant'; content: string }[]
  commits: { date: string; message: string }[]
  dependencies: string[]
  log: { date: string; output: string }[]
}

interface Project {
  title: string
  path: string
  latestDate: string
  isRunning?: boolean
}

app.whenReady().then(() => {
  // Store the running processes
  const processRunning: { [path: string]: ChildProcess | null } = {}

  ipcMain.handle('writeFile', async (_ev, name: string, content = '') => {
    // Get the path to the user data directory
    const userDataPath = app.getPath('userData')
    // Create the full path to the file
    const filePath = join(userDataPath, name)
    // Parse the path to get the file basename
    const parsedPath = parse(filePath)

    // Ensure the directory exists
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

  ipcMain.handle('runProject', async (_ev, Projects: Project[], index: number) => {
    // Get the path to the user data directory
    const userDataPath = app.getPath('userData')
    // Get the project info
    const project = Projects[index]
    // Get the path to the project settings file
    const settingsPath = join(userDataPath, project.path, 'settings.json')
    // Read the project settings
    const projectData = JSON.parse(
      await fsPromises.readFile(settingsPath, 'utf-8')
    ) as projectSettings

    // Create the full path to the project file to run
    const filePath = join(userDataPath, project.path, projectData.file)

    // Kill the process if it's running
    processRunning[filePath]?.kill(), (processRunning[filePath] = null)

    // Start the process, detached so it doesn't close when the app closes
    processRunning[filePath] = spawn(join(userDataPath, 'python', 'bin', 'python'), [filePath], {
      detached: true
    })

    // Log the output
    processRunning[filePath].stdout?.on('data', async (data) => {
      console.log(data.toString())

      const projectData = JSON.parse(
        await fsPromises.readFile(settingsPath, 'utf-8')
      ) as projectSettings

      projectData.log.push({ date: new Date().toISOString(), output: data.toString() })
      fsPromises.writeFile(settingsPath, JSON.stringify(projectData), 'utf-8')
    })

    // Log the error
    processRunning[filePath].stderr?.on('data', async (data) => {
      console.log(data.toString())

      const projectData = JSON.parse(
        await fsPromises.readFile(settingsPath, 'utf-8')
      ) as projectSettings

      projectData.log.push({ date: new Date().toISOString(), output: data.toString() })
      fsPromises.writeFile(settingsPath, JSON.stringify(projectData), 'utf-8')
    })

    // Kill the process when it closes
    processRunning[filePath].on('close', (code) => {
      const webContent = webContents.getFocusedWebContents()

      webContent?.send('project:stopped', index, code)
      processRunning[filePath]?.kill(), (processRunning[filePath] = null)
    })
  })

  ipcMain.handle('stopProject', async (_ev, Projects: Project[], index: number) => {
    // Get the path to the user data directory
    const userDataPath = app.getPath('userData')
    // Get the project info
    const project = Projects[index]
    // Get the path to the project settings file
    const settingsPath = join(userDataPath, project.path, 'settings.json')
    // Read the project settings
    const projectData = JSON.parse(
      await fsPromises.readFile(settingsPath, 'utf-8')
    ) as projectSettings

    // Create the full path to the project file to stop
    const filePath = join(userDataPath, project.path, projectData.file)

    // Kill the process if it's running
    processRunning[filePath]?.kill(), (processRunning[filePath] = null)
  })

  ipcMain.handle('oauthServer', async () => {
    // Start the OAuth server
    return callback_server()
  })

  ipcMain.handle('gitInit', async (_ev, folder: string) => {
    const path = join(app.getPath('userData'), folder)

    if (existsSync(path)) await git.init({ fs: fsPromises, dir: path })
  })

  ipcMain.handle('gitCommit', async (_ev, folder, message: string) => {
    const dir = join(app.getPath('userData'), folder)

    if (existsSync(dir))
      await git.commit({
        fs: fsPromises,
        dir,
        message,
        author: { name: 'Dynamic Computer' }
      })
  })

  ipcMain.handle('gitAdd', async (_ev, folder, name: string) => {
    const dir = join(app.getPath('userData'), folder)

    if (existsSync(dir)) await git.add({ fs: fsPromises, dir, filepath: name })
  })

  ipcMain.handle('gitRemove', async (_ev, folder, name: string) => {
    const dir = join(app.getPath('userData'), folder)

    if (existsSync(dir)) await git.remove({ fs: fsPromises, dir, filepath: name })
  })

  ipcMain.handle('getAllCommits', async (_ev, folder) => {
    const dir = join(app.getPath('userData'), folder)

    if (existsSync(dir)) return await git.log({ fs: fsPromises, dir, depth: 5 })
    return []
  })

  // Undo latest commit &  Discard all changes files
})
