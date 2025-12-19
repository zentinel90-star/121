import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css'  // ← CHANGED: Import App.css instead of index.css
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)