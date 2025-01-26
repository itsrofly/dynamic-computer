/**
 * Loading and info should never be sent to the server
 */
export interface Chat {
  role: 'user' | 'assistant' | 'info' | 'warning'
  content: string
} 

export interface ProjectSettings {
  file: string
  messages: Chat[]
  commits: { date: string; message: string }[]
  dependencies: string[]
}

export interface Project {
  title: string
  path: string // Projects/{random folder name}
  latestDate: string
}
