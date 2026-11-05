import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { initializePlatformStorage } from './utils/initializePlatformStorage'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('TaskNest root element was not found.')
}

const root = createRoot(rootElement)

function showStartupError(error: unknown) {
  console.error('TaskNest could not initialize local storage:', error)
  root.render(
    <main style={{ maxWidth: 560, margin: '12vh auto', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1>TaskNest could not start</h1>
      <p>TaskNest could not open its local database. Your saved data has not been intentionally cleared.</p>
      <p>Please restart the app. If the problem continues, contact support before reinstalling the app.</p>
    </main>,
  )
}

async function startApp() {
  try {
    await initializePlatformStorage()
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  } catch (error) {
    showStartupError(error)
  }
}

void startApp()
