// React
import { useContext, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

// Components
import MessageCard from '../components/Message'
import NotFound from '../components/404'

// Electron & isomorphic-git
import { ipcRenderer } from 'electron'
import { ReadCommitResult } from 'isomorphic-git'

import { ProjectsContext } from '../App'
import { ProjectSettings, Chat } from '../projects'
import { supabase } from '../handles/User'

function Editor(): JSX.Element {
  // Get the search params to get the index of the project
  const searchParams = useSearchParams()

  // Get the projects from the context
  const Projects = useContext(ProjectsContext)

  // State to refresh the page
  const [refreshPage, setRefreshPage] = useState(false)

  // State to show if the project is running
  const [isRunning, setIsRunning] = useState(false)

  // State to check if is sending a message
  const [isSending, setIsSending] = useState(false)

  // State to check if is exporting/downloading
  const [isExporting, setIsExporting] = useState(false)

  // State to show the loading feedback
  const [isExecuting, setIsExecuting] = useState(false)

  // State to show all messages, including loading and info types
  const [messages, setMessages] = useState<Chat[]>([])

  // State to store commits
  const [commits, setCommits] = useState<{
    all: ReadCommitResult[]
    current: ReadCommitResult | undefined
  }>()

  // Get the navigate function to navigate to the home page
  const navigate = useNavigate()

  // Get the index of the project from the search params
  const indexParam = searchParams[0].get('index')

  // Parse the index to an integer
  const index = indexParam !== null ? parseInt(indexParam) : null

  // Reference to the container of the messages
  const containerRef = useRef<HTMLDivElement>(null)

  // If the index is null, return a 404 page
  if (index === null) return <NotFound />

  // Get the project from the projects array
  const project = Projects[index]

  // If the project is undefined, return a 404 page
  if (project == undefined) return <NotFound />

  // Send log messages to the the user, add temporay to the chat (only user will see it)
  ipcRenderer.once('projects:log', (_event, i, log) => {
    if (i === index) {
      setMessages([...messages, { role: 'warning', content: log }])
    }
  })

  // If received a singnal to start the loading feedback
  ipcRenderer.once('projects:loading:start', (_event, i) => {
    if (i === index) {
      setIsExecuting(true)
    }
  })

  // If received a singnal to end the loading feedback
  ipcRenderer.once('projects:loading:end', (_event, i) => {
    if (i === index) {
      setIsExecuting(false)
    }
  })

  // Function to auto expand the textarea
  const autoExpand = (currentTarget: HTMLTextAreaElement): void => {
    currentTarget.style.height = '40px'
    currentTarget.style.height = `${currentTarget.scrollHeight}px`
  }

  // Function to send a message
  const sendMessage = async (currentTarget: HTMLTextAreaElement): Promise<void> => {
    // Set the sending feedback
    setIsSending(true)

    // Send message
    const message = currentTarget.value
    if (message) {
      // Set the loading feedback
      setMessages([...messages, { role: 'user', content: message }])

      // Clear the textarea
      currentTarget.value = ''
      autoExpand(currentTarget)

      // Get the access token
      const {
        data: { session }
      } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      // Send the message to the assistant
      await ipcRenderer.invoke('projects:send', index, message, accessToken)
      setIsSending(false)
      setRefreshPage(!refreshPage)
    }
  }

  // Change the title of the project
  const changeTitle = async (currentTarget): Promise<void> => {
    if (currentTarget.innerText.trim().length == 0) {
      currentTarget.innerText = project.title
    }
    currentTarget.contentEditable = 'false'

    await ipcRenderer.invoke('projects:rename', index, currentTarget.innerText)
  }

  // Get the project settings/data, when the page is refreshed/loaded
  useEffect(() => {
    const getProject = async (): Promise<void> => {
      // Get the project settings
      const projectSettings = (await ipcRenderer.invoke(
        'projects:settings',
        index
      )) as ProjectSettings

      // Get all the commits
      const all = (await ipcRenderer.invoke('projects:allCommits', index)) as ReadCommitResult[]

      // Get the current commit value
      const current = all.find((commit) => commit.oid === projectSettings.currentCommit)

      // Set all commits
      setCommits({ all, current })

      // Set all messages
      setMessages([
        ...projectSettings.messages,
        {
          role: 'info',
          content: `Current Version: ${current?.commit.message}`
        }
      ])
    }
    getProject()
  }, [refreshPage])

  // Auto scroll to the bottom of the messages
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages, isSending, isExecuting])

  return (
    <>
      {/* Sidebar */}
      <div
        className="h-100 rounded-end shadow container text-center pt-5"
        style={{ width: '70px', float: 'left', backgroundColor: 'white' }}
      >
        {/* Back button */}
        <div>
          <Link
            to="/"
            onClick={(e) => {
              if (isRunning || isExporting) e.preventDefault()
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="32px"
              viewBox="0 -960 960 960"
              width="32px"
              fill="#black"
              style={{ cursor: isRunning || isExporting || isSending ? 'not-allowed' : 'pointer' }}
            >
              <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h280v80H200v560h280v80H200Zm440-160-55-58 102-102H360v-80h327L585-622l55-58 200 200-200 200Z" />
            </svg>
          </Link>
        </div>

        {/* Start/Stop button */}
        <div className="mt-5">
          <a
            role="button"
            style={{ cursor: isRunning || isExporting ? 'not-allowed' : 'pointer' }}
            onClick={async () => {
              if (!isRunning && !isExporting) {
                // Set the running feedback
                setIsRunning(true)
                // Wait for the project to start and stop
                await ipcRenderer.invoke('projects:start', index)
                // Remove the running feedback
                setIsRunning(false)
              }
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="32px"
              viewBox="0 -960 960 960"
              width="32px"
              fill={isRunning ? '#fd7e14' : '#0d6efd'}
            >
              <path d="m380-300 280-180-280-180v360ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z" />
            </svg>
          </a>
        </div>

        {/* Version control */}
        <div className="mt-5">
          {/* Button to open the modal */}
          <a type="button" data-bs-toggle="modal" data-bs-target="#versionControl">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="32px"
              viewBox="0 -960 960 960"
              width="32px"
              fill="MediumPurple"
            >
              <path d="M360-120q-66 0-113-47t-47-113v-327q-35-13-57.5-43.5T120-720q0-50 35-85t85-35q50 0 85 35t35 85q0 39-22.5 69.5T280-607v327q0 33 23.5 56.5T360-200q33 0 56.5-23.5T440-280v-400q0-66 47-113t113-47q66 0 113 47t47 113v327q35 13 57.5 43.5T840-240q0 50-35 85t-85 35q-50 0-85-35t-35-85q0-39 22.5-70t57.5-43v-327q0-33-23.5-56.5T600-760q-33 0-56.5 23.5T520-680v400q0 66-47 113t-113 47ZM240-680q17 0 28.5-11.5T280-720q0-17-11.5-28.5T240-760q-17 0-28.5 11.5T200-720q0 17 11.5 28.5T240-680Zm480 480q17 0 28.5-11.5T760-240q0-17-11.5-28.5T720-280q-17 0-28.5 11.5T680-240q0 17 11.5 28.5T720-200ZM240-720Zm480 480Z" />
            </svg>
          </a>

          {/* Modal to show all commits */}
          <div
            className="modal fade"
            id="versionControl"
            tabIndex={-1}
            aria-labelledby="versionControlLabel"
            aria-hidden="true"
          >
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <button
                    type="button"
                    className="btn-close"
                    data-bs-dismiss="modal"
                    aria-label="Close"
                  ></button>
                </div>
                <div className="modal-body d-flex justify-content-center">
                  <div style={{ width: '400px' }}>
                    {commits?.all.map((commit, i) => {
                      // Calculate the date
                      const date = new Date(commit.commit.committer.timestamp * 1000)
                      return (
                        <div className="form-check m-3" key={i}>
                          <input
                            className="form-check-input"
                            type="radio"
                            name="flexRadioDefault"
                            id={'flexRadioDefault' + i}
                            checked={commit.oid === commits.current?.oid}
                            onChange={async () => {
                              if (commit.oid !== commits.current?.oid){
                                await ipcRenderer.invoke(
                                  'projects:selectVersion',
                                  index,
                                  commit.oid
                                )
                                setRefreshPage(!refreshPage)
                              }
                            }}
                          />
                          <label
                            className="form-check-label"
                            htmlFor={'flexRadioDefault' + i}
                            style={{ fontSize: 14 }}
                          >
                            {commit.commit.message}
                            {date.toLocaleString()}
                          </label>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Export/Download button */}
        <div className="mt-5">
          <a
            role="button"
            style={{ cursor: isExporting || isRunning ? 'not-allowed' : 'pointer' }}
            onClick={async () => {
              if (!isExporting && !isRunning) {
                // Set the exporting feedback
                setIsExporting(true)
                setIsExecuting(true)
                // Wait for the download/export to finish
                await ipcRenderer.invoke('projects:export', index)
                setIsExecuting(false)
                setIsExporting(false)
              }
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="32px"
              viewBox="0 -960 960 960"
              width="32px"
              fill={isExporting ? '#fd7e14' : 'green'}
            >
              <path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z" />
            </svg>
          </a>
        </div>

        {/* Delete button */}
        <div className="mt-5">
          <a
            role="button"
            onClick={async () => {
              // Wait for the project to be deleted
              await ipcRenderer.invoke('projects:delete', index)
              navigate('/')
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="32px"
              viewBox="0 -960 960 960"
              width="32px"
              fill="red"
            >
              <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z" />
            </svg>
          </a>
        </div>
      </div>

      {/* Main content */}
      <div
        className="d-flex flex-column h-100 text-white text-center pt-2"
        style={{ float: 'none' }}
      >
        {/* Title */}
        <div className="w-100">
          <span
            role="button"
            onDoubleClick={(e) => {
              e.currentTarget.contentEditable = 'true'
              e.currentTarget.focus()
            }}
            onBlur={async (e) => {
              await changeTitle(e.currentTarget)
            }}
            onKeyDown={async (e) => {
              if (e.key === 'Enter') e.preventDefault(), await changeTitle(e.currentTarget)
            }}
            onInput={(e) => {
              if (e.currentTarget.innerText.length > 20) {
                e.currentTarget.innerText = e.currentTarget.innerText.substring(0, 20)
              }

              // keep the bar always at the end
              const range = document.createRange()
              const sel = window.getSelection()
              range.setStart(e.currentTarget.childNodes[0], e.currentTarget.innerText.length)
              range.collapse(true)

              if (sel) sel.removeAllRanges(), sel.addRange(range)
            }}
          >
            {project.title}
          </span>
        </div>

        {/* Display Messages */}
        <div className="container w-100 h-100 mt-5 overflow-y-auto" ref={containerRef}>
          {/* Messages */}
          {messages.map((message, index) => {
            if (message.role === 'user') {
              return (
                <div key={index} className="w-100 d-flex justify-content-end pt-5">
                  <MessageCard message={message.content} />
                </div>
              )
            } else if (message.role === 'info') {
              return (
                <div
                  key={index}
                  className="w-100 d-flex justify-content-center pt-5"
                  style={{ color: '#0d6efd' }}
                >
                  <span>{message.content}</span>
                </div>
              )
            } else if (message.role === 'warning') {
              return (
                <div
                  key={index}
                  className="w-100 d-flex justify-content-center flex-column pt-5"
                  style={{ color: '#fd7e14' }}
                >
                  <span>{message.content}</span>
                  <a
                    className="text-decoration-none text-decoration-underline"
                    style={{ fontSize: 11 }}
                    onClick={() => {
                      const textarea = document.querySelector('textarea')
                      textarea!.value = (textarea!.value + '\n' + message.content).trim()
                      autoExpand(textarea!)
                    }}
                  >
                    Insert at the prompt
                  </a>
                </div>
              )
            } else {
              return (
                <div key={index} className="w-100 d-flex justify-content-start pt-5">
                  <span>{message.content}</span>
                </div>
              )
            }
          })}

          {/* Progress bar when sending message */}
          {isSending && (
            <div className="w-100 d-flex justify-content-start pt-4">
              <div
                className="progress"
                role="progressbar"
                aria-label="progress bar"
                style={{ height: '15px', width: '100%' }}
              >
                <div
                  className="progress-bar progress-bar-striped progress-bar-animated"
                  style={{ width: '100%' }}
                ></div>
              </div>
            </div>
          )}
          {isExecuting && (
            <div className="w-100 d-flex justify-content-start pt-4">
              <div
                className="progress"
                role="progressbar"
                aria-label="progress bar"
                style={{ height: '15px', width: '100%' }}
              >
                <div
                  className="progress-bar progress-bar-striped progress-bar-animated bg-warning"
                  style={{ width: '100%' }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Prompt */}
        <div
          className="container w-100 rounded d-flex align-items-center position-relative"
          style={{ minHeight: '80px', backgroundColor: '#272727' }}
        >
          <div
            className="input-group p-auto position-absolute"
            style={{ bottom: '10px', backgroundColor: '#272727' }}
          >
            <textarea
              className="form-control border text-white bg-transparent invisible-scrollbar"
              aria-label="With textarea"
              id="prompt"
              style={{ maxHeight: '125px', height: '40px' }}
              onInput={(e) => autoExpand(e.currentTarget)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()

                  if (!isSending) {
                    sendMessage(e.currentTarget)
                  }
                }
              }}
            ></textarea>

            <button
              className="btn btn-outline-secondary border-white"
              type="button"
              disabled={isSending}
              onClick={() => {
                const textarea = document.querySelector('textarea')
                sendMessage(textarea!)
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default Editor
