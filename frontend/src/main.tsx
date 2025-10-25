import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AppSidebar } from './components/app-sidebar.tsx'

const router = createBrowserRouter([
  //any page that has the layout with the header will be a child of the root
  {
    path: "/",
    element: <AppSidebar />,
    children: [
      {
        index: true,
        element: <Navigate to="/home" replace />
      },
      {
        path: "home",
        //element: <HomePage />,
      },
    ]
  },

])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <RouterProvider router={router} />
  </StrictMode>,
)
