import asyncio
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

MOD = "backend.src.services.email_scheduler"
PATCH_SESSION = f"{MOD}.SessionLocal"
PATCH_RESOLVE = f"{MOD}.resolve_email_recipients"
PATCH_SEND_REM = f"{MOD}._send_reminder"
PATCH_PROCESS = f"{MOD}._process_email"
PATCH_SEND_ONE = f"{MOD}._send_one_email"
PATCH_LOGGER = f"{MOD}.logger"

# ---------------------------------------------------------------------------
# _send_reminder (async)
# ---------------------------------------------------------------------------

class TestSendReminderAsync:

    @pytest.mark.asyncio
    async def test_calls_send_one_per_recipient(self):
        with patch(PATCH_SEND_ONE, return_value=True) as mock_send:
            from backend.src.services.email_scheduler import _send_reminder
            await _send_reminder(1, ["a", "b"], "Sub", "Body")

            assert mock_send.call_count == 2

    @pytest.mark.asyncio
    async def test_returns_true_if_one_success(self):
        with patch(PATCH_SEND_ONE, side_effect=[False, True]):
            from backend.src.services.email_scheduler import _send_reminder
            result = await _send_reminder(1, ["a", "b"], "Sub", "Body")

        assert result is True

    @pytest.mark.asyncio
    async def test_returns_false_if_all_fail(self):
        with patch(PATCH_SEND_ONE, return_value=False):
            from backend.src.services.email_scheduler import _send_reminder
            result = await _send_reminder(1, ["a", "b"], "Sub", "Body")

        assert result is False

    @pytest.mark.asyncio
    async def test_empty_recipients(self):
        with patch(PATCH_SEND_ONE) as mock_send:
            from backend.src.services.email_scheduler import _send_reminder
            result = await _send_reminder(1, [], "Sub", "Body")

        assert result is False
        mock_send.assert_not_called()

# ---------------------------------------------------------------------------
# _send_one_email
# ---------------------------------------------------------------------------

class TestSendOneEmail:

    @pytest.mark.asyncio
    async def test_uses_to_thread(self):
        with patch("asyncio.to_thread") as mock_thread:
            future = asyncio.Future()
            future.set_result(None)
            mock_thread.return_value = future

            from backend.src.services.email_scheduler import _send_one_email
            await _send_one_email(1, "a@b.com", "Sub", "Body")

        mock_thread.assert_called_once()

# ---------------------------------------------------------------------------
# _process_email
# ---------------------------------------------------------------------------

class TestProcessEmailAsync:

    @pytest.mark.asyncio
    async def test_24h_trigger(self):
        email = _make_email(time_24h_before=PAST)

        with patch(PATCH_SEND_REM, return_value=True) as mock_send:
            from backend.src.services.email_scheduler import _process_email
            await _process_email(email, ["a"], NOW)

        mock_send.assert_called_once()
        assert email.time_24h_before is None

    @pytest.mark.asyncio
    async def test_multiple_triggers(self):
        email = _make_email(
            time_24h_before=PAST,
            time_5min_before=PAST,
            other_time=PAST,
        )

        with patch(PATCH_SEND_REM, return_value=True) as mock_send:
            from backend.src.services.email_scheduler import _process_email
            await _process_email(email, ["a"], NOW)

        assert mock_send.call_count == 3

    @pytest.mark.asyncio
    async def test_not_due(self):
        email = _make_email(time_24h_before=FUTURE)

        with patch(PATCH_SEND_REM) as mock_send:
            from backend.src.services.email_scheduler import _process_email
            await _process_email(email, ["a"], NOW)

        mock_send.assert_not_called()
        assert email.time_24h_before == FUTURE

# ---------------------------------------------------------------------------
# run_scheduled_emails
# ---------------------------------------------------------------------------

class TestRunScheduledEmailsAsync:

    def _make_db(self, emails=None):
        mock_db = MagicMock()
        mock_db.query.return_value.filter.return_value.all.return_value = emails or []
        return mock_db

    @pytest.mark.asyncio
    async def test_processes_multiple_emails(self):
        emails = [_make_email(email_id=i, time_24h_before=PAST) for i in range(3)]
        mock_db = self._make_db(emails)

        with patch(PATCH_SESSION, return_value=mock_db), \
             patch(PATCH_RESOLVE, return_value=["a"]), \
             patch(PATCH_PROCESS) as mock_process:

            from backend.src.services.email_scheduler import run_scheduled_emails
            await run_scheduled_emails()

        assert mock_process.call_count == 3
        mock_db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_concurrent_execution(self):
        email1 = _make_email(email_id=1, time_24h_before=PAST)
        email2 = _make_email(email_id=2, time_24h_before=PAST)

        mock_db = self._make_db([email1, email2])

        with patch(PATCH_SESSION, return_value=mock_db), \
             patch(PATCH_RESOLVE, return_value=["a"]), \
             patch(PATCH_SEND_REM, return_value=True):

            from backend.src.services.email_scheduler import run_scheduled_emails
            await run_scheduled_emails()

        mock_db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_skip_when_no_recipients(self):
        email = _make_email(time_24h_before=PAST)
        mock_db = self._make_db([email])

        with patch(PATCH_SESSION, return_value=mock_db), \
             patch(PATCH_RESOLVE, return_value=[]), \
             patch(PATCH_PROCESS) as mock_process:

            from backend.src.services.email_scheduler import run_scheduled_emails
            await run_scheduled_emails()

        mock_process.assert_not_called()

    @pytest.mark.asyncio
    async def test_commit_after_processing(self):
        email = _make_email(time_24h_before=PAST)
        mock_db = self._make_db([email])

        order = []

        async def mock_process(*args, **kwargs):
            order.append("process")

        def mock_commit():
            order.append("commit")

        mock_db.commit = mock_commit

        with patch(PATCH_SESSION, return_value=mock_db), \
             patch(PATCH_RESOLVE, return_value=["a"]), \
             patch(PATCH_PROCESS, side_effect=mock_process):

            from backend.src.services.email_scheduler import run_scheduled_emails
            await run_scheduled_emails()

        assert order == ["process", "commit"]
