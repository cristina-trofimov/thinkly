import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock, patch

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_email(
    email_id: int = 1,
    to: str = "all",
    subject: str = "Test Subject",
    body: str = "Test body",
    time_24h_before=None,
    time_5min_before=None,
    other_time=None,
):
    email = MagicMock()
    email.email_id = email_id
    email.to = to
    email.subject = subject
    email.body = body
    email.time_24h_before = time_24h_before
    email.time_5min_before = time_5min_before
    email.other_time = other_time
    return email


NOW = datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
PAST = NOW - timedelta(hours=1)
FUTURE = NOW + timedelta(hours=1)

# ---------------------------------------------------------------------------
# Patch targets
# ---------------------------------------------------------------------------
MOD = "src.email_scheduler"
PATCH_BREVO = f"{MOD}.send_email_via_brevo"
PATCH_SESSION = f"{MOD}.SessionLocal"
PATCH_CE_MODEL = f"{MOD}.CompetitionEmail"
PATCH_RESOLVE = f"{MOD}.resolve_email_recipients"
PATCH_SEND_REM = f"{MOD}._send_reminder"
PATCH_LOGGER = f"{MOD}.logger"


def _make_competition_email_mock():
    """
    Create a CompetitionEmail mock whose column attributes support comparison
    with datetime objects.

    Root cause: ``MagicMock() <= datetime`` raises TypeError because Python's
    comparison protocol falls through to ``datetime.__ge__(MagicMock())``, which
    is unsupported.  Overriding ``__le__`` at the *class* level (not the
    instance) prevents this and lets the SQLAlchemy-style filter expression
    ``CompetitionEmail.time_24h_before <= now`` evaluate without error.
    """
    mock_ce = MagicMock()
    for attr_name in ["time_24h_before", "time_5min_before", "other_time"]:
        col_mock = MagicMock()
        type(col_mock).__le__ = MagicMock(return_value=MagicMock())
        setattr(mock_ce, attr_name, col_mock)
    return mock_ce


# ---------------------------------------------------------------------------
# Tests for _send_reminder
# ---------------------------------------------------------------------------

class TestSendReminder:

    def test_calls_brevo_with_correct_args(self):
        with patch(PATCH_BREVO) as mock_brevo:
            from backend.src.services.email_scheduler import _send_reminder
            _send_reminder(1, ["a@b.com"], "Subject", "Body")
            mock_brevo.assert_called_once_with(to=["a@b.com"], subject="Subject", text="Body")

    def test_logs_error_on_exception(self):
        with patch(PATCH_BREVO, side_effect=Exception("boom")), \
             patch(PATCH_LOGGER) as mock_logger:
            from backend.src.services.email_scheduler import _send_reminder
            _send_reminder(42, ["a@b.com"], "Subject", "Body")
            mock_logger.error.assert_called_once()
            assert "42" in mock_logger.error.call_args[0][0]

    def test_does_not_raise_on_brevo_failure(self):
        with patch(PATCH_BREVO, side_effect=RuntimeError("network")):
            from backend.src.services.email_scheduler import _send_reminder
            _send_reminder(1, ["a@b.com"], "Subject", "Body")  # must not raise

    def test_logs_error_message_contains_exception_text(self):
        with patch(PATCH_BREVO, side_effect=Exception("smtp timeout")), \
             patch(PATCH_LOGGER) as mock_logger:
            from backend.src.services.email_scheduler import _send_reminder
            _send_reminder(7, ["x@y.com"], "Sub", "Body")
            error_msg = mock_logger.error.call_args[0][0]
            assert "smtp timeout" in error_msg


# ---------------------------------------------------------------------------
# Tests for _process_email
# ---------------------------------------------------------------------------

