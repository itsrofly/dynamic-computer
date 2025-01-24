export interface Chat {
  role: 'user' | 'assistant'
  content: string
}

export interface ProjectSettings {
  file: string
  messages: Chat[]
  commits: { date: string; message: string }[]
  dependencies: string
}

export interface Project {
  title: string
  path: string // Projects/{random folder name}
  latestDate: string
}
