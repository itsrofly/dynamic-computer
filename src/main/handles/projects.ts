import { execFile } from 'child_process'
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
import { platformHandler } from '../dependencies/python'
import { dialog } from 'electron'

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
  dependencies: string[]
}

interface Project {
  title: string
  path: string // Projects/{random folder name}
  latestDate: string
}

interface ToolCallEditFile {
  file_content: string
  commit_message: string
  pip_requirements: string[]
}

app.whenReady().then(() => {
  // Initial Messages
  const messages = [
    "Hi! What's up?",
    "Hey, what's on your mind?",
    'Hi! How can I help you today?',
    'Hello! What can I do for you today?',
    'Hey! How can I assist you today?'
  ]

  // Filter script to run python code and get the important output
  const filterScript = `
import subprocess
import sys

def run_script(script_path):
    try:
        result = subprocess.run([sys.executable, script_path], check=True, capture_output=True, text=True)
        print(result.stdout)
    except subprocess.CalledProcessError as e:
        error_message = e.stderr.strip().split(\"\\n\")[-1]
        print(error_message)

if __name__ == \"__main__\":
    if len(sys.argv) != 2:
        sys.exit(1)
    script_path = sys.argv[1]
    run_script(script_path)
`

  // Default file content
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

  const handleLogs = async (index: number, data: string) => {
    // Get projects in config file
    const projects = JSON.parse((await readFile('projects.json')) || '[]') as Project[]

    // Try get the project with index
    const project = projects[index]

    // Get the path to the log file
    const logPath = join(project.path, 'logfile')

    // Data, everything in a single line, remove all break lines
    const dataString = data.trim().replace(/\r/g, '').replace(/\n/g, '') + '\n'

    if (dataString == '\n') return

    // Append the output to the log file
    await writeFile(logPath, dataString, {
      flag: 'a'
    })

    // Get the focused web content
    const webContent = webContents.getFocusedWebContents()

    // Send the error to the renderer process
    webContent?.send('projects:log', index, dataString)
  }

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
        dependencies: []
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

      // Create logfile file
      await writeFile(join(projectFolder, 'logfile'), '')

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
      console.error(error)
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
      console.error(error)
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
      const projectSettings = JSON.parse((await readFile(settingsPath)) || '{}') as ProjectSettings

      // Create the full path to the project file to run
      const filePath = join(userDataPath, project.path, projectSettings.file)

      // Get platform python information
      const plataformInfo = platformHandler()

      // Install the dependencies if there are any
      if (projectSettings.dependencies.length > 0) {
        // Python executable path
        const pythonExecutable = join(userDataPath, 'python', plataformInfo.exec)

        // Execute the command
        const process = execFile(pythonExecutable, [
          '-m',
          'pip',
          'install',
          ...projectSettings.dependencies,
          '--upgrade',
          'pip',
          '--no-warn-script-location',
          '--no-warn-conflicts'
        ])

        process.stdout?.once('data', () => {
          // Send signal to the renderer process that command has being executed
          const webContent = webContents.getFocusedWebContents()

          // Send the update to the renderer process
          webContent?.send('projects:loading:start', index)
        })

        process.stderr?.on('data', (data) => handleLogs(index, data))

        // Use resolve to wait for the process to finish
        await new Promise((resolve) => {
          process.on('close', async () => {
            // Send signal to the renderer process that command has being executed
            const webContent = webContents.getFocusedWebContents()

            // Send the update to the renderer process
            webContent?.send('projects:loading:end', index)
            resolve(null)
          })
        })
      }

      // Path to python executable
      const pythonExecutable = join(userDataPath, 'python', plataformInfo.exec)

      // Run Python file
      const process = execFile(pythonExecutable, ['-c', filterScript, filePath])

      // Handle the output of the python file
      process.stdout?.on('data', (data) => handleLogs(index, data))

      // Handle the error of the python file
      process.stderr?.on('data', (data) => handleLogs(index, data))

      // Use resolve to wait for the process to finish
      await new Promise((resolve) => {
        process.on('close', () => {
          resolve(null)
        })
      })
    } catch (error) {
      console.error(error)
    }
  })

  ipcMain.handle('projects:export', async (_ev, index: number) => {
    try {
      // Get projects in config file
      const projects = JSON.parse((await readFile('projects.json')) || '[]') as Project[]

      // Try get the project with index
      const project = projects[index]

      // Get platform python information
      const plataformInfo = platformHandler()

      // Get the path to the project settings file
      const settingsPath = join(project.path, 'settings.json')

      // Read the project settings
      const projectSettings = JSON.parse((await readFile(settingsPath)) || '{}') as ProjectSettings

      // Get the path to the user data directory
      const userDataPath = app.getPath('userData')

      // Create the full path to the project file to run
      const filePath = join(userDataPath, project.path, projectSettings.file)

      // Get the folder to export the project
      const exportDialog = await dialog.showOpenDialog({
        title: 'Export Project',
        defaultPath: join(app.getPath('desktop')),
        properties: ['openDirectory']
      })

      // Python executable
      const pythonExecutable = join(userDataPath, 'python', plataformInfo.exec)

      // If the user canceled the dialog do nothing
      if (exportDialog.canceled) {
        return
      }

      // Output folder
      const outputFolder = exportDialog.filePaths[0]

      // Temporary folder to store build temporary files
      const tempFolder = join (app.getPath('temp'), app.getName(), project.path)

      // Execute the command
      const exportProcess = execFile(pythonExecutable, [
        '-m',
        'PyInstaller',
        '--onefile',
        '--noconsole',
        '--distpath',
        outputFolder,
        '--workpath',
        tempFolder,
        '--specpath',
        tempFolder,
        '--name',
        project.title,
        filePath
      ])

      // Use resolve to wait for the process to finish
      await new Promise((resolve) => {
        exportProcess.on('exit', async () => {
          resolve(null)
        })
      })
    } catch (error) {
      console.error(error)
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
      console.error(error)
    }
  })

  ipcMain.handle('projects:all', async () => {
    try {
      // Return the projects in the config file
      const projects = JSON.parse((await readFile('projects.json')) || '[]') as Project[]
      return projects
    } catch (error) {
      console.error(error)
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
      const projectSettings = JSON.parse((await readFile(settingsPath)) || '{}') as ProjectSettings

      return projectSettings
    } catch (error) {
      console.error(error)
      return null
    }
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
        const projectSettings = JSON.parse(
          (await readFile(settingsPath)) || '{}'
        ) as ProjectSettings

        // Add the new message
        projectSettings.messages.push({ role: 'user', content })

        // If there is an access token (logged in)
        if (access_token) {
          // Copy of messages
          const messages = [...projectSettings.messages]

          // Read my file
          const fileContent = await readFile(join(project.path, projectSettings.file))

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
                case 401: // Just in case the token is invalid
                  projectSettings.messages.push({
                    role: 'assistant',
                    content: `Something went wrong, please make sure you're logged in!`
                  })
                  break
                case 402:
                  projectSettings.messages.push({
                    role: 'assistant',
                    content: `Something went wrong, please make sure you have a valid subscription!`
                  })
                  break
                default:
                  projectSettings.messages.push({
                    role: 'assistant',
                    content: `Something went wrong, please try again later!`
                  })
                  break
              }
            } else {
              projectSettings.messages.push({
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
              projectSettings.messages.push({ role: 'assistant', content: message.content })
            if (message.tool_calls) {
              // Handle the tool calls
              const toolCallPromises = message.tool_calls.map(
                async (tool_call: { function: { name: string; arguments: string } }) => {
                  if (tool_call.function.name !== 'edit_main_file') {
                    projectSettings.messages.push({
                      role: 'assistant',
                      content: 'Unrecognized Operation!'
                    })
                  } else {
                    // Get the arguments
                    const args: ToolCallEditFile = JSON.parse(tool_call.function.arguments)

                    // Update the file content
                    await writeFile(join(project.path, projectSettings.file), args.file_content)

                    // Unnecessary requirements
                    const unnecessary = ['tkinter']

                    // Remove the unnecessary requirements
                    args.pip_requirements = args.pip_requirements.filter(
                      (requirement) => !unnecessary.includes(requirement)
                    )

                    // Update the dependencies
                    projectSettings.dependencies = [
                      ...new Set([...projectSettings.dependencies, ...args.pip_requirements])
                    ]

                    // Update the commits
                    projectSettings.commits.push({
                      date: new Date().toISOString(),
                      message: args.commit_message
                    })

                    // Commit the changes
                    await gitCommit(project.path, args.commit_message)

                    // Rename the project if as default name
                    if (project.title == 'New Project') {
                      // Get the focused web content
                      const webContent = webContents.getFocusedWebContents()

                      project.title =
                        projectSettings.commits[projectSettings.commits.length - 1].message
                      await writeFile('projects.json', JSON.stringify(projects))

                      // Send the update to the renderer process
                      webContent?.send('projects:update')
                    }
                  }
                }
              )
              // Wait for all tool call promises to resolve
              await Promise.all(toolCallPromises)
            }
          }
        } else {
          projectSettings.messages.push({
            role: 'assistant',
            content: `Something went wrong, please make sure you're logged in!`
          })
        }
        // Update the settings.json file
        await writeFile(settingsPath, JSON.stringify(projectSettings))
      } catch (error) {
        console.error(error)
      }
    }
  )
})