class TestProcessEmail:

    def _run(self, email, recipients=None, now=None):
        from backend.src.services.email_scheduler import _process_email
        _process_email(
            email,
            recipients if recipients is not None else ["r@example.com"],
            now or NOW,
        )

    def test_sends_24h_reminder_when_due(self):
        email = _make_email(time_24h_before=PAST)
        with patch(PATCH_SEND_REM) as mock_send:
            self._run(email)
            mock_send.assert_called_once()
            assert "[24h Reminder]" in mock_send.call_args[0][2]

    def test_nulls_24h_after_send(self):
        email = _make_email(time_24h_before=PAST)
        with patch(PATCH_SEND_REM):
            self._run(email)
        assert email.time_24h_before is None

    def test_skips_24h_reminder_when_not_due(self):
        email = _make_email(time_24h_before=FUTURE)
        with patch(PATCH_SEND_REM) as mock_send:
            self._run(email)
            mock_send.assert_not_called()

    def test_sends_5min_reminder_when_due(self):
        email = _make_email(time_5min_before=PAST)
        with patch(PATCH_SEND_REM) as mock_send:
            self._run(email)
            mock_send.assert_called_once()
            assert "[5min Reminder]" in mock_send.call_args[0][2]

    def test_nulls_5min_after_send(self):
        email = _make_email(time_5min_before=PAST)
        with patch(PATCH_SEND_REM):
            self._run(email)
        assert email.time_5min_before is None

    def test_skips_5min_reminder_when_not_due(self):
        email = _make_email(time_5min_before=FUTURE)
        with patch(PATCH_SEND_REM) as mock_send:
            self._run(email)
            mock_send.assert_not_called()

    def test_sends_custom_reminder_when_due(self):
        email = _make_email(other_time=PAST, subject="Custom")
        with patch(PATCH_SEND_REM) as mock_send:
            self._run(email)
            mock_send.assert_called_once()
            assert mock_send.call_args[0][2] == "Custom"

    def test_nulls_other_time_after_send(self):
        email = _make_email(other_time=PAST)
        with patch(PATCH_SEND_REM):
            self._run(email)
        assert email.other_time is None

    def test_sends_all_three_reminders_when_all_due(self):
        email = _make_email(time_24h_before=PAST, time_5min_before=PAST, other_time=PAST)
        with patch(PATCH_SEND_REM) as mock_send:
            self._run(email)
            assert mock_send.call_count == 3

    def test_no_send_when_nothing_due(self):
        email = _make_email()  # all timestamps None
        with patch(PATCH_SEND_REM) as mock_send:
            self._run(email)
            mock_send.assert_not_called()

    def test_skips_send_if_recipients_empty_but_does_not_raise(self):
        email = _make_email(time_24h_before=PAST)
        with patch(PATCH_SEND_REM) as mock_send:
            self._run(email, recipients=[])
            mock_send.assert_called_once()

    def test_24h_subject_prefix_includes_original_subject(self):
        email = _make_email(time_24h_before=PAST, subject="Finals Today")
        with patch(PATCH_SEND_REM) as mock_send:
            self._run(email)
            subject_arg = mock_send.call_args[0][2]
            assert "Finals Today" in subject_arg

    def test_5min_subject_prefix_includes_original_subject(self):
        email = _make_email(time_5min_before=PAST, subject="Finals Today")
        with patch(PATCH_SEND_REM) as mock_send:
            self._run(email)
            assert "Finals Today" in mock_send.call_args[0][2]

    def test_send_reminder_receives_correct_body(self):
        email = _make_email(time_24h_before=PAST, body="Join at zoom.us/abc")
        with patch(PATCH_SEND_REM) as mock_send:
            self._run(email)
            body_arg = mock_send.call_args[0][3]
            assert body_arg == "Join at zoom.us/abc"

    def test_timestamps_not_modified_when_not_due(self):
        email = _make_email(time_24h_before=FUTURE, time_5min_before=FUTURE)
        with patch(PATCH_SEND_REM):
            self._run(email)
        assert email.time_24h_before == FUTURE
        assert email.time_5min_before == FUTURE

    def test_only_due_timestamps_are_nulled(self):
        """Only the past timestamp is cleared; the future one stays intact."""
        email = _make_email(time_24h_before=PAST, time_5min_before=FUTURE)
        with patch(PATCH_SEND_REM):
            self._run(email)
        assert email.time_24h_before is None
        assert email.time_5min_before == FUTURE


# ---------------------------------------------------------------------------
# Tests for run_scheduled_emails
# ---------------------------------------------------------------------------

