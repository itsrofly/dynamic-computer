import { ipcRenderer } from 'electron'
import { Project } from '../main'
import { join } from 'path'

export interface projectSettings {
  file: string
  messages: { role: 'user' | 'assistant'; content: string }[]
  commits: { date: string; message: string }[]
  dependencies: string[]
  log: { date: string; output: string }[]
}

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

/**
 * Create a new project
 * Status: Stable
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
  await ipcRenderer.invoke('writeFile', join(uniquePath, 'settings.json'), JSON.stringify(settings))

  // Create main.py file
  await ipcRenderer.invoke(
    'writeFile',
    join(uniquePath, settings.file),
    "#Write the application code here\nprint('Hello, World!')"
  )

  // Add the new project to the projects array
  Projects.push({ ...project, isRunning: false })

  // Update the projects.json file
  await ipcRenderer.invoke('writeFile', 'projects.json', JSON.stringify(Projects))
}

/**
 * Delete a project
 * Status: Stable
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
 * Status: Stable
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
 * Status: Stable
 * @param Projects
 * @param index
 * @param role
 * @param content
 */
export async function addMessage(
  Projects: Project[],
  index: number,
  role: 'user' | 'assistant',
  content: string
): Promise<void> {
  const project = Projects[index]
  // Get the project settings/data
  const projectSettings = JSON.parse(
    await ipcRenderer.invoke('readFile', join(project.path, 'settings.json'))
  ) as projectSettings
  // Add the new message
  projectSettings.messages.push({ role, content })

  // Update the settings.json file
  await ipcRenderer.invoke(
    'writeFile',
    join(project.path, 'settings.json'),
    JSON.stringify(projectSettings)
  )
}

/**
 * Get the project settings/data
 * Status: Stable
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

export async function stopProject(Projects: Project[], index: number): Promise<void> {
  const project = Projects[index]
  // Stop the project
  ipcRenderer.invoke('stopProject', Projects, index)
  // Update the project status
  Object.assign(Projects[index], { ...project, isRunning: false })
}

export async function runProject(Projects: Project[], index: number): Promise<void> {
  const project = Projects[index]
  // Run the project
  Object.assign(Projects[index], { ...project, isRunning: true })
  // Update the projects.json file
  ipcRenderer.invoke('runProject', Projects, index)
}
