import { Routes, Route, HashRouter } from "react-router-dom";
import Select from "./pages/Select";
import Editor from "./pages/Editor";
import { ipcRenderer } from "electron";
import { useContext, useEffect, useState } from "react";
import { ProjectsContext } from "./main";


function App(): JSX.Element {
  // Get the projects from the main process
  const Projects = useContext(ProjectsContext);
  // Used Refresh the page when a project is stopped
  const [refreshPage, setRefreshPage] = useState(false);

  // Listen to the project:stopped event
  ipcRenderer.once('project:stopped', (_event, id, code) => {
    const project = Projects[id];

    // Check if the project was stopped successfully
    if (code !== 0)
      alert(`Failure to execute: ${project.title}.\nPlease consult the assistant!`);
    // Update the project status
    Object.assign(Projects[id], { ...project, isRunning: false });

    // Refresh the page
    setRefreshPage(!refreshPage);
  })

  useEffect(() => { }, [refreshPage]);
  return (
    <HashRouter>
      <Routes>
        <Route path="/" index element={<Select />} />
        <Route path="/editor" element={<Editor />} />
      </Routes>
    </HashRouter>
  )
}

export default App
