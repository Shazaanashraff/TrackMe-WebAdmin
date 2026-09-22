import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App.jsx'
import { ColorModeProvider } from './theme/ColorMode'
import { queryClient, persistOptions } from './lib/queryClient'

// A DATA router (createBrowserRouter), not BrowserRouter. App keeps its own
// `<Routes>` tree as a descendant — this single splat route only exists to put
// the data-router context above it, which is what `useBlocker` requires.
// Without it, EnrollmentFormPage throws "useBlocker must be used within a data
// router" and the ErrorBoundary replaces the whole shell.
const router = createBrowserRouter([{ path: '*', element: <App /> }])

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <ColorModeProvider>
        <RouterProvider router={router} />
      </ColorModeProvider>
    </PersistQueryClientProvider>
  </StrictMode>,
)
