import { ChildProcess, spawn } from 'child_process'
import { app, ipcMain, webContents } from 'electron/main'
import { promises as fsPromises } from 'fs'
import { join } from 'path'
import { readFile, writeFile, gitInit, gitAdd, gitCommit } from '../scripts/helpers'

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

  // Initial Messages
  const messages = [
    "Hi! What's up?",
    "Hey, what's on your mind?",
    'Hi! How can I help you today?',
    'Hello! What can I do for you today?',
    'Hey! How can I assist you today?'
  ]

  ipcMain.handle('projects:create', async () => {
    // Date - When the project was created
    const today = new Date()
    const formattedDate = today.toISOString().split('T')[0]

    // Create unique folder
    const projectFolder = join('Projects', String(Date.now() + Math.random()))

    // Projects config file
    const projects = JSON.parse((await readFile('projects.json')) || '[]') as Project[]

    // Project settings
    const settings: projectSettings = {
      file: 'main.py', // The file that the project will run
      messages: [
        {
          role: 'assistant', // Create initial message
          content: messages[Math.floor(Math.random() * messages.length)]
        }
      ],
      commits: [{ date: formattedDate, message: 'Create Project' }],
      dependencies: [],
      log: []
    }

    // Create gitignore file
    await writeFile(
      join(projectFolder, '.gitignore'),
      'settings.json\n__pycache__\n*.pyc\n*.pyo\n*.pyd\n*.pyw\n*.pyz\n*.pywz\n*.pyzw'
    )

    // Create main.py file
    await writeFile(join(projectFolder, settings.file))

    // Create settings.json file
    await writeFile(join(projectFolder, 'settings.json'), JSON.stringify(settings))

    // Initialize git
    await gitInit(projectFolder)
    await gitAdd(projectFolder, '.')
    await gitCommit(projectFolder, 'Project Created')

    // Project information
    const project: Project = {
      title: 'New Project',
      path: projectFolder,
      latestDate: formattedDate
    }

    // Add project to the projects config file
    projects.push(project) // First append the new project to the projects array
    await writeFile('projects.json', JSON.stringify(projects))

    const webContent = webContents.getFocusedWebContents()

    // Send the update to the renderer process
    webContent?.send('projects:update')
  })

  ipcMain.handle('projects:run', async (_ev, project: Project, index: number) => {
    // Get the path to the user data directory
    const userDataPath = app.getPath('userData')

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

      webContent?.send('projects:stopped', index, code)
      processRunning[filePath]?.kill(), (processRunning[filePath] = null)
    })
  })

  ipcMain.handle('projects:stop', async (_ev, project: Project, index: number) => {
    // Get the path to the user data directory
    const userDataPath = app.getPath('userData')

    // Get the web content
    const webContent = webContents.getFocusedWebContents()

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

    // Send signal to the renderer process that the project has stopped
    webContent?.send('projects:stopped', index, 0)
  })

  ipcMain.handle('projects:all', async () => {
    const projects = JSON.parse((await readFile('projects.json')) || '[]') as Project[]
    return projects
  })
})
