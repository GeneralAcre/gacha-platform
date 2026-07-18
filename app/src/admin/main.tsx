import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import { AdminMatchesPage } from './AdminMatchesPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AdminMatchesPage />
  </StrictMode>,
)
