import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import './index.css'
import LoginPage from './views/LogInPage.tsx'; // currently using HomePage as login page

import { GoogleOAuthProvider } from "@react-oauth/google";

const GOOGLE_CLIENT_ID = "622761118132-r0i8qolh6dpgmovcjb2qiur4lm7mpfmq.apps.googleusercontent.com";

import { Layout } from './components/layout/AppLayout.tsx'
import { Leaderboards } from './components/leaderboards/Leaderboards'
import { AdminDashboard } from './components/dashboard/AdminDashboard'
import SendEmailForm from './components/layout/EmailForm.tsx'
import HomePage from './views/HomePage.tsx';

const router = createBrowserRouter([
  {
    path: "/",
    element: <LoginPage />, // 👈 LoginPage loads first
  },
  {
    path: "/app", // 👈 everything else under /app
    element: <Layout />,
    handle: {
      crumb: { title: "Home" }
    },
    children: [
      {
        index: true,
        element: <Navigate to="/app/home" replace />
      },
      {
        path: "home",
        element: <div className="min-h-screen h-full"><HomePage /></div>,
        handle: {
          crumb: { title: "Home Page" }
        }
      },
      {
        path: "algotime",
        element: <div>AlgoTime</div>,
        handle: {
          crumb: { title: "AlgoTime" }
        }
      },
      {
        path: "competition",
        element: <div>Competition</div>,
        handle: {
          crumb: { title: "Competition" }
        }
      },
      {
        path: "settings",
        element: <div>Settings</div>,
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
            element: <div>Competitions</div>,
          },
          {
            path: ":competitionId",
            element: <div>Competition Leaderboard</div>,
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
    ]
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <RouterProvider router={router} />
    </GoogleOAuthProvider>
  </StrictMode>,
);
