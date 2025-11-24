import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import "./index.css";
import LoginPage from "./views/LogInPage.tsx"; // currently using HomePage as login page
import { Toaster } from "@/components/ui/sonner";

import { GoogleOAuthProvider } from "@react-oauth/google";

const GOOGLE_CLIENT_ID =
  "622761118132-r0i8qolh6dpgmovcjb2qiur4lm7mpfmq.apps.googleusercontent.com";

import { Layout } from "./components/layout/AppLayout.tsx";
import { Leaderboards } from "./components/leaderboards/Leaderboards";
import AdminDashboard  from "./views/AdminDashboardPage.tsx";
import CodingView from "./components/codingPage/CodingView.tsx";
import HomePage from "./views/HomePage.tsx";
import SignupPage from "./views/SignupPage.tsx";
import ManageCompetitions from "./components/manage-competitions/ManageCompetitionsPage.tsx";
import ErrorPage from "./components/ErrorPage.tsx";
import ManageAccountsPage from "./views/ManageAccountsPage.tsx";
import ManageAlgoTimePage from "./views/AlgoTimeSession.tsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <LoginPage />, // 👈 LoginPage loads first
  },
  {
    path: "/signup",
    element: <SignupPage />,
  },
  {
    path: "/app", // 👈 everything else under /app
    element: <Layout />,
    errorElement: <ErrorPage />,

    children: [
      {
        index: true,
        element: <Navigate to="/app/home" replace />,
      },
      {
        path: "home",
        element: (
          <div className="min-h-screen h-full">
            <HomePage />
          </div>
        ),
        handle: {
          crumb: { title: "Home Page" },
        },
      },
      {
        path: "algotime",
        element: <div>AlgoTime</div>,
        handle: {
          crumb: { title: "AlgoTime" },
        },
      },
      {
        path: "competition",
        element: <div>Competition</div>,
        handle: {
          crumb: { title: "Competition" },
        },
      },
      {
        path: "settings",
        element: <div>Settings</div>,
        handle: {
          crumb: { title: "Settings" },
        },
      },
      {
        path: "leaderboards",
        element: <Leaderboards />,
        handle: {
          crumb: { title: "Leaderboards" },
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
              crumb: { title: "Competition Leaderboard" },
            },
          },
        ],
      },
      {
        path: "dashboard",
        element: <AdminDashboard />,
        handle: {
          crumb: { title: "Admin Dashboard" }
        },
        children: [
          {
            index: true,
            element: <div>Admin Dashboard</div>,
          },
          {
            path: "competitions",
            element: <ManageCompetitions />,
            handle: {
              crumb: { title: "Manage Competitions" }
            }
          },
          {
            path: "manageAccounts",
            element: <ManageAccountsPage />,
            handle: {
              crumb: { title: "Manage Accounts" }
            }
          },
          {
            path: "algoTimeSession",
            element: <ManageAlgoTimePage />,
            handle: {
              crumb: { title: "Manage AlgoTime Sessions" }
            }
          }
        ]
      },
      {
        path: "code",
        element: <CodingView />,
        handle: {
          crumb: { title: "Coding" },
        },
      },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Toaster position="top-center" />
      <RouterProvider router={router} />
    </GoogleOAuthProvider>
  </StrictMode>
);
