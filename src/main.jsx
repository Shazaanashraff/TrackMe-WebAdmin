import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App.jsx'
import { ColorModeProvider } from './theme/ColorMode'
import { queryClient, persistOptions } from './lib/queryClient'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <ColorModeProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ColorModeProvider>
    </PersistQueryClientProvider>
  </StrictMode>,
)
