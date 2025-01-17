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