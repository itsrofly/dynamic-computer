import { ipcRenderer } from 'electron'
import { Project } from '../main'
import { join } from 'path'
import { supabase } from './User'

export interface chat {
  role: 'user' | 'assistant'
  content: string
}

export interface projectSettings {
  file: string
  messages: chat[]
  commits: { date: string; message: string }[]
  dependencies: string[]
  log: { date: string; output: string }[]
}

/**
 * Create a new project
 * @param Projects - The projects array
 */
export async function createProject(Projects: Project[]): Promise<void> {
  const today = new Date()
  const formattedDate = today.toISOString().split('T')[0]
  const uniquePath = join('Projects', generateUniqueId())

  // Project settings and data
  const settings: projectSettings = {
    file: 'main.py',
    messages: [{ role: 'assistant', content: randowWelcomeMessage() }],
    commits: [{ date: formattedDate, message: 'Create Project' }],
    dependencies: [],
    log: []
  }

  // Project information
  const project: Project = {
    title: 'New Project',
    path: uniquePath,
    latestDate: formattedDate
  }

  // Create settings.json file
  await ipcRenderer.invoke(
    'writeFile',
    join(project.path, 'settings.json'),
    JSON.stringify(settings)
  )

  // Create gitignore file
  await ipcRenderer.invoke(
    'writeFile',
    join(project.path, '.gitignore'),
    'settings.json\n__pycache__\n*.pyc\n*.pyo\n*.pyd\n*.pyw\n*.pyz\n*.pywz\n*.pyzw'
  )

  // Create main.py file
  await ipcRenderer.invoke(
    'writeFile',
    join(project.path, settings.file),
    "#Write the application code here\nprint('Hello, World!')"
  )

  // Initialize the git repository
  await ipcRenderer.invoke('gitInit', project.path)
  await ipcRenderer.invoke('gitAdd', project.path, '.')
  await ipcRenderer.invoke('gitCommit', project.path, 'Create Project')

  // Add the new project to the projects array
  Projects.push({ ...project, isRunning: false })

  // Update the projects.json file
  await ipcRenderer.invoke('writeFile', 'projects.json', JSON.stringify(Projects))
}

/**
 * Delete a project
 * @param Projects - The projects array
 * @param index - The index of the project to be deleted in the projects array
 */
export async function deleteProject(Projects: Project[], index: number): Promise<void> {
  const project = Projects[index]

  // Delete the project folder and files
  await ipcRenderer.invoke('deleteFile', project.path)

  Projects.splice(index, 1)
  // Update the projects.json file
  await ipcRenderer.invoke('writeFile', 'projects.json', JSON.stringify(Projects))
}

/**
 * Change the title of a project
 * @param Projects
 * @param index
 * @param newTitle
 */
export async function changeProjectTitle(
  Projects: Project[],
  index: number,
  newTitle: string
): Promise<void> {
  const project = Projects[index]
  // Update the project title
  Object.assign(Projects[index], { ...project, title: newTitle })

  // Update the projects.json file
  await ipcRenderer.invoke('writeFile', 'projects.json', JSON.stringify(Projects))
}

/**
 * Add a message to the project
 * @param Projects
 * @param index
 * @param role
 * @param content
 */
async function addMessage(
  Projects: Project[],
  index: number,
  role: 'user' | 'assistant',
  content: string
): Promise<void> {
  const project = Projects[index]
  // Get the project settings/data
  const projectSettings = await getProjectSettings(Projects, index)
  // Add the new message
  projectSettings.messages.push({ role, content })

  // Update the settings.json file
  await ipcRenderer.invoke(
    'writeFile',
    join(project.path, 'settings.json'),
    JSON.stringify(projectSettings)
  )
}

async function addErrorMessage(
  Projects: Project[],
  index: number,
  content?: string
): Promise<void> {
  await addMessage(
    Projects,
    index,
    'assistant',
    content || 'Something went wrong. Please try again later!'
  )
}

/**
 * Send a message to the assistant API
 * @returns
 */
export async function sendMessageToAI(
  Projects: Project[],
  index: number,
  content: string
): Promise<void> {
  // Add message
  await addMessage(Projects, index, 'user', content)

  // Get the project settings/data
  const projectSettings = await getProjectSettings(Projects, index)
  const messages = projectSettings.messages

  // Get authentication token
  const {
    data: { session }
  } = await supabase.auth.getSession()
  if (!session) {
    // Not logged in message
    await addErrorMessage(Projects, index, 'You must be logged in to use this service!')
    return
  }

  // Payload to send to the assistant API
  const payload = {
    access_token: session.access_token,
    messages,
    app_version: '1.0.0'
  }

  const response = await supabase.functions.invoke('assistant-api', {
    body: payload
  })

  // Handle error
  if (response.error || !response.data || !response.data[0]) {
    if (response.error.context && response.error.context.status == 402)
      await addErrorMessage(
        Projects,
        index,
        'To use this service, you must have an active subscription. See our website for more information!'
      )
    else {
      // Something got wrong
      await addErrorMessage(Projects, index)
    }
  }

  const data = response.data[0]

  if (data.message && data.message.content) {
    const responseContent = data.message.content
    await addMessage(Projects, index, 'assistant', responseContent)
  }
  if (data.message && data.message.tool_calls) {
    const functionsToCall = data.message.tool_calls
    console.log(functionsToCall)
  }
}

/**
 * Get the project settings/data
 * @param Projects
 * @param index
 * @returns Promise<projectSettings>
 */
export async function getProjectSettings(
  Projects: Project[],
  index: number
): Promise<projectSettings> {
  const project = Projects[index]
  // Get the project settings/data
  return JSON.parse(
    await ipcRenderer.invoke('readFile', join(project.path, 'settings.json'))
  ) as projectSettings
}

/**
 * Stop a project
 * @param Projects
 * @param index
 */
export async function stopProject(Projects: Project[], index: number): Promise<void> {
  const project = Projects[index]
  // Stop the project
  ipcRenderer.invoke('stopProject', Projects, index)
  // Update the project status
  Object.assign(Projects[index], { ...project, isRunning: false })
}

/**
 * Start a project
 * @param Projects
 * @param index
 */
export async function runProject(Projects: Project[], index: number): Promise<void> {
  const project = Projects[index]
  // Run the project
  Object.assign(Projects[index], { ...project, isRunning: true })
  // Update the projects.json file
  ipcRenderer.invoke('runProject', Projects, index)
}

// Auxiliary functions
function generateUniqueId(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 10; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

function randowWelcomeMessage(): string {
  const messages = [
    "Hi! What's up?",
    "Hey, what's on your mind?",
    'Hi! How can I help you today?',
    'Hello! What can I do for you today?',
    'Hey! How can I assist you today?'
  ]
  return messages[Math.floor(Math.random() * messages.length)]
}
