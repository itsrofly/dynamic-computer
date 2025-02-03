import { useContext, useEffect, useState } from 'react'

// Components
import Card from '../components/Card'
import CardCreate from '../components/Create'
import Topbar from '../components/Topbar'
import ProfileModal from '../components/Profile'
import SettingsModal from '../components/Settings'

import { ProjectsContext } from '../App'

function Select(): JSX.Element {
  const [filter, setFilter] = useState('')
  // Get the projects from the context
  const Projects = useContext(ProjectsContext)

  useEffect(() => {}, [filter])
  return (
    <>
      <Topbar setFilter={setFilter} />
      <ProfileModal />
      <SettingsModal />
      <div className="container text-white mb-5">
        <span>Your Apps</span>
        <div className="mt-3 grid-layout">
          <CardCreate />
          {Projects.map((project, index) => {
            if (project.title.toLowerCase().includes(filter.toLowerCase()))
              return <Card key={index} project={project} index={index} />
            return <></>
          })}
        </div>
      </div>
    </>
  )
}

export default Select
