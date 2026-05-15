import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'

// Apply saved theme immediately to prevent flash
;(function () {
  try {
    const stored = localStorage.getItem('tork-theme')
    const theme = stored ? JSON.parse(stored)?.state?.theme : 'dark'
    if (theme !== 'light') document.documentElement.classList.add('dark')
  } catch {
    document.documentElement.classList.add('dark')
  }
})()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1f2937', color: '#f9fafb', border: '1px solid #374151' },
          success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </BrowserRouter>
  </StrictMode>,
)
