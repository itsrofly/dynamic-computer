import { ChildProcess, spawn } from 'child_process'
import { app, ipcMain, webContents } from 'electron/main'
import { join } from 'path'

import {
  readFile,
  writeFile,
  gitInit,
  gitAdd,
  gitCommit,
  deleteFile,
  supabase
} from '../scripts/helpers'

/**
 * Project Handles
 * Use only index to know the context project, we should not trust values from the renderer process!
 */

interface Chat {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ProjectSettings {
  file: string
  messages: Chat[]
  commits: { date: string; message: string }[]
  dependencies: string
  log: { date: string; output: string }[]
}

interface Project {
  title: string
  path: string // Projects/{random folder name}
  latestDate: string
}

interface ToolCallEditFile {
  file_content: string
  commit_message: string
  pip_requirements: string
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

  const defaultFile = `import tkinter as tk
# Always change the title of the application to one more related to what the user wants.
appTitle = 'Hello World!'
# Create the main window
root = tk.Tk()
root.title(appTitle)
# Create a label with the message
label = tk.Label(root, text='Hello World!')
label.pack(pady=20)
# Start the application
root.mainloop()`

  ipcMain.handle('projects:create', async () => {
    try {
      // Get the focused web content
      const webContent = webContents.getFocusedWebContents()
      // Date - When the project was created
      const today = new Date()
      const formattedDate = today.toISOString().split('T')[0]

      // Create unique folder
      const projectFolder = join('Projects', String(Date.now() + Math.random()))

      // Projects config file
      const projects = JSON.parse((await readFile('projects.json')) || '[]') as Project[]

      // Project settings
      const settings: ProjectSettings = {
        file: 'main.py', // The file that the project will run
        messages: [
          {
            role: 'assistant', // Create initial message
            content: messages[Math.floor(Math.random() * messages.length)]
          }
        ],
        commits: [{ date: formattedDate, message: 'Create Project' }],
        dependencies: '',
        log: []
      }

      // Create gitignore file
      await writeFile(
        join(projectFolder, '.gitignore'),
        'settings.json\n__pycache__\n*.pyc\n*.pyo\n*.pyd\n*.pyw\n*.pyz\n*.pywz\n*.pyzw'
      )

      // Create main.py file
      await writeFile(join(projectFolder, settings.file), defaultFile)

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

      // Add project to the projects config file, in the first element
      projects.unshift(project)
      await writeFile('projects.json', JSON.stringify(projects))

      // Send the update to the renderer process
      webContent?.send('projects:update')
    } catch (error) {
      console.log(error)
    }
  })

  ipcMain.handle('projects:delete', async (_ev, index: number) => {
    try {
      // Get the focused web content
      const webContent = webContents.getFocusedWebContents()

      // Get projects in config file
      const projects = JSON.parse((await readFile('projects.json')) || '[]') as Project[]

      // Try get the project with index
      const project = projects[index]

      // Delete the project folder and files
      await deleteFile(project.path)

      // Remove the project from the projects array
      projects.splice(index, 1)

      // Update the projects.json file
      await writeFile('projects.json', JSON.stringify(projects))

      // Send the update to the renderer process
      webContent?.send('projects:update')
    } catch (error) {
      console.log(error)
    }
  })

  ipcMain.handle('projects:start', async (_ev, index: number) => {
    try {
      // Get the path to the user data directory
      const userDataPath = app.getPath('userData')

      // Get projects in config file
      const projects = JSON.parse((await readFile('projects.json')) || '[]') as Project[]

      // Try get the project with index
      const project = projects[index]

      // Get the path to the project settings file
      const settingsPath = join(project.path, 'settings.json')

      // Read the project settings
      const projectData = JSON.parse((await readFile(settingsPath)) || '{}') as ProjectSettings

      // Create the full path to the project file to run
      const filePath = join(userDataPath, project.path, projectData.file)

      // Kill the process if it's running
      processRunning[filePath]?.kill(), (processRunning[filePath] = null)

      // Start the process, detached so it doesn't close when the app closes, here you should use full paths
      processRunning[filePath] = spawn(join(userDataPath, 'python', 'bin', 'python'), [filePath], {
        detached: true
      })

      // Log the output
      processRunning[filePath].stdout?.on('data', async (data) => {
        console.log(data.toString())
        const projectData = JSON.parse((await readFile(settingsPath)) || '{}') as ProjectSettings

        if (projectData) {
          // Don't let the string escape and brake the JSON
          projectData.log.push({ date: new Date().toISOString(), output: JSON.stringify(data) })
          await writeFile(settingsPath, JSON.stringify(projectData))
        }
      })

      // Log the error
      processRunning[filePath].stderr?.on('data', async (data) => {
        console.log(data.toString())

        const projectData = JSON.parse((await readFile(settingsPath)) || '{}') as ProjectSettings

        if (projectData) {
          projectData.log.push({ date: new Date().toISOString(), output: JSON.stringify(data) })
          await writeFile(settingsPath, JSON.stringify(projectData))
        }
      })

      // Kill the process when it closes
      processRunning[filePath].on('close', (code) => {
        const webContent = webContents.getFocusedWebContents()

        webContent?.send('projects:stopped', index, code)
        processRunning[filePath]?.kill(), (processRunning[filePath] = null)
      })
    } catch (error) {
      console.log(error)
    }
  })

