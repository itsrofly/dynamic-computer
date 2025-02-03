import { Dispatch, SetStateAction, useEffect, useState } from 'react'
import { SignOut, supabase } from '../handles/User'
import { User } from '@supabase/supabase-js'

function Topbar({ setFilter }: { setFilter: Dispatch<SetStateAction<string>> }): JSX.Element {
  const [user, setUser] = useState<User | null>(null)

  // get the website url from the environment variables
  // const website = import.meta.env.PRELOAD_VITE_WEBSITE
  useEffect(() => {
    const loadSync = async (): Promise<void> => {
      const {
        data: { user }
      } = await supabase.auth.getUser()
      setUser(user)
    }
    loadSync()
  }, [])

  return (
    <>
      <div className="d-flex justify-content-around mt-5 mb-5 text-white">
        <div>
          {/* Let's remove the logo for now
          <a
            role="button"
            target="_blank"
            href={website}
            className="text-white  link-underline link-underline-opacity-0"
            rel="noreferrer"
          >
            Dynamic<span style={{ color: '#5FB2FF' }}>C</span>
          </a> 
          */}
        </div>

        <div>
          <input
            id="searchBar"
            className="form-control border-white border-2 bg-transparent text-white"
            placeholder="Search"
            type="text"
            style={{ width: '500px' }}
            onInput={(ev) => {
              setFilter(ev.currentTarget.value)
            }}
          />
        </div>

        <div className="dropdown text-end">
          <a
            role="button"
            className="d-block link-body-emphasis text-decoration-none dropdown-toggle"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            {user ? (
              <img
                src={user.user_metadata.avatar_url}
                alt="mdo"
                width="36"
                height="36"
                className="rounded-circle"
              />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="36"
                viewBox="0 -960 960 960"
                width="36"
                fill="#e8eaed"
              >
                <path d="M400-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM80-160v-112q0-33 17-62t47-44q51-26 115-44t141-18h14q6 0 12 2-8 18-13.5 37.5T404-360h-4q-71 0-127.5 18T180-306q-9 5-14.5 14t-5.5 20v32h252q6 21 16 41.5t22 38.5H80Zm560 40-12-60q-12-5-22.5-10.5T584-204l-58 18-40-68 46-40q-2-14-2-26t2-26l-46-40 40-68 58 18q11-8 21.5-13.5T628-460l12-60h80l12 60q12 5 22.5 11t21.5 15l58-20 40 70-46 40q2 12 2 25t-2 25l46 40-40 68-58-18q-11 8-21.5 13.5T732-180l-12 60h-80Zm40-120q33 0 56.5-23.5T760-320q0-33-23.5-56.5T680-400q-33 0-56.5 23.5T600-320q0 33 23.5 56.5T680-240ZM400-560q33 0 56.5-23.5T480-640q0-33-23.5-56.5T400-720q-33 0-56.5 23.5T320-640q0 33 23.5 56.5T400-560Zm0-80Zm12 400Z" />
              </svg>
            )}
          </a>
          <ul className="dropdown-menu text-small">
            <li>
              <a
                className="dropdown-item"
                href="#"
                data-bs-toggle="modal"
                data-bs-target="#profileModal"
              >
                Profile
              </a>
            </li>

            <li>
              <a
                className="dropdown-item"
                href="#"
                data-bs-toggle="modal"
                data-bs-target="#settingsModal"
              >
                Settings
              </a>
            </li>

            {user && (
              <>
                <li>
                  <hr className="dropdown-divider" />
                </li>
                <li>
                  <a className="dropdown-item" href="#" onClick={SignOut}>
                    Sign Out
                  </a>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </>
  )
}

export default Topbar