class TestRunScheduledEmails:

    def _make_db(self, emails=None):
        mock_db = MagicMock()
        mock_db.query.return_value.filter.return_value.all.return_value = emails or []
        return mock_db

    # FIX: use _make_competition_email_mock() so that
    #   ``CompetitionEmail.time_24h_before <= now``
    # does not raise TypeError, which was silently caught by the except-block
    # causing db.commit() to never be reached.

    def test_commits_when_emails_processed(self):
        email = _make_email(time_24h_before=PAST)
        mock_db = self._make_db(emails=[email])

        with patch(PATCH_SESSION, return_value=mock_db), \
             patch(PATCH_CE_MODEL, _make_competition_email_mock()), \
             patch(PATCH_RESOLVE, return_value=["r@example.com"]), \
             patch(PATCH_SEND_REM):
            from backend.src.services.email_scheduler import run_scheduled_emails
            run_scheduled_emails()

        mock_db.commit.assert_called_once()

    def test_closes_db_on_success(self):
        mock_db = self._make_db()

        with patch(PATCH_SESSION, return_value=mock_db), \
             patch(PATCH_CE_MODEL, _make_competition_email_mock()), \
             patch(PATCH_RESOLVE, return_value=[]):
            from backend.src.services.email_scheduler import run_scheduled_emails
            run_scheduled_emails()

        mock_db.close.assert_called_once()

    def test_rollback_and_close_on_exception(self):
        mock_db = MagicMock()
        mock_db.query.side_effect = Exception("DB error")

        with patch(PATCH_SESSION, return_value=mock_db), \
             patch(PATCH_CE_MODEL, _make_competition_email_mock()):
            from backend.src.services.email_scheduler import run_scheduled_emails
            run_scheduled_emails()  # must not raise

        mock_db.rollback.assert_called_once()
        mock_db.close.assert_called_once()

    def test_logs_warning_for_no_recipients(self):
        email = _make_email(time_24h_before=PAST)
        mock_db = self._make_db(emails=[email])

        with patch(PATCH_SESSION, return_value=mock_db), \
             patch(PATCH_CE_MODEL, _make_competition_email_mock()), \
             patch(PATCH_RESOLVE, return_value=[]), \
             patch(PATCH_LOGGER) as mock_logger, \
             patch(PATCH_SEND_REM):
            from backend.src.services.email_scheduler import run_scheduled_emails
            run_scheduled_emails()

        mock_logger.warning.assert_called_once()

    def test_no_emails_due_does_nothing(self):
        mock_db = self._make_db(emails=[])

        with patch(PATCH_SESSION, return_value=mock_db), \
             patch(PATCH_CE_MODEL, _make_competition_email_mock()), \
             patch(PATCH_RESOLVE, return_value=["r@example.com"]), \
             patch(PATCH_SEND_REM) as mock_send:
            from backend.src.services.email_scheduler import run_scheduled_emails
            run_scheduled_emails()

        mock_send.assert_not_called()
        mock_db.commit.assert_called_once()

    def test_processes_multiple_emails(self):
        emails = [_make_email(email_id=i, time_24h_before=PAST) for i in range(3)]
        mock_db = self._make_db(emails=emails)

        with patch(PATCH_SESSION, return_value=mock_db), \
             patch(PATCH_CE_MODEL, _make_competition_email_mock()), \
             patch(PATCH_RESOLVE, return_value=["r@example.com"]), \
             patch(PATCH_SEND_REM) as mock_send:
            from backend.src.services.email_scheduler import run_scheduled_emails
            run_scheduled_emails()

        assert mock_send.call_count == 3

    def test_close_is_called_even_on_exception(self):
        """finally block always closes db, even when commit raises."""
        email = _make_email(time_24h_before=PAST)
        mock_db = self._make_db(emails=[email])
        mock_db.commit.side_effect = Exception("commit failed")

        with patch(PATCH_SESSION, return_value=mock_db), \
             patch(PATCH_CE_MODEL, _make_competition_email_mock()), \
             patch(PATCH_RESOLVE, return_value=["r@example.com"]), \
             patch(PATCH_SEND_REM):
            from backend.src.services.email_scheduler import run_scheduled_emails
            run_scheduled_emails()

        mock_db.close.assert_called_once()

    def test_does_not_raise_when_resolve_returns_empty(self):
        email = _make_email(time_5min_before=PAST)
        mock_db = self._make_db(emails=[email])

        with patch(PATCH_SESSION, return_value=mock_db), \
             patch(PATCH_CE_MODEL, _make_competition_email_mock()), \
             patch(PATCH_RESOLVE, return_value=[]), \
             patch(PATCH_SEND_REM), \
             patch(PATCH_LOGGER):
            from backend.src.services.email_scheduler import run_scheduled_emails
            run_scheduled_emails()  # must not raise