  ipcMain.handle('projects:stop', async (_ev, index: number) => {
    try {
      // Get projects in config file
      const projects = JSON.parse((await readFile('projects.json')) || '[]') as Project[]

      // Try get the project with index
      const project = projects[index]

      // Get the path to the project settings file
      const settingsPath = join(project.path, 'settings.json')

      // Read the project settings
      const projectData = JSON.parse((await readFile(settingsPath)) || '{}') as ProjectSettings

      // Get the path to the user data directory
      const userDataPath = app.getPath('userData')

      // Get the web content
      const webContent = webContents.getFocusedWebContents()

      // Create the full path to the project file to stop
      const filePath = join(userDataPath, project.path, projectData.file)

      // Kill the process if it's running
      processRunning[filePath]?.kill(), (processRunning[filePath] = null)

      // Send signal to the renderer process that the project has stopped
      webContent?.send('projects:stopped', index, 0)
    } catch (error) {
      console.log(error)
    }
  })

  ipcMain.handle('projects:rename', async (_ev, index: number, title: string) => {
    try {
      // Get the focused web content
      const webContent = webContents.getFocusedWebContents()

      // Get projects in config file
      const projects = JSON.parse((await readFile('projects.json')) || '[]') as Project[]

      // Try get the project with index
      const project = projects[index]

      // Change the project title
      project.title = title

      // Update the projects.json file
      await writeFile('projects.json', JSON.stringify(projects))

      // Send the update to the renderer process
      webContent?.send('projects:update')
    } catch (error) {
      console.log(error)
    }
  })

  ipcMain.handle('projects:all', async () => {
    try {
      // Return the projects in the config file
      const projects = JSON.parse((await readFile('projects.json')) || '[]') as Project[]
      return projects
    } catch (error) {
      console.log(error)
    }
    return []
  })

  ipcMain.handle('projects:settings', async (_ev, index: number) => {
    try {
      // Get projects in config file
      const projects = JSON.parse((await readFile('projects.json')) || '[]') as Project[]

      // Try get the project with index
      const project = projects[index]

      // Get the path to the project settings file
      const settingsPath = join(project.path, 'settings.json')

      // Read the project settings
      const projectData = JSON.parse((await readFile(settingsPath)) || '{}') as ProjectSettings

      return projectData
    } catch (error) {
      console.log(error)
    }
    return null
  })

  ipcMain.handle(
    'projects:send',
    async (_ev, index: number, content: string, access_token: string) => {
      try {
        // Get projects in config file
        const projects = JSON.parse((await readFile('projects.json')) || '[]') as Project[]

        // Try get the project with index
        const project = projects[index]

        // Get the path to the project settings file
        const settingsPath = join(project.path, 'settings.json')

        // Read the project settings
        const projectData = JSON.parse((await readFile(settingsPath)) || '{}') as ProjectSettings

        // Add the new message
        projectData.messages.push({ role: 'user', content })

        // Copy of messages
        const messages = [...projectData.messages]

        // Read my file
        const fileContent = await readFile(join(project.path, projectData.file))

        // Add context of the main file
        messages.push({
          role: 'system',
          content: `(App) Source Code='${fileContent}'`
        })

        // Send the message to the assistant
        // Payload to send to the assistant API
        const payload = {
          access_token: access_token,
          messages,
          app_version: '1.0.0'
        }

        const response = await supabase.functions.invoke('assistant-api', {
          body: payload
        })

        // Add the assistant response if error
        if (response.error) {
          if (response.error.context && response.error.context.status) {
            switch (response.error.context.status) {
              case 401:
                projectData.messages.push({
                  role: 'assistant',
                  content: `Something went wrong, please make sure you're logged in!`
                })
                break
              case 402:
                projectData.messages.push({
                  role: 'assistant',
                  content: `Something went wrong, please make sure you have a valid subscription!`
                })
                break
              default:
                projectData.messages.push({
                  role: 'assistant',
                  content: `Something went wrong, please try again later!`
                })
                break
            }
          } else {
            projectData.messages.push({
              role: 'assistant',
              content: `Something went wrong, please try again later!`
            })
          }
        }

        // Get response data
        const data = response.data
        if (data && data[0]) {
          const choice = data[0]
          // Get the message from the assistant
          const message = choice.message

          if (message.content)
            projectData.messages.push({ role: 'assistant', content: message.content })
          if (message.tool_calls) {
            message.tool_calls.forEach(
              async (tool_call: { function: { name: string; arguments: string } }) => {
                if (tool_call.function.name !== 'edit_main_file') {
                  projectData.messages.push({
                    role: 'assistant',
                    content: 'Unrecognized Operation!'
                  })
                } else {
                  // Get the arguments
                  const args: ToolCallEditFile = JSON.parse(tool_call.function.arguments)

                  // Update the file content
                  await writeFile(join(project.path, projectData.file), args.file_content)

                  // Update the dependencies
                  projectData.dependencies = args.pip_requirements

                  // Update the commits
                  projectData.commits.push({
                    date: new Date().toISOString(),
                    message: args.commit_message
                  })

                  // Commit the changes
                  await gitCommit(project.path, args.commit_message)

                  // Install the dependencies
                  try {
                    const runner = spawn(join(app.getPath('userData'), 'python', 'bin', 'pip'), [
                      'install',
                      args.pip_requirements
                    ])

                    // Log the output
                    runner.stdout?.on('data', async (data) => {
                      console.log(data.toString())
                    })

                    // Log the error
                    runner.stderr?.on('data', async (data) => {
                      console.log(data.toString())
                    })
                  } catch (error) {
                    projectData.messages.push({
                      role: 'assistant',
                      content: `Something went wrong, dependencies have not been installed!`
                    })
                  }
                }
              }
            )
          }
        }
        // Update the settings.json file
        await writeFile(settingsPath, JSON.stringify(projectData))
      } catch (error) {
        console.log(error)
      }
    }
  )
})
