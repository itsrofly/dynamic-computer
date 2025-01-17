// React
import { Routes, Route, HashRouter } from 'react-router-dom'
import { createContext, useEffect, useState } from 'react'

// Pages
import Select from './pages/Select'
import Editor from './pages/Editor'
import { ipcRenderer } from 'electron'

import { supabase } from './handles/User'

export interface Project {
  title: string
  path: string
  latestDate: string
  isRunning?: boolean
}
// Create a context to store all projects
export const ProjectsContext = createContext<Project[]>([])

function App(): JSX.Element {
  // Used Refresh the page when a project is stopped
  const [refreshPage, setRefreshPage] = useState(false)

  // Projects
  const [projects, setProjects] = useState<Project[]>([])

  ipcRenderer.once('projects:update', async () => {
    // Refresh the page
    setRefreshPage(!refreshPage)
  })

  // Exchange the code for a session
  ipcRenderer.once('callback:exchange', async (_event, code) => {
    await supabase.auth.exchangeCodeForSession(code)
    // Brute refresh (only in cases that refreshPage doesn't work)
    window.location.reload()
  })

  useEffect(() => {
    const loadSync = async (): Promise<void> => {
      // Get all projects
      setProjects(await ipcRenderer.invoke('projects:all'))
    }

    loadSync()
  }, [refreshPage])
  return (
    <ProjectsContext.Provider value={projects}>
      <HashRouter>
        <Routes>
          <Route path="/" index element={<Select />} />
          <Route path="/editor" element={<Editor />} />
        </Routes>
      </HashRouter>
    </ProjectsContext.Provider>
  )
}

export default App
