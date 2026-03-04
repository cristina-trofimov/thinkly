import logging
from datetime import datetime, timezone

from DB_Methods.database import SessionLocal
from models.schema import CompetitionEmail
from endpoints.send_email_api import send_email_via_brevo
from endpoints.competitions_api import resolve_email_recipients

logger = logging.getLogger(__name__)


def _send_reminder(email_id: int, recipients: list, subject: str, body: str) -> None:
    """Send a single reminder email and log the result."""
    try:
        send_email_via_brevo(to=recipients, subject=subject, text=body)
    except Exception as e:
        logger.error(f"Failed to send reminder for email_id={email_id}: {e}")


def _process_email(email, recipients: list, now: datetime) -> None:
    """Process all due reminder timestamps for a single CompetitionEmail row."""
    if email.time_24h_before and email.time_24h_before <= now:
        logger.info(f"Sending 24h reminder for email_id={email.email_id}")
        _send_reminder(email.email_id, recipients, f"[24h Reminder] {email.subject}", email.body)
        email.time_24h_before = None

    if email.time_5min_before and email.time_5min_before <= now:
        logger.info(f"Sending 5min reminder for email_id={email.email_id}")
        _send_reminder(email.email_id, recipients, f"[5min Reminder] {email.subject}", email.body)
        email.time_5min_before = None

    if email.other_time and email.other_time <= now:
        logger.info(f"Sending custom-time email for email_id={email.email_id}")
        _send_reminder(email.email_id, recipients, email.subject, email.body)
        email.other_time = None


def run_scheduled_emails():
    """
    Polls competition_email every minute.
    For each reminder timestamp (24h, 5min, other) that is due (≤ now),
    sends the email via Brevo and nulls out the timestamp so it never re-fires.
    """
    db = SessionLocal()
    now = datetime.now(timezone.utc)

    try:
        emails = db.query(CompetitionEmail).filter(
            (CompetitionEmail.time_24h_before <= now) |
            (CompetitionEmail.time_5min_before <= now) |
            (CompetitionEmail.other_time <= now)
        ).all()

        for email in emails:
            recipients = resolve_email_recipients(db, email.to)
            if not recipients:
                logger.warning(f"No recipients resolved for competition_email id={email.email_id}")
            _process_email(email, recipients, now)

        db.commit()

    except Exception as e:
        logger.exception(f"Error in scheduled email job: {e}")
        db.rollback()
    finally:
        db.close()