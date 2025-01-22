import { contextBridge } from 'electron'
import { notOpenSourceRightNow } from './src/main'

// Handle splash screen
import './splashscreen'

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('notOpenSourceRightNow', notOpenSourceRightNow)
  } catch (error) {
    console.error(error)
  }
}
