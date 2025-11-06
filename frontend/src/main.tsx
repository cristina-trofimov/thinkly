import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { Layout } from './components/layout/AppLayout.tsx'
import { Leaderboards } from './components/leaderboards/Leaderboards'
import { AdminDashboard } from './components/dashboard/AdminDashboard'
import CodingView from './components/codingPage/CodingView.tsx'
import SendEmailForm from './components/layout/EmailForm.tsx'
import  HomePage from './HomePage.tsx'
import ManageCompetitions from './components/manage-competitions/ManageCompetitionsPage.tsx'

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
        element: <div className="min-h-screen h-full"><HomePage/></div>,        // TO BE REPLACED
        handle: {
          crumb: { title: "Home Page" }
        }
      },
      {
        path: "algotime",
        element: <div>AlgoTime</div>,        // TO BE REPLACED //<SendEmailForm></SendEmailForm> To test email form
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
        element: <Leaderboards />,
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
        path: "dashboard/competitions",
        element: <ManageCompetitions />,        
        handle: {
          crumb: { title: "Manage Competitions" }
        }
      },
      {
        path: "code",
        element: <CodingView />,        
        handle: {
          crumb: { title: "Coding" }
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