import { ipcRenderer, shell } from 'electron'
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.PRELOAD_VITE_SUPABASE_URL,
  import.meta.env.PRELOAD_VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      flowType: 'pkce'
    }
  }
)

export async function SignIn(provider: 'google' | 'github'): Promise<void> {
  const url = await ipcRenderer.invoke('oauthServer')

  // Create the auth and set the redirect to the server listener
  const { data } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      scopes: 'Profile email',
      skipBrowserRedirect: true,
      redirectTo: url
    }
  })

  // Open url in default url
  if (data.url) shell.openExternal(data.url)
}

export async function SignOut(): Promise<void> {
  await supabase.auth.signOut()
  window.location.reload()
}
