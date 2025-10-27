import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { Layout } from './components/layout/AppLayout.tsx'
import { AdminDashboard } from './components/dashboard/AdminDashboard'

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    handle: {
      crumb: { title: "Home" }
    },
    children: [
      {
        index: true,
        element: <Navigate to="/home" replace />
      },
      {
        path: "home",
        element: <div>Home Page</div>,        // TO BE REPLACED
        handle: {
          crumb: { title: "Home Page" }
        }
      },
      {
        path: "algotime",
        element: <div>AlgoTime</div>,        // TO BE REPLACED
        handle: {
          crumb: { title: "AlgoTime" }
        }
      },
      {
        path: "competition",
        element: <div>Competition</div>,        // TO BE REPLACED
        handle: {
          crumb: { title: "Competition" }
        }
      },
      {
        path: "settings",
        element: <div>Settings</div>,        // TO BE REPLACED
        handle: {
          crumb: { title: "Settings" }
        }
      },
      {
        path: "leaderboards",
        handle: {
          crumb: { title: "Leaderboards" }
        },
        children: [
          {
            index: true,
            element: <div>Competitions</div>,        // TO BE REPLACED
          },
          {
            path: ":competitionId",
            element: <div>Competition Leaderboard</div>,        // TO BE REPLACED
            handle: {
              crumb: { title: "Competition Leaderboard" }
            }
          }
        ]
      },
      {
        path: "dashboard",
        element: <AdminDashboard />,        
        handle: {
          crumb: { title: "Admin Dashboard" }
        }
      },
      {
        path: "admin",
        element: <AdminDashboard />,
        handle: {
          crumb: { title: "Admin Dashboard" }
        }
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