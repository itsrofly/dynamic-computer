import { useContext, useEffect, useState } from 'react'
import Card from '../components/Card'
import CardCreate from '../components/Create'
import Topbar from '../components/Topbar'
import ProfileModal from '../components/Profile'
import { ProjectsContext } from '../main'

function Select(): JSX.Element {
  const [refreshPage, setRefreshPage] = useState(false)
  const [filter, setFilter] = useState('')
  // Get the projects from the context
  const Projects = useContext(ProjectsContext)

  // Function to refresh the page
  const refreshSelectPage = (): void => {
    setRefreshPage(!refreshPage)
  }
  useEffect(() => {}, [refreshPage, filter])
  return (
    <>
      <Topbar setFilter={setFilter} />
      <ProfileModal />

      <div className="container text-white mb-5">
        <span>Your Apps</span>
        <div className="mt-3 grid-layout">
          <CardCreate refresh={refreshSelectPage} />
          {Projects.map((project, index) => {
            if (project.title.toLowerCase().includes(filter.toLowerCase()))
              return <Card key={index} index={index} refresh={refreshSelectPage} />
            return <></>
          })}
        </div>
      </div>
    </>
  )
}

export default Select
