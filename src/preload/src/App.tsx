import { Routes, Route, HashRouter } from "react-router-dom";
import Select from "./pages/Select";
import Editor from "./pages/Editor";
import { ipcRenderer } from "electron";
import { useContext, useEffect, useState } from "react";
import { ProjectsContext } from "./main";


function App(): JSX.Element {
  const Projects = useContext(ProjectsContext);
  const [refreshPage, setRefreshPage] = useState(false);

  ipcRenderer.once('project:stopped', (_event, id, code) => {
    const project = Projects[id];

    if (code !== 0)
      alert(`Failure to execute: ${project.title}.\nPlease consult the assistant!`);
    Object.assign(Projects[id], { ...project, isRunning: false });
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
