import React, { createContext } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ipcRenderer } from 'electron'
import { supabase } from './tools/User'

export interface Project {
  title: string
  path: string
  latestDate: string
  isRunning?: boolean
}
// Create a context to store all projects
export const ProjectsContext = createContext<Project[]>([])

export const notOpenSourceRightNow = async (): Promise<void> => {
  // Load all projects from projects.json
  const data = await ipcRenderer.invoke('readFile', 'projects.json')

  // Get the user from the session
  const {
    data: { user }
  } = await supabase.auth.getUser()
  localStorage.setItem('user', JSON.stringify(user))

  // Exchange the code for a session
  ipcRenderer.once('session:exchange', async (_event, code) => {
    await supabase.auth.exchangeCodeForSession(code)
    window.location.reload()
  })

  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <ProjectsContext.Provider value={JSON.parse(data || '[]')}>
        <App />
      </ProjectsContext.Provider>
    </React.StrictMode>
  )
}
