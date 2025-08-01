import { type User } from '@supabase/supabase-js'
import { SignIn, SignOut, supabase } from '../handles/User'
import { useEffect, useState } from 'react'

function ProfileModal(): JSX.Element {
  const [user, setUser] = useState<User | null>(null)

  // get the website url from the environment variables
  const website = import.meta.env.PRELOAD_VITE_WEBSITE

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
      <div
        className="modal fade"
        id="profileModal"
        tabIndex={-1}
        aria-labelledby="profileModalLabel"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h1 className="modal-title fs-5" id="profileModalLabel">
                {user ? 'Profile' : 'Sign In'}
              </h1>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body flex-column d-flex p-5">
              {!user ? (
                // If not signed in show sign in buttons
                <>
                  <div className="w-100 d-flex justify-content-center">
                    <a
                      role="button"
                      className="d-flex justify-content-center btn btn-outline-dark icon-link"
                      style={{ width: '300px' }}
                      onClick={() => SignIn('google')}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        fill="currentColor"
                        className="bi bi-google"
                        viewBox="0 0 16 16"
                      >
                        <path d="M15.545 6.558a9.4 9.4 0 0 1 .139 1.626c0 2.434-.87 4.492-2.384 5.885h.002C11.978 15.292 10.158 16 8 16A8 8 0 1 1 8 0a7.7 7.7 0 0 1 5.352 2.082l-2.284 2.284A4.35 4.35 0 0 0 8 3.166c-2.087 0-3.86 1.408-4.492 3.304a4.8 4.8 0 0 0 0 3.063h.003c.635 1.893 2.405 3.301 4.492 3.301 1.078 0 2.004-.276 2.722-.764h-.003a3.7 3.7 0 0 0 1.599-2.431H8v-3.08z" />
                      </svg>
                      Google
                    </a>
                  </div>

                  <div className="w-100 d-flex justify-content-center">
                    <span className="m-2 text-secondary">Or</span>
                  </div>

                  <div className="w-100 d-flex justify-content-center">
                    <a
                      role="button"
                      className="d-flex justify-content-center btn btn-outline-dark icon-link"
                      style={{ width: '300px' }}
                      onClick={() => SignIn('github')}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        fill="currentColor"
                        className="bi bi-github"
                        viewBox="0 0 16 16"
                      >
                        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8" />
                      </svg>
                      Github
                    </a>
                  </div>
                </>
              ) : (
                // If signed in show profile info and (manage, sign out) buttons
                <>
                  <div className="w-100 d-flex flex-column justify-content-center align-items-center mb-3">
                    <img
                      src={user.user_metadata.avatar_url}
                      alt="mdo"
                      width="64"
                      height="64"
                      className="rounded-circle"
                    />
                    <br />
                    <span>{user.user_metadata.full_name || user.user_metadata.name}</span>
                  </div>
                  
                  <div className="w-100 d-flex justify-content-center gap-3 mt-2">
                    <a
                      role="button"
                      className="btn btn-outline-primary"
                      target="_blank"
                      href={website + '/Profile'}
                      rel="noreferrer"
                    >
                      Manage
                    </a>

                    <a role="button" className="btn btn-outline-danger" onClick={SignOut}>
                      Sign Out
                    </a>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer d-flex flex-column justify-content-center">
              <div className="d-flex justify-content-between gap-5">
                <a
                  className="nav-link"
                  href={website + '/Privacy'}
                  target="_blank"
                  style={{ display: 'inline' }}
                  rel="noreferrer"
                >
                  <h6 style={{ display: 'inline' }}>Privacy Policy</h6>
                </a>

                <a
                  className="nav-link"
                  href={website + '/Terms'}
                  target="_blank"
                  style={{ display: 'inline' }}
                  rel="noreferrer"
                >
                  <h6 style={{ display: 'inline' }}>Terms of Service</h6>
                </a>
              </div>
              <div className="mt-2 text-secondary">@Dynamicc - All rights reserved.</div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default ProfileModal
