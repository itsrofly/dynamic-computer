export interface Profile {
  email: string
  access_token: string
  refresh_token: string
}

export function SignIn(): void {
  localStorage.setItem(
    'profile',
    JSON.stringify({
      email: 'mitangerofly@gmail.com',
      access_token: 'token',
      refresh_token: 'token'
    })
  )
  window.location.reload()
}

export function SignOut(): void {
  localStorage.removeItem('profile')
  window.location.reload()
}
