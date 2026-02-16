import { usePostHog } from "@posthog/react";

/**
 * useAnalytics
 *
 * Central hook wrapping PostHog calls for consistent, typed event tracking.
 * Import this instead of usePostHog directly so event names & properties
 * stay consistent across the app.
 *
 * Usage:
 *   const { identifyUser, trackLogin, trackSignup, ... } = useAnalytics();
 */
export function useAnalytics() {
  const posthog = usePostHog();

  // ─── Identity ────────────────────────────────────────────────────────────────

  /**
   * Call after any successful login or signup.
   * Ties all future events to this user in PostHog.
   */
  function identifyUser(user: {
    id: number | string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  }) {
    posthog.identify(String(user.id), {
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role,
    });
  }

  /**
   * Call on logout. Clears the identity so the next user starts fresh.
   */
  function resetIdentity() {
    posthog.reset();
  }

  // ─── Login ───────────────────────────────────────────────────────────────────

  function trackLoginAttempt(method: "email_password" | "google") {
    posthog.capture("login_attempted", { method });
  }

  function trackLoginSuccess(method: "email_password" | "google") {
    posthog.capture("login_success", { method });
  }

  function trackLoginFailed(method: "email_password" | "google", error?: string) {
    posthog.capture("login_failed", { method, error });
  }

  // ─── Signup ──────────────────────────────────────────────────────────────────

  function trackSignupAttempt() {
    posthog.capture("signup_attempted", { method: "email_password" });
  }

  function trackSignupSuccess() {
    posthog.capture("signup_success", { method: "email_password" });
  }

  function trackSignupFailed(error?: string) {
    posthog.capture("signup_failed", { method: "email_password", error });
  }

  // ─── Password reset ───────────────────────────────────────────────────────────

  function trackForgotPasswordRequested() {
    posthog.capture("password_reset_requested");
  }

  function trackForgotPasswordFailed(error?: string) {
    posthog.capture("password_reset_request_failed", { error });
  }

  function trackResetPasswordPageViewed(hasValidToken: boolean) {
    posthog.capture("password_reset_page_viewed", { has_valid_token: hasValidToken });
  }

  function trackResetPasswordCompleted() {
    posthog.capture("password_reset_completed");
  }

  function trackResetPasswordFailed(error?: string) {
    posthog.capture("password_reset_failed", { error });
  }

  // ─── Profile ─────────────────────────────────────────────────────────────────

  function trackProfileViewed() {
    posthog.capture("profile_viewed");
  }

  function trackProfileFieldEdited(field: "firstName" | "lastName" | "email") {
    posthog.capture("profile_field_edited", { field });
  }

  function trackProfileFieldSaved(field: "firstName" | "lastName" | "email") {
    posthog.capture("profile_field_saved", { field });
  }

  function trackProfileFieldSaveFailed(field: "firstName" | "lastName" | "email", error?: string) {
    posthog.capture("profile_field_save_failed", { field, error });
  }

  function trackChangePasswordNavigated() {
    posthog.capture("change_password_navigated");
  }

  // ─── Errors ──────────────────────────────────────────────────────────────────

  function trackPageNotFound(url: string) {
    posthog.capture("page_not_found", { url });
  }

  function trackUnauthorizedAccess(url: string) {
    posthog.capture("unauthorized_access_attempted", { url });
  }

  return {
    // identity
    identifyUser,
    resetIdentity,
    // login
    trackLoginAttempt,
    trackLoginSuccess,
    trackLoginFailed,
    // signup
    trackSignupAttempt,
    trackSignupSuccess,
    trackSignupFailed,
    // password
    trackForgotPasswordRequested,
    trackForgotPasswordFailed,
    trackResetPasswordPageViewed,
    trackResetPasswordCompleted,
    trackResetPasswordFailed,
    // profile
    trackProfileViewed,
    trackProfileFieldEdited,
    trackProfileFieldSaved,
    trackProfileFieldSaveFailed,
    trackChangePasswordNavigated,
    // errors
    trackPageNotFound,
    trackUnauthorizedAccess,
  };
}