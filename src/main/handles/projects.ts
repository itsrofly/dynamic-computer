import { ChildProcess, exec } from 'child_process'
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

  // Filter script to run python code and get the important output
  const filterScript = `
import subprocess
import sys

def run_script(script_path):
    try:
        result = subprocess.run([sys.executable, script_path], check=True, capture_output=True, text=True)
        print(result.stdout)
    except subprocess.CalledProcessError as e:
        error_message = e.stderr.strip().split(\\"\\n\\")[-1]
        print(error_message)

if __name__ == \\"__main__\\":
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
        dependencies: ''
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

      // Get the path to the log file
      const logPath = join(project.path, 'logfile')

      // Read the project settings
      const projectSettings = JSON.parse((await readFile(settingsPath)) || '{}') as ProjectSettings

      // Create the full path to the project file to run
      const filePath = join(userDataPath, project.path, projectSettings.file)

      // Kill the process if it's running
      processRunning[filePath]?.kill(), (processRunning[filePath] = null)

      // Get platform python information
      const plataformInfo = platformHandler()

      // Command to install dependencies
      const installDep =
        projectSettings.dependencies.length > 0
          ? `${join(userDataPath, 'python', plataformInfo.exec)} -m pip install ${projectSettings.dependencies};`
          : ''

      // Command to run the python file after install the dependencies
      const command = `${installDep} ${join(userDataPath, 'python', plataformInfo.exec)} -c '${filterScript}' ${filePath}`

      // Start the process, detached so it doesn't close when the app closes, here you should use full paths
      processRunning[filePath] = exec(command, plataformInfo.options)

      // Log the output
      processRunning[filePath].stdout?.on('data', async (data) => {
        console.log(data.toString())

        // Data, everything in a single line, remove all break lines
        const dataString = data.toString().trim().replace(/\r/g, '').replace(/\n/g, '') + '\n'

        // Append the output to the log file
        await writeFile(logPath, dataString, {
          flag: 'a'
        })
      })

      // Log the error
      processRunning[filePath].stderr?.on('data', async (data) => {
        console.log(data.toString())

        // Data, everything in a single line, remove all break lines
        const dataString = data.toString().trim().replace(/\r/g, '').replace(/\n/g, '') + '\n'

        // Append the output to the log file
        await writeFile(logPath, dataString, {
          flag: 'a'
        })
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
      const projectSettings = JSON.parse((await readFile(settingsPath)) || '{}') as ProjectSettings

      // Get the path to the user data directory
      const userDataPath = app.getPath('userData')

      // Get the web content
      const webContent = webContents.getFocusedWebContents()

      // Create the full path to the project file to stop
      const filePath = join(userDataPath, project.path, projectSettings.file)

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
      const projectSettings = JSON.parse((await readFile(settingsPath)) || '{}') as ProjectSettings

      return projectSettings
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
        const projectSettings = JSON.parse((await readFile(settingsPath)) || '{}') as ProjectSettings

        // Add the new message
        projectSettings.messages.push({ role: 'user', content })

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
              case 401:
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
                  projectSettings.dependencies = args.pip_requirements.join(' ')

                  // Update the commits
                  projectSettings.commits.push({
                    date: new Date().toISOString(),
                    message: args.commit_message
                  })

                  // Commit the changes
                  await gitCommit(project.path, args.commit_message)
                }
              }
            )

            // Wait for all tool call promises to resolve
            await Promise.all(toolCallPromises)
          }
        }
        // Update the settings.json file
        await writeFile(settingsPath, JSON.stringify(projectSettings))

        // Rename the project if as default name
        if (project.title == 'New Project') {
          // Get the focused web content
          const webContent = webContents.getFocusedWebContents()

          project.title = projectSettings.commits[projectSettings.commits.length - 1].message
          await writeFile('projects.json', JSON.stringify(projects))

          // Send the update to the renderer process
          webContent?.send('projects:update')
        }
      } catch (error) {
        console.log(error)
      }
    }
  )
})
