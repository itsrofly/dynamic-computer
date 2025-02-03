import { ipcRenderer } from 'electron'
import { useEffect, useState } from 'react'

export interface packages {
  name: string
  version: string
  size: number // in MB
}

function SettingsModal(): JSX.Element {
  // Get the python packages
  const [packages, setPackages] = useState<packages[]>([])

  // Get cache size
  const [cacheSize, setCacheSize] = useState<number>(0)

  // State to check if is deleting cache
  const [deletingCache, setDeletingCache] = useState<boolean>(false)

  // State to store packages being deleted
  const [deletingPackages, setDeletingPackages] = useState<string[]>([])

  // Refresh the settings
  const [refresh, setRefresh] = useState<boolean>(false)

  // List of packages that should'nt be deleted
  const notDelete = ['pip', 'setuptools']

  useEffect(() => {
    const loadVariables = async () => {
      setPackages(await ipcRenderer.invoke('python:packages'))
      setCacheSize(await ipcRenderer.invoke('projects:getCacheSize'))
    }
    loadVariables()
  }, [refresh])
  return (
    <>
      <div
        className="modal fade"
        id="settingsModal"
        tabIndex={-1}
        aria-labelledby="settingsModalLabel"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h1 className="modal-title fs-5" id="settingsModalLabel">
                Settings
              </h1>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body flex-column d-flex p-5">
              <div className="w-100 d-flex justify-content-center flex-column">
                <h5>Packages</h5>
                <ul className="list-group w-100">
                  {packages.map((pkg) => {
                    return (
                      <li className="list-group-item d-flex flex-row justify-content-between">
                        <div className="d-flex flex-column">
                          <span>Name: {pkg.name}</span>
                          <span>Version: {pkg.version}</span>
                          <span>Size: {pkg.size} MB</span>
                        </div>
                        {!notDelete.includes(pkg.name) && ( // Only show the delete button if the package is not in the ignore list
                          <a
                            role="button"
                            style={{ cursor: deletingPackages.includes(pkg.name) ? 'wait' : 'pointer' }}
                            onClick={async () => {
                              if (deletingPackages.includes(pkg.name)) return
                              setDeletingPackages([...deletingPackages, pkg.name])
                              // Uninstall the package
                              await ipcRenderer.invoke('python:uninstall', pkg.name)
                              setRefresh(!refresh)
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
                        )}
                      </li>
                    )
                  })}
                </ul>
                <br />
                <h5>Cache</h5>
                <div className="border border-1 rounded w-100 p-3">
                  <p>Size: {cacheSize} MB</p>
                  <button
                    className="btn btn-danger w-50"
                    disabled={deletingCache}
                    onClick={async () => {
                      setDeletingCache(true)
                      await ipcRenderer.invoke('projects:clearCache')
                      setDeletingCache(false)
                      setRefresh(!refresh)
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
            <div className="modal-footer d-flex flex-column justify-content-center"></div>
          </div>
        </div>
      </div>
    </>
  )
}

export default SettingsModal
