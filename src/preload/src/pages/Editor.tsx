import { useContext, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { addMessage, changeProjectTitle, deleteProject, getProjectSettings, projectSettings, runProject, stopProject } from "../tools/Project";
import MessageCard from "../components/Message";
import NotFound from "../components/404";
import { ProjectsContext } from "../main";

function Editor(): JSX.Element {
    // Get the search params to get the index of the project
    const [searchParams, _setSearchParams] = useSearchParams();
    // State to store the project data
    const [projectData, setProjectData] = useState<projectSettings | null>();
    // Get the projects from the context
    const Projects = useContext(ProjectsContext);
    // State to refresh the page
    const [refreshPage, setRefreshPage] = useState(false);
    // Get the navigate function to navigate to the home page
    const navigate = useNavigate();

    // Get the index of the project from the search params
    const indexParam = searchParams.get("index");
    // Parse the index to an integer
    const index = indexParam !== null ? parseInt(indexParam) : null;


    // If the index is null, return a 404 page
    if (index === null)
        return (<NotFound />);

    // Get the project from the projects array
    const project = Projects[index];
    // If the project is undefined, return a 404 page
    if (project == undefined)
        return (<NotFound />);

    // Get the project settings/data, when the page is refreshed/loaded
    useEffect(() => {
        const getProject = async () => {
            setProjectData(await getProjectSettings(Projects, index));
        };
        getProject();
    }, [refreshPage]);

    // Function to auto expand the textarea
    const autoExpand = (currentTarget: HTMLTextAreaElement): void => {
        currentTarget.style.height = "40px";
        currentTarget.style.height = `${currentTarget.scrollHeight}px`;
    }

    // Function to send a message
    const sendMessage = async (currentTarget: HTMLTextAreaElement): Promise<void> => {
        const message = currentTarget.value;
        if (message) {
            await addMessage(Projects, index, "user", message);
            setRefreshPage(!refreshPage);
            currentTarget.value = "";
            autoExpand(currentTarget);
        }
    }

    return (
        <>
            <div className="h-100 rounded-end shadow container text-center pt-5"
                style={{ width: "90px", float: "left", backgroundColor: "white" }}>
                <div>
                    <Link to="/">
                        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="black"><path d="M400-80 0-480l400-400 71 71-329 329 329 329-71 71Z" /></svg>
                    </Link>
                </div>

                <div className="mt-5">
                    <a role="button" onClick={() => {
                        if (project.isRunning)
                            stopProject(Projects, index);
                        else
                            runProject(Projects, index);
                        setRefreshPage(!refreshPage);
                    }}>
                        {project.isRunning ?
                            <svg xmlns="http://www.w3.org/2000/svg" height="36px" viewBox="0 -960 960 960" width="36px" fill="#fd7e14"><path d="M320-320h320v-320H320v320ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z" /></svg>
                            :
                            <svg xmlns="http://www.w3.org/2000/svg" height="36px" viewBox="0 -960 960 960" width="36px" fill="#0d6efd"><path d="m380-300 280-180-280-180v360ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z" /></svg>
                        }
                    </a>

                </div>

                <div className="mt-5">
                    <a role="button" onClick={async () => {
                        await deleteProject(Projects, index)
                        navigate("/");
                    }}>
                        <svg xmlns="http://www.w3.org/2000/svg" height="36px" viewBox="0 -960 960 960" width="36px" fill="red"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z" /></svg>
                    </a>
                </div>

            </div>
            <div className="d-flex flex-column h-100 text-white text-center pt-2" style={{ float: "none" }}>
                <div className="w-100">
                    <span role="button"
                        onDoubleClick={(e) => {
                            e.currentTarget.contentEditable = "true";
                            e.currentTarget.focus();
                        }}

                        onBlur={async (e) => {
                            if (e.currentTarget.innerText.trim().length == 0) {
                                e.currentTarget.innerText = project.title;
                            }
                            e.currentTarget.contentEditable = "false";

                            await changeProjectTitle(Projects, index, e.currentTarget.innerText);
                        }}

                        onKeyDown={(e) => {
                            if (e.key === 'Enter')
                                e.preventDefault();
                        }}

                        onInput={(e) => {

                            if (e.currentTarget.innerText.length > 20) {
                                e.currentTarget.innerText = e.currentTarget.innerText.substring(0, 20);
                            }

                            // keep the bar always at the end
                            const range = document.createRange();
                            const sel = window.getSelection();
                            range.setStart(e.currentTarget.childNodes[0], e.currentTarget.innerText.length);
                            range.collapse(true);

                            if (sel)
                                sel.removeAllRanges(),
                                    sel.addRange(range);
                        }}>
                        {project.title}
                    </span>

                </div>

                <div className="container w-100 h-100 mt-5 overflow-y-auto">
                    {projectData?.messages.map((message, index) => {
                        if (message.role === "user") {
                            return (
                                <div key={index} className="w-100 d-flex justify-content-end pt-5">
                                    <MessageCard message={message.content} />
                                </div>
                            )
                        } else {
                            return (
                                <div key={index} className="w-100 d-flex justify-content-start pt-5">
                                    <span>
                                        {message.content}
                                    </span>
                                </div>
                            )
                        }
                    })}
                </div>

                <div className="container w-100 rounded d-flex align-items-center position-relative" style={{ minHeight: "80px", backgroundColor: "#272727" }}>
                    <div className="input-group p-auto position-absolute" style={{ bottom: "10px", backgroundColor: "#272727" }}>
                        <textarea className="form-control border text-white bg-transparent invisible-scrollbar"
                            aria-label="With textarea" id="prompt" style={{ maxHeight: "125px", height: "40px" }}
                            onInput={(e) => autoExpand(e.currentTarget)}

                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    sendMessage(e.currentTarget);
                                }
                            }}>

                        </textarea>

                        <button className="btn btn-outline-secondary border-white" type="button"
                            onClick={() => {
                                const textarea = document.querySelector("textarea");
                                sendMessage(textarea!);
                            }}>
                            Send
                        </button>

                    </div>
                </div>
            </div>
        </>
    )
}

export default Editor
