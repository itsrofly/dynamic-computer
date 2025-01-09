import { useContext, useEffect, useState } from "react";
import Card from "../components/Card"
import CardCreate from "../components/Create"
import Topbar from "../components/Topbar"
import ProfileModal from "../components/Profile";
import { ProjectsContext } from "../main";


function Select(): JSX.Element {
    const [refreshPage, setRefreshPage] = useState(false);
    // Get the projects from the context
    const Projects = useContext(ProjectsContext);
  
    // Function to refresh the page
    const refreshSelectPage = () => {
      setRefreshPage(!refreshPage);
    };
    useEffect(() => { }, [refreshPage]);
    return (
        <>
            <Topbar />
            <ProfileModal />

            <div className="container text-white mb-5">
                <span>Your Apps</span>
                <div className="mt-3 grid-layout">
                    <CardCreate refresh={refreshSelectPage} />
                    {Projects.map((_project, index) => (
                        <Card key={index} index={index} refresh={refreshSelectPage} />
                    ))}
                </div>

            </div>

        </>
    )
}

export default Select
