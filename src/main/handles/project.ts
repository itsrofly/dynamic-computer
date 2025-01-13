import { ChildProcess, spawn } from 'child_process'
import { app, ipcMain, webContents } from 'electron/main'
import { promises as fsPromises } from 'fs'
import { join } from 'path'

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
})
