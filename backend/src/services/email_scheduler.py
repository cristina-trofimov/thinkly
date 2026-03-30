import logging
import asyncio
from datetime import datetime, timezone

from database_operations.database import SessionLocal
from models.schema import CompetitionEmail
from endpoints.send_email_api import send_email_via_brevo
from endpoints.competitions_api import resolve_email_recipients

logger = logging.getLogger(__name__)


async def _send_one_email(email_id: int, recipient: str, subject: str, body: str) -> bool:
    try:
        # Run sync function in a thread (safe even if already async)
        await asyncio.to_thread(
            send_email_via_brevo,
            to=[recipient],
            subject=subject,
            text=body,
        )
        return True
    except Exception as e:
        logger.error(
            f"Failed to send reminder for email_id={email_id} "
            f"to {recipient}: {e}"
        )
        return False


async def _send_reminder(email_id: int, recipients: list, subject: str, body: str) -> bool:
    """
    Send emails concurrently.
    Return True if at least ONE succeeds.
    """
    if not recipients:
        return False

    tasks = [
        _send_one_email(email_id, recipient, subject, body)
        for recipient in recipients
    ]

    results = await asyncio.gather(*tasks)

    return any(results)  # ✅ your requirement


async def _process_email(email, recipients: list, now: datetime) -> None:
    if email.time_24h_before and email.time_24h_before <= now:
        logger.info(f"Sending 24h reminder for email_id={email.email_id}")
        if await _send_reminder(
            email.email_id,
            recipients,
            f"[24h Reminder] {email.subject}",
            email.body,
        ):
            email.time_24h_before = None  # ✅ erase if at least 1 success

    if email.time_5min_before and email.time_5min_before <= now:
        logger.info(f"Sending 5min reminder for email_id={email.email_id}")
        if await _send_reminder(
            email.email_id,
            recipients,
            f"[5min Reminder] {email.subject}",
            email.body,
        ):
            email.time_5min_before = None

    if email.other_time and email.other_time <= now:
        logger.info(f"Sending custom-time email for email_id={email.email_id}")
        if await _send_reminder(
            email.email_id,
            recipients,
            email.subject,
            email.body,
        ):
            email.other_time = None


async def run_scheduled_emails():
    db = SessionLocal()
    now = datetime.now(timezone.utc)

    try:
        emails = db.query(CompetitionEmail).filter(
            (CompetitionEmail.time_24h_before <= now) |
            (CompetitionEmail.time_5min_before <= now) |
            (CompetitionEmail.other_time <= now)
        ).all()

        tasks = []

        for email in emails:
            recipients = resolve_email_recipients(db, email.to)

            if not recipients:
                logger.warning(
                    f"No recipients resolved for competition_email id={email.email_id}"
                )
                continue

            tasks.append(_process_email(email, recipients, now))

        # Run all emails concurrently
        await asyncio.gather(*tasks)

        db.commit()

    except Exception as e:
        logger.exception(f"Error in scheduled email job: {e}")
        db.rollback()
    finally:
        db.close()