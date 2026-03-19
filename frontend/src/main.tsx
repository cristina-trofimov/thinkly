import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import "./index.css";
import LoginPage from "./views/LogInPage.tsx";
import { Toaster } from "@/components/ui/sonner";
import { PostHogProvider } from '@posthog/react'
import { GoogleOAuthProvider } from "@react-oauth/google";

import { Layout } from "./components/layout/AppLayout.tsx";
import { Leaderboards } from "./components/leaderboards/Leaderboards";
import AdminDashboard from "./views/admin/AdminDashboardPage.tsx";
import CodingView from "./views/CodingView.tsx";
import HomePage from "./views/HomePage.tsx";
import CompetitionsPage from "./views/CompetitionsPage.tsx";
import SignupPage from "./views/SignupPage.tsx";
import AlgoTimePage from "./views/AlgoTimePage.tsx";
import ManageCompetitions from "./views/admin/ManageCompetitionsPage.tsx";
import CreateCompetition from "./views/admin/CreateCompetitionPage.tsx";
import ErrorPage from "./views/ErrorPage.tsx";
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
import ManageQuestionsPage from "./views/admin/ManageQuestionsPage.tsx";
import QuestionJSONEditor from "./components/manageQuestions/QuestionJSONEditor.tsx";
import { UserProvider } from "./context/UserContext.tsx";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const POSTHOG_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_PUBLIC_POSTHOG_HOST;

// PostHog configuration
const posthogOptions = {
  api_host: POSTHOG_HOST,
  // Enable session recording (optional but recommended for debugging)
  autocapture: false, // We're tracking manually, so disable autocapture
  capture_pageview: false, // We'll track page views manually via our analytics hook
  // Enable debug mode in development
  loaded: () => {
    if (import.meta.env.DEV) {
      console.log('PostHog loaded successfully');
      console.log('PostHog config:', {
        api_host: POSTHOG_HOST,
        key: POSTHOG_KEY?.substring(0, 10) + '...'
      });
    }
  },
};

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
            path: "code/:problem_title",
            element: <CodingView />,
            handle: {
              crumb: { title: "Coding" },
            },
          },
          {
            path: "comp/:comp_name",
            element: <CodingView />,
            handle: {
              crumb: { title: "Competition" },
            },
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
            path: "competitions",
            element: <CompetitionsPage />,
            handle: { crumb: { title: "Competitions" } },
          },
          {
            path: "algotime",
            element: <AlgoTimePage />,
            handle: { crumb: { title: "AlgoTime" } },
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
          {
            path: "*",
            element: <ErrorPage />,
          },
        ]
      },

      // 2. ADMIN ACCESS ONLY (Owner, Admin)
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
                path: "manageQuestions",
                element: <ManageQuestionsPage />,
                handle: { crumb: { title: "Manage Questions" } },
              },
              {
                path: "manageQuestions/editQuestion/:questionId",
                element: <QuestionJSONEditor />,
                handle: { crumb: { title: "Edit Question" } },
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
                  {
                    path: "view/:id",
                    // element: <ViewAlgotimePage />,
                    handle: {
                      crumb: { title: "View AlgoTime Session" }
                    }
                  },
                  {
                    path: "edit/:id",
                    // element: <EditAlgotimePage />,
                    handle: {
                      crumb: { title: "Edit AlgoTime Session" }
                    }
                  }
                ]
              },
            ],
          },
        ],
      },
    ],
  },
]);

// Log PostHog initialization in dev mode
if (import.meta.env.DEV) {
  console.log('Initializing PostHog with:', {
    key: POSTHOG_KEY ? 'Present' : 'Missing',
    host: POSTHOG_HOST || 'Missing',
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PostHogProvider
      apiKey={POSTHOG_KEY}
      options={posthogOptions}
    >
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <Toaster position="top-center" />
        <UserProvider>
          <RouterProvider router={router} />
        </UserProvider>
      </GoogleOAuthProvider>
    </PostHogProvider>
  </StrictMode>
);