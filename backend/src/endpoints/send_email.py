import os
import requests
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator
from typing import List, Optional
from email_validator import validate_email, EmailNotValidError
from dotenv import load_dotenv


# Load environment variables
load_dotenv()
BREVO_API_KEY = os.getenv("BREVO_API_KEY")
DEFAULT_SENDER_EMAIL = os.getenv("DEFAULT_SENDER_EMAIL")
DEFAULT_SENDER_NAME  = os.getenv("DEFAULT_SENDER_NAME", "My App")

if not BREVO_API_KEY or not DEFAULT_SENDER_EMAIL:
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
            raise ValueError("Field 'to' must be a non-empty list of recipient emails.")
        for recipient in v:
            try:
                validate_email(recipient)
            except EmailNotValidError as e:
                raise ValueError(f"Invalid recipient '{recipient}': {e}")
        return v

    @field_validator('subject')
    @classmethod
    def validate_subject(cls, v):
        if not v or not v.strip():
            raise ValueError("Field 'subject' is required.")
        return v.strip()

    @field_validator('text')
    @classmethod
    def validate_text(cls, v):
        if not v or not v.strip():
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
        return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    except Exception:
        return None

# Routes
    
@email_router.post("/send")
async def send_email(request: SendEmailRequest):
    """Send an email via Brevo API"""
    sender_email = DEFAULT_SENDER_EMAIL
    sender_name = DEFAULT_SENDER_NAME

    # Validate sender email
    try:
        validate_email(sender_email)
    except EmailNotValidError as e:
        raise HTTPException(status_code=400, detail=f"Invalid senderEmail: {e}")

    # Process scheduled send time
    scheduledAt = normalize_iso_utc(request.sendAt)
    if request.sendAt and not scheduledAt:
        raise HTTPException(
            status_code=400,
            detail="Field 'sendAt' must be a valid ISO8601 timestamp (e.g., 2025-10-26T20:00:00Z)."
        )

    #JSON payload for Brevo
    payload = {
        "sender": {"email": sender_email, "name": sender_name},
        "to": [{"email": r} for r in request.to],
        "subject": request.subject,
    }

    if request.text:
        payload["textContent"] = request.text
    if scheduledAt:
        payload["scheduledAt"] = scheduledAt

    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": BREVO_API_KEY
    }

    try:
        resp = requests.post(BREVO_SEND_URL, headers=headers, json=payload, timeout=20)
    except requests.RequestException as e:
        raise HTTPException(
            status_code=502,
            detail={"error": "Network error calling Brevo", "detail": str(e)}
        )

    if resp.status_code >= 400:
        detail = None
        try:
            detail = resp.json()
        except Exception:
            detail = resp.text
        raise HTTPException(
            status_code=502,
            detail={
                "error": "Brevo API error",
                "status": resp.status_code,
                "detail": detail
            }
        )

    return {"ok": True, "brevo": resp.json(), "scheduledAt": scheduledAt}


@email_router.get("/health")
def health():
    return {"ok": True}

@email_router.get("/")
def index():
    return {"ok": True, "endpoints": ["/health", "/send-email"]}

