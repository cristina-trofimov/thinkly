import pytest
import asyncio
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

MOD = "backend.src.services.email_scheduler"
PATCH_BREVO = f"{MOD}.send_email_via_brevo"
PATCH_SESSION = f"{MOD}.SessionLocal"
PATCH_CE_MODEL = f"{MOD}.CompetitionEmail"
PATCH_RESOLVE = f"{MOD}.resolve_email_recipients"
PATCH_SEND_REM = f"{MOD}._send_reminder"
PATCH_LOGGER = f"{MOD}.logger"


# ---------------------------------------------------------------------------
# Tests for _send_reminder (ASYNC)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestSendReminder:

    async def test_calls_brevo_once_per_recipient(self):
        with patch(PATCH_BREVO) as mock_brevo:
            from backend.src.services.email_scheduler import _send_reminder
            await _send_reminder(1, ["a@b.com", "c@d.com"], "Subject", "Body")

            assert mock_brevo.call_count == 2

    async def test_returns_true_when_one_succeeds(self):
        calls = [Exception("fail"), None]

        with patch(PATCH_BREVO, side_effect=calls), patch(PATCH_LOGGER):
            from backend.src.services.email_scheduler import _send_reminder
            result = await _send_reminder(1, ["a", "b"], "Sub", "Body")

        assert result is True

    async def test_returns_false_when_all_fail(self):
        with patch(PATCH_BREVO, side_effect=Exception("fail")), patch(PATCH_LOGGER):
            from backend.src.services.email_scheduler import _send_reminder
            result = await _send_reminder(1, ["a", "b"], "Sub", "Body")

        assert result is False

    async def test_empty_recipients(self):
        with patch(PATCH_BREVO) as mock_brevo:
            from backend.src.services.email_scheduler import _send_reminder
            result = await _send_reminder(1, [], "Sub", "Body")

        assert result is False
        mock_brevo.assert_not_called()


# ---------------------------------------------------------------------------
# Tests for _process_email (ASYNC)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestProcessEmail:

    async def _run(self, email, recipients=None, now=None):
        from backend.src.services.email_scheduler import _process_email
        await _process_email(
            email,
            recipients if recipients is not None else ["r@example.com"],
            now or NOW,
        )

    async def test_sends_24h_reminder_when_due(self):
        email = _make_email(time_24h_before=PAST)

        with patch(PATCH_SEND_REM, return_value=True) as mock_send:
            await self._run(email)

            mock_send.assert_called_once()
            assert email.time_24h_before is None

    async def test_does_not_send_when_not_due(self):
        email = _make_email(time_24h_before=FUTURE)

        with patch(PATCH_SEND_REM) as mock_send:
            await self._run(email)

            mock_send.assert_not_called()

    async def test_partial_success_still_nulls(self):
        email = _make_email(time_24h_before=PAST)

        with patch(PATCH_SEND_REM, return_value=True):
            await self._run(email)

        assert email.time_24h_before is None

    async def test_failure_keeps_timestamp(self):
        email = _make_email(time_24h_before=PAST)

        with patch(PATCH_SEND_REM, return_value=False):
            await self._run(email)

        assert email.time_24h_before == PAST


# ---------------------------------------------------------------------------
# Tests for run_scheduled_emails (ASYNC)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestRunScheduledEmails:

    def _make_db(self, emails=None):
        mock_db = MagicMock()
        mock_db.query.return_value.filter.return_value.all.return_value = emails or []
        return mock_db

    async def test_commits_when_processed(self):
        email = _make_email(time_24h_before=PAST)
        mock_db = self._make_db([email])

        with patch(PATCH_SESSION, return_value=mock_db), \
             patch(PATCH_RESOLVE, return_value=["a"]), \
             patch(PATCH_SEND_REM, return_value=True):

            from backend.src.services.email_scheduler import run_scheduled_emails
            await run_scheduled_emails()

        mock_db.commit.assert_called_once()

    async def test_no_emails_does_nothing(self):
        mock_db = self._make_db([])

        with patch(PATCH_SESSION, return_value=mock_db), \
             patch(PATCH_RESOLVE, return_value=["a"]), \
             patch(PATCH_SEND_REM) as mock_send:

            from backend.src.services.email_scheduler import run_scheduled_emails
            await run_scheduled_emails()

        mock_send.assert_not_called()

    async def test_handles_exception(self):
        mock_db = MagicMock()
        mock_db.query.side_effect = Exception("DB error")

        with patch(PATCH_SESSION, return_value=mock_db):
            from backend.src.services.email_scheduler import run_scheduled_emails
            await run_scheduled_emails()

        mock_db.rollback.assert_called_once()
        mock_db.close.assert_called_once()

    async def test_partial_failure_still_commits(self):
        email = _make_email(time_24h_before=PAST)
        mock_db = self._make_db([email])

        recipients = ["good", "bad"]

        def side_effect(to, subject, text):
            if to == ["bad"]:
                raise Exception("fail")

        with patch(PATCH_SESSION, return_value=mock_db), \
             patch(PATCH_RESOLVE, return_value=recipients), \
             patch(PATCH_BREVO, side_effect=side_effect), \
             patch(PATCH_LOGGER):

            from backend.src.services.email_scheduler import run_scheduled_emails
            await run_scheduled_emails()

        mock_db.commit.assert_called_once()