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
import AdminDashboard from "./views/admin/AdminDashboardPage.tsx";
import CodingView from "./components/codingPage/CodingView.tsx";
import HomePage from "./views/HomePage.tsx";
import SignupPage from "./views/SignupPage.tsx";
import ManageCompetitions from "./views/admin/ManageCompetitionsPage.tsx";
import CreateCompetition from "./views/admin/CreateCompetitionPage.tsx";
import ErrorPage from "./components/ErrorPage.tsx";
import ManageAccountsPage from "./views/admin/ManageAccountsPage.tsx";
import ManageAlgotimeSessionsPage from "./views/admin/ManageAlgotimeSessionsPage.tsx";
import ManageAlgoTimePage from "./views/admin/AlgoTimeSession.tsx";
import ForgotPasswordForm from "./components/forms/ForgotPasswordForm.tsx";
import ResetPasswordForm from "./components/forms/ResetPasswordForm";
import ManageRiddles from "./views/admin/ManageRiddlePage.tsx";
import ProfilePage from "./views/ProfilePage.tsx";
import ChangePasswordPage from "./views/ChangePasswordPage.tsx";
import Unauthorized from "./views/Unauthorized.tsx";
import ProtectedRoute from "./components/helpers/ProtectedRoute.tsx";

const router = createBrowserRouter([
  // --- PUBLIC ROUTES ---
  {
    path: "/",
    element: <LoginPage />,
  },
  {
    path: "/signup",
    element: <SignupPage />,
  },
  {
    path: "/forgot-password",
    element: <ForgotPasswordForm />,
  },
  {
    path: "/reset-password",
    element: <ResetPasswordForm />,
  },
  {
    path: "/unauthorized",
    element: <Unauthorized />,
  },

  // --- PROTECTED ROUTES ---
  {
    path: "/app",
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [

      {
        element: <ProtectedRoute allowedRoles={["participant", "owner", "admin"]} />,
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
            handle: { crumb: { title: "Home Page" } },
          },
          {
            path: "code",
            element: <CodingView />,
            handle: { crumb: { title: "Coding" } },
          },
          {
            path: "leaderboards",
            element: <Leaderboards />,
            handle: { crumb: { title: "Leaderboards" } },
            children: [
              { index: true, element: <div>Competitions</div> },
              {
                path: ":competitionId",
                element: <div>Competition Leaderboard</div>,
                handle: { crumb: { title: "Competition Leaderboard" } },
              },
            ],
          },
          {
            path: "profile",
            element: <ProfilePage />,
            handle: { crumb: { title: "Profile" } },
            children: [
              {
                path: "changePassword",
                element: <ChangePasswordPage />,
                handle: { crumb: { title: "Change Password" } },
              },
            ],
          },
        ]
      },

      // 2. ADMIN ACCESS ONLY (Owner, Admin)
      // If a 'participant' tries to go here, they get sent to /unauthorized
      {
        element: <ProtectedRoute allowedRoles={["owner", "admin"]} />,
        children: [
          {
            path: "dashboard",
            element: <AdminDashboard />,
            handle: { crumb: { title: "Admin Dashboard" } },
            children: [
              { index: true, element: <div>Admin Dashboard Overview</div> },
              {
                path: "competitions",
                element: <ManageCompetitions />,
                handle: { crumb: { title: "Manage Competitions" } },
                children: [
                  {
                    path: "createCompetition",
                    element: <CreateCompetition />,
                    handle: { crumb: { title: "Create Competition" } },
                  },
                ],
              },
              {
                path: "manageAccounts",
                element: <ManageAccountsPage />,
                handle: { crumb: { title: "Manage Accounts" } },
              },
              {
                path: "manageRiddles",
                element: <ManageRiddles />,
                handle: { crumb: { title: "Manage Riddles" } },
              },
              {
                path: "algoTimeSessions",
                element: <ManageAlgotimeSessionsPage />,
                handle: {
                  crumb: { title: "Manage Algotime Sessions" }
                },
                children: [
                  {
                    path: "algoTimeSessionsManagement",
                    element: <ManageAlgoTimePage />,
                    handle: {
                      crumb: { title: "Create AlgoTime Session" }
                    }
                  },
                ]
              },
            ],
          },
        ],
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
