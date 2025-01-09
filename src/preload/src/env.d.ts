/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly PRELOAD_VITE_WEBSITE: string
    // more env variables...
  }

interface ImportMeta {
    readonly env: ImportMetaEnv
}