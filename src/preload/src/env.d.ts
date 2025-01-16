/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly PRELOAD_VITE_WEBSITE: string
  readonly PRELOAD_VITE_SUPABASE_URL: string
  readonly PRELOAD_VITE_SUPABASE_ANON_KEY: string
  readonly PRELOAD_VITE_API: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
