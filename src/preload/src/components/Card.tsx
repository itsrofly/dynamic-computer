import { useContext } from "react";
import { Link } from "react-router-dom"
import { ProjectsContext } from "../main";
import { runProject, stopProject } from "../tools/Project";


function Card({ index, refresh }: { index: number, refresh: Function }): JSX.Element {
  const Projects = useContext(ProjectsContext);
  const project = Projects[index];

  return (
    <>
      <div>
        <div className="shadow-lg m-auto border-0 rounded text-center text-black"
          style={{ height: "150px", width: "220px", backgroundColor: "white", borderColor: "white", cursor: "default" }}>

          <div className="w-100 text-end">
            <Link to={`/editor?index=${index}`} >
              <svg className="mt-2 me-2" xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="black"
                style={{ cursor: "pointer" }}>
                <path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z" />
              </svg>
            </Link>
          </div>

          <div>{project.title}</div>
          <div>{project.latestDate}</div>

          <button className={`${project.isRunning ? "btn-danger" : "btn-primary"} btn shadow border-0 mt-3`}
            onClick={() => {
              if (project.isRunning)
                stopProject(Projects, index);
              else
                runProject(Projects, index);
              refresh();
            }}
            style={{ width: "150px" }}>{project.isRunning ? "Stop" : "Run"}
          </button>

        </div>

      </div>
    </>
  )
}

export default Card
