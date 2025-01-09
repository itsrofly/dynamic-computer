import React, { createContext } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ipcRenderer } from 'electron';

export interface Project {
  title: string;
  path: string;
  latestDate: string;
  isRunning?: boolean
}
// Create a context to store all projects
export const ProjectsContext = createContext<Project[]>([]);

export const notOpenSourceRightNow = async () => {
  // Load all projects from projects.json
  const data = await ipcRenderer.invoke('readFile', 'projects.json')

  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <ProjectsContext.Provider value={JSON.parse(data || "[]")}>
        <App />
      </ProjectsContext.Provider>
    </React.StrictMode>
  );
};