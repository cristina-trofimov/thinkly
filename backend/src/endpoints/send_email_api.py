import os
import requests
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator
from typing import List, Optional
from email_validator import validate_email, EmailNotValidError
from dotenv import load_dotenv
import logging

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()
BREVO_API_KEY = os.getenv("BREVO_API_KEY")
DEFAULT_SENDER_EMAIL = os.getenv("DEFAULT_SENDER_EMAIL")
DEFAULT_SENDER_NAME  = os.getenv("DEFAULT_SENDER_NAME", "My App")

if not BREVO_API_KEY or not DEFAULT_SENDER_EMAIL:
    logger.critical("FATAL: Missing BREVO_API_KEY or DEFAULT_SENDER_EMAIL in environment.")
    raise SystemExit("Missing BREVO_API_KEY or DEFAULT_SENDER_EMAIL in environment.")

BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email"

email_router = APIRouter(tags=["Email"])

#Ensure recipients is a non-empty list (Validation)
class SendEmailRequest(BaseModel):
    to: List[str]
    subject: str
    text: str
    sendAt: Optional[str] = None

    @field_validator('to')
    @classmethod
    def validate_recipients(cls, v):
        if not v or not isinstance(v, list):
            logger.error("Validation failed: Recipient 'to' field is empty or not a list.")
            raise ValueError("Field 'to' must be a non-empty list of recipient emails.")
        for recipient in v:
            try:
                validate_email(recipient)
            except EmailNotValidError as e:
                logger.error(f"Validation failed: Invalid recipient email format: '{recipient}'")
                raise ValueError(f"Invalid recipient '{recipient}': {e}")
        return v

    @field_validator('subject')
    @classmethod
    def validate_subject(cls, v):
        if not v or not v.strip():
            logger.error("Validation failed: Email subject is missing.")
            raise ValueError("Field 'subject' is required.")
        return v.strip()

    @field_validator('text')
    @classmethod
    def validate_text(cls, v):
        if not v or not v.strip():
            logger.error("Validation failed: Email body text is missing.")
            raise ValueError("Provide at least one of 'text'.")
        return v.strip()

# Normalize ISO8601 timestamp to UTC with 'Z' suffix
def normalize_iso_utc(iso_str):
    if not iso_str:
        return None
    try:
        s = iso_str.strip()
        if s.endswith("Z"):
            s = s.replace("Z", "+00:00")
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        # Return canonical Brevo format (ISO8601 with Z suffix)
        return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    except Exception:
        # Log failure inside the helper function
        logger.warning(f"Failed to parse or normalize ISO8601 timestamp: '{iso_str}'")
        return None


def _validate_email_inputs(to: list[str], subject: str, text: str):
    """Validate all email inputs before sending."""
    try:
        validate_email(DEFAULT_SENDER_EMAIL)
    except EmailNotValidError as e:
        logger.error(f"Invalid default sender email: {DEFAULT_SENDER_EMAIL}")
        raise ValueError(f"Invalid sender email: {e}")

    if not to or not isinstance(to, list):
        raise ValueError("Recipient 'to' must be a non-empty list of emails")

    for recipient in to:
        try:
            validate_email(recipient)
        except EmailNotValidError as e:
            logger.error(f"Invalid recipient email: {recipient}")
            raise ValueError(f"Invalid recipient '{recipient}': {e}")

    if not subject or not subject.strip():
        raise ValueError("Email subject is required")
    if not text or not text.strip():
        raise ValueError("Email body text is required")


def send_email_via_brevo(to: list[str], subject: str, text: str, sendAt: str | None = None,
                         html: str | None = None) -> dict:
    """Send an email via Brevo with full logging and validation."""
    _validate_email_inputs(to, subject, text)

    scheduledAt = normalize_iso_utc(sendAt)

    payload = {
        "sender": {"email": DEFAULT_SENDER_EMAIL, "name": DEFAULT_SENDER_NAME},
        "to": [{"email": r} for r in to],
        "subject": subject,
        "textContent": text
    }

    # Add HTML content if provided
    if html:
        payload["htmlContent"] = html
        logger.debug("HTML content included in email")

    if scheduledAt:
        payload["scheduledAt"] = scheduledAt
        logger.info(f"Email scheduled for {scheduledAt}")

    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": BREVO_API_KEY
    }

    try:
        logger.debug(f"Sending email via Brevo to {to}, subject: {subject[:30]}...")
        resp = requests.post(BREVO_SEND_URL, headers=headers, json=payload, timeout=20)
    except Exception as e:
        logger.exception("Network error when calling Brevo API")
        raise RuntimeError(f"Network error calling Brevo: {e}")

    if resp.status_code >= 400:
        try:
            detail = resp.json()
        except Exception:
            detail = resp.text
        logger.error(f"Brevo API returned error {resp.status_code}: {detail}")
        raise RuntimeError(f"Brevo API error {resp.status_code}: {detail}")

    logger.info(f"SUCCESS: Email sent successfully. Message ID: {resp.json().get('messageId')}")
    return {"brevo": resp.json(), "scheduledAt": scheduledAt}

# Routes

@email_router.post("/send")
async def send_email(request: SendEmailRequest):
    try:
        result = send_email_via_brevo(
            to=request.to,
            subject=request.subject,
            text=request.text,
            sendAt=request.sendAt
        )
        return {"ok": True, **result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@email_router.get("/health")
def health():
    logger.debug("Health check accessed.")
    return {"ok": True}

@email_router.get("/")
def index():
    logger.debug("Index accessed.")
    return {"ok": True, "endpoints": ["/health", "/send-email"]}