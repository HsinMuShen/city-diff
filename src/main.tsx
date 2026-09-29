import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'maplibre-gl/dist/maplibre-gl.css'
import './styles.css'
import App from './App'
import { ExplorerPage } from './pages/ExplorerPage'

const Page = window.location.pathname === '/explorer' ? ExplorerPage : App

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Page />
  </StrictMode>,
)
