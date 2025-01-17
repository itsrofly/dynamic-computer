import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

export const notOpenSourceRightNow = async (): Promise<void> => {
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}
