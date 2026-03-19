import type { Language } from "@/types/questions/Language.type";
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

  // ─── Homepage ─────────────────────────────────────────────────────────────────

  function trackHomepageViewed() {
    posthog.capture("homepage_viewed");
  }

  function trackCalendarDateSelected(date: string, competitionCount: number) {
    posthog.capture("calendar_date_selected", { date, competition_count: competitionCount });
  }

  function trackCompetitionItemClicked(competitionTitle: string, date: string) {
    posthog.capture("homepage_competition_clicked", { competition_title: competitionTitle, date });
  }

  // ─── Question table ───────────────────────────────────────────────────────────

  function trackQuestionClicked(questionTitle: string, difficulty: string, questionId: number) {
    posthog.capture("question_clicked", {
      question_title: questionTitle,
      difficulty,
      question_id: questionId,
    });
  }

  function trackQuestionSearched(query: string) {
    posthog.capture("question_searched", { query });
  }

  function trackQuestionFilteredByDifficulty(difficulty: string | undefined) {
    posthog.capture("question_filtered_by_difficulty", {
      difficulty: difficulty ?? "all",
    });
  }

  // ─── Leaderboards ────────────────────────────────────────────────────────────

  function trackLeaderboardViewed(type: "algotime" | "competition") {
    posthog.capture("leaderboard_viewed", { type });
  }

  function trackLeaderboardTabSwitched(to: "algotime" | "competition") {
    posthog.capture("leaderboard_tab_switched", { to });
  }

  function trackLeaderboardSearched(query: string) {
    posthog.capture("leaderboard_competition_searched", { query });
  }

  function trackLeaderboardSortChanged(direction: "asc" | "desc") {
    posthog.capture("leaderboard_sort_changed", { direction });
  }

  function trackCompetitionCardToggled(
    competitionTitle: string,
    action: "expanded" | "collapsed",
    isCurrent: boolean
  ) {
    posthog.capture("competition_card_toggled", {
      competition_title: competitionTitle,
      action,
      is_current: isCurrent,
    });
  }

  function trackLeaderboardCopied(
    type: "algotime" | "competition",
    competitionTitle?: string
  ) {
    posthog.capture("leaderboard_copied", {
      type,
      competition_title: competitionTitle,
    });
  }

  function trackLeaderboardDownloaded(
    type: "algotime" | "competition",
    competitionTitle?: string
  ) {
    posthog.capture("leaderboard_downloaded", {
      type,
      competition_title: competitionTitle,
    });
  }

  function trackCurrentLeaderboardViewed(competitionName: string) {
    posthog.capture("current_leaderboard_viewed", { competition_name: competitionName });
  }

  // ─── Coding page ─────────────────────────────────────────────────────────────

  function trackCodingPageOpened(questionTitle: string, questionId: number, difficulty: string) {
    posthog.capture("coding_page_opened", {
      question_title: questionTitle,
      question_id: questionId,
      difficulty,
    });
  }

  function trackLanguageChanged(
    questionId: number | undefined,
    fromLanguage: Language | null,
    toLanguage: Language | undefined
  ) {
    if (!questionId || !fromLanguage || !toLanguage) return
    posthog.capture("coding_language_changed", {
      question_id: questionId,
      from_language: fromLanguage,
      to_language: toLanguage,
    });
  }

  function trackCodeReset(questionId: number | undefined, language: Language | undefined) {
    if (!questionId || !language) return
    posthog.capture("coding_code_reset", {
      question_id: questionId,
      language,
    });
  }

  function trackCodeRun(
    questionId: number | undefined,
    language: Language | undefined,
    status: string,
    passed: boolean,
    executionTimeSeconds?: string
  ) {
    if (!language || !questionId) return
    posthog.capture("coding_code_run", {
      question_id: questionId,
      language,
      status,
      passed,
      execution_time_seconds: executionTimeSeconds,
    });
  }

  function trackCodeSubmitted(questionId: number | undefined, language: Language | undefined) {
    if (!questionId || !language) return
    posthog.capture("coding_code_submitted", {
      question_id: questionId,
      language,
    });
  }

  function trackCodingTabSwitched(
    questionId: number,
    tab: "description" | "submissions" | "leaderboard"
  ) {
    posthog.capture("coding_tab_switched", {
      question_id: questionId,
      tab,
    });
  }

  function trackTestcaseAdded(questionId: number) {
    posthog.capture("coding_testcase_added", { question_id: questionId });
  }

  function trackTestcaseRemoved(questionId: number) {
    posthog.capture("coding_testcase_removed", { question_id: questionId });
  }

  // ─── Admin dashboard ─────────────────────────────────────────────────────────

  function trackAdminDashboardViewed() {
    posthog.capture("admin_dashboard_viewed");
  }

  function trackAdminDashboardTabSwitched(to: "algotime" | "competitions") {
    posthog.capture("admin_dashboard_tab_switched", { to });
  }

  function trackAdminDashboardTimeRangeChanged(timeRange: string) {
    posthog.capture("admin_dashboard_time_range_changed", { time_range: timeRange });
  }

  function trackAdminManageCardClicked(section: string) {
    posthog.capture("admin_manage_card_clicked", { section });
  }

  // ─── Admin: competitions ──────────────────────────────────────────────────────

  function trackAdminCompetitionsViewed() {
    posthog.capture("admin_competitions_viewed");
  }

  function trackAdminCompetitionSearched(query: string) {
    posthog.capture("admin_competition_searched", { query });
  }

  function trackAdminCompetitionFilterChanged(status: string) {
    posthog.capture("admin_competition_filter_changed", { status });
  }

  function trackAdminCompetitionCreateNavigated() {
    posthog.capture("admin_competition_create_navigated");
  }

  function trackAdminCompetitionEditOpened(competitionId: number, competitionTitle: string) {
    posthog.capture("admin_competition_edit_opened", {
      competition_id: competitionId,
      competition_title: competitionTitle,
    });
  }

  function trackAdminCompetitionEditSuccess(competitionId: number) {
    posthog.capture("admin_competition_edit_success", { competition_id: competitionId });
  }

  function trackAdminCompetitionEditFailed(competitionId: number, error?: string) {
    posthog.capture("admin_competition_edit_failed", { competition_id: competitionId, error });
  }

  function trackAdminCompetitionDeleteAttempted(competitionId: number, competitionTitle: string) {
    posthog.capture("admin_competition_delete_attempted", {
      competition_id: competitionId,
      competition_title: competitionTitle,
    });
  }

  function trackAdminCompetitionDeleteSuccess(competitionId: number, competitionTitle: string) {
    posthog.capture("admin_competition_delete_success", {
      competition_id: competitionId,
      competition_title: competitionTitle,
    });
  }

  function trackAdminCompetitionDeleteFailed(competitionId: number, error?: string) {
    posthog.capture("admin_competition_delete_failed", { competition_id: competitionId, error });
  }

  function trackAdminCompetitionCreateSuccess(competitionTitle: string) {
    posthog.capture("admin_competition_create_success", { competition_title: competitionTitle });
  }

  function trackAdminCompetitionCreateFailed(error?: string) {
    posthog.capture("admin_competition_create_failed", { error });
  }

  // ─── Admin: algotime ─────────────────────────────────────────────────────────

  function trackAdminAlgotimeSessionsViewed() {
    posthog.capture("admin_algotime_sessions_viewed");
  }

  function trackAdminAlgotimeSearched(query: string) {
    posthog.capture("admin_algotime_searched", { query });
  }

  function trackAdminAlgotimeCreateNavigated() {
    posthog.capture("admin_algotime_create_navigated");
  }

  function trackAdminAlgotimeCreatePageViewed() {
    posthog.capture("admin_algotime_create_page_viewed");
  }

  // ─── Admin: riddles ───────────────────────────────────────────────────────────

  function trackAdminRiddlesViewed() {
    posthog.capture("admin_riddles_viewed");
  }

  function trackAdminRiddleSearched(query: string) {
    posthog.capture("admin_riddle_searched", { query });
  }

  function trackAdminRiddleCreateOpened() {
    posthog.capture("admin_riddle_create_opened");
  }

  function trackAdminRiddleCreateSuccess() {
    posthog.capture("admin_riddle_create_success");
  }

  function trackAdminRiddleEditOpened(riddleId: number) {
    posthog.capture("admin_riddle_edit_opened", { riddle_id: riddleId });
  }

  function trackAdminRiddleEditSuccess(riddleId: number) {
    posthog.capture("admin_riddle_edit_success", { riddle_id: riddleId });
  }

  function trackAdminRiddleDeleteAttempted(riddleId: number) {
    posthog.capture("admin_riddle_delete_attempted", { riddle_id: riddleId });
  }

  function trackAdminRiddleDeleteSuccess(riddleId: number) {
    posthog.capture("admin_riddle_delete_success", { riddle_id: riddleId });
  }

  function trackAdminRiddleDeleteFailed(riddleId: number, error?: string) {
    posthog.capture("admin_riddle_delete_failed", { riddle_id: riddleId, error });
  }

  // ─── Admin: accounts ─────────────────────────────────────────────────────────

  function trackAdminAccountsViewed(accountCount: number) {
    posthog.capture("admin_accounts_viewed", { account_count: accountCount });
  }

  function trackAdminAccountsBatchDeleted(count: number) {
    posthog.capture("admin_accounts_batch_deleted", { count });
  }

  function trackAdminAccountUpdated(userId: number, role: string) {
    posthog.capture("admin_account_updated", { user_id: userId, role });
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
    // homepage
    trackHomepageViewed,
    trackCalendarDateSelected,
    trackCompetitionItemClicked,
    // question table
    trackQuestionClicked,
    trackQuestionSearched,
    trackQuestionFilteredByDifficulty,
    // leaderboards
    trackLeaderboardViewed,
    trackLeaderboardTabSwitched,
    trackLeaderboardSearched,
    trackLeaderboardSortChanged,
    trackCompetitionCardToggled,
    trackLeaderboardCopied,
    trackLeaderboardDownloaded,
    trackCurrentLeaderboardViewed,
    // coding page
    trackCodingPageOpened,
    trackLanguageChanged,
    trackCodeReset,
    trackCodeRun,
    trackCodeSubmitted,
    trackCodingTabSwitched,
    trackTestcaseAdded,
    trackTestcaseRemoved,
    // admin dashboard
    trackAdminDashboardViewed,
    trackAdminDashboardTabSwitched,
    trackAdminDashboardTimeRangeChanged,
    trackAdminManageCardClicked,
    // admin: competitions
    trackAdminCompetitionsViewed,
    trackAdminCompetitionSearched,
    trackAdminCompetitionFilterChanged,
    trackAdminCompetitionCreateNavigated,
    trackAdminCompetitionEditOpened,
    trackAdminCompetitionEditSuccess,
    trackAdminCompetitionEditFailed,
    trackAdminCompetitionDeleteAttempted,
    trackAdminCompetitionDeleteSuccess,
    trackAdminCompetitionDeleteFailed,
    trackAdminCompetitionCreateSuccess,
    trackAdminCompetitionCreateFailed,
    // admin: algotime
    trackAdminAlgotimeSessionsViewed,
    trackAdminAlgotimeSearched,
    trackAdminAlgotimeCreateNavigated,
    trackAdminAlgotimeCreatePageViewed,
    // admin: riddles
    trackAdminRiddlesViewed,
    trackAdminRiddleSearched,
    trackAdminRiddleCreateOpened,
    trackAdminRiddleCreateSuccess,
    trackAdminRiddleEditOpened,
    trackAdminRiddleEditSuccess,
    trackAdminRiddleDeleteAttempted,
    trackAdminRiddleDeleteSuccess,
    trackAdminRiddleDeleteFailed,
    // admin: accounts
    trackAdminAccountsViewed,
    trackAdminAccountsBatchDeleted,
    trackAdminAccountUpdated,
    // errors
    trackPageNotFound,
    trackUnauthorizedAccess,
  };
}