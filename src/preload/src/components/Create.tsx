import { useContext } from "react";
import { createProject } from "../tools/Project";
import { ProjectsContext } from "../main";

function CardCreate({ refresh }: { refresh: Function }): JSX.Element {
    const Projects = useContext(ProjectsContext);
    
    return (
        <>
            <div>
                <button className="border-2 m-auto rounded bg-transparent"
                    onClick={async () => {
                        await createProject(Projects);
                        refresh();
                    }}
                    style={{ height: "150px", width: "220px", borderColor: "#5FB2FF" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" height="24px" viewBox="0 -960 960 960" width="24px" fill="#5FB2FF"><path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z" />
                    </svg>

                </button>

            </div>
        </>
    )
}

export default CardCreate
