import { ipcRenderer } from 'electron'

export interface Profile {
  email: string
  access_token: string
  refresh_token: string
}

export async function SignIn(): Promise<void> {
  console.log(await ipcRenderer.invoke('oauthServer'))
}

export function SignOut(): void {
  localStorage.removeItem('profile')
  window.location.reload()
}
