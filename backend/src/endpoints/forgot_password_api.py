import os
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, field_validator
from email_validator import validate_email, EmailNotValidError
from dotenv import load_dotenv
import logging

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# You'll need to import your database session and User model
# Example: from database import get_db, User
# For this example, I'll show the structure you'd use

password_reset_router = APIRouter(tags=["Password Reset"])

# In-memory storage for demo (replace with database in production)
# Structure: {token: {"email": email, "expires": datetime, "used": bool}}
reset_tokens = {}


class ForgotPasswordRequest(BaseModel):
    email: str

    @field_validator('email')
    @classmethod
    def validate_email_field(cls, v):
        if not v or not v.strip():
            raise ValueError("Email is required")
        try:
            validate_email(v.strip())
        except EmailNotValidError as e:
            raise ValueError(f"Invalid email format: {e}")
        return v.strip().lower()


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator('token')
    @classmethod
    def validate_token(cls, v):
        if not v or not v.strip():
            raise ValueError("Token is required")
        return v.strip()

    @field_validator('new_password')
    @classmethod
    def validate_password(cls, v):
        if not v or len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return v


def generate_reset_token():
    """Generate a secure random token"""
    return secrets.token_urlsafe(32)


def hash_password(password: str) -> str:
    """Hash password using SHA-256 (replace with bcrypt in production)"""
    return hashlib.sha256(password.encode()).hexdigest()


@password_reset_router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """
    Initiates password reset process by sending a reset email.
    """
    logger.info(f"Password reset requested for email: {request.email}")

    # TODO: Check if user exists in database
    # Example:
    # db = get_db()
    # user = db.query(User).filter(User.email == request.email).first()
    # if not user:
    #     # Security: Don't reveal if email exists or not
    #     logger.warning(f"Password reset requested for non-existent email: {request.email}")
    #     return {"ok": True, "message": "If that email exists, a reset link has been sent"}

    # Generate reset token
    token = generate_reset_token()
    expires = datetime.now(timezone.utc) + timedelta(hours=1)

    # Store token (replace with database storage in production)
    reset_tokens[token] = {
        "email": request.email,
        "expires": expires,
        "used": False
    }

    # TODO: Save token to database
    # Example:
    # reset_record = PasswordReset(
    #     user_id=user.id,
    #     token=token,
    #     expires_at=expires,
    #     used=False
    # )
    # db.add(reset_record)
    # db.commit()

    # Send reset email
    from send_email_api import BREVO_API_KEY, DEFAULT_SENDER_EMAIL, DEFAULT_SENDER_NAME, BREVO_SEND_URL
    import requests

    # Construct reset URL (replace with your frontend URL)
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    reset_url = f"{frontend_url}/reset-password?token={token}"

    email_body = f"""
Hello,

You requested to reset your password. Click the link below to reset it:

{reset_url}

This link will expire in 1 hour.

If you didn't request this, please ignore this email.

Best regards,
{DEFAULT_SENDER_NAME}
    """.strip()

    payload = {
        "sender": {"email": DEFAULT_SENDER_EMAIL, "name": DEFAULT_SENDER_NAME},
        "to": [{"email": request.email}],
        "subject": "Password Reset Request",
        "textContent": email_body
    }

    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": BREVO_API_KEY
    }

    try:
        resp = requests.post(BREVO_SEND_URL, headers=headers, json=payload, timeout=20)

        if resp.status_code >= 400:
            logger.error(f"Failed to send reset email. Status: {resp.status_code}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to send reset email"
            )

        logger.info(f"Password reset email sent successfully to {request.email}")

        # Security: Always return success even if email doesn't exist
        return {
            "ok": True,
            "message": "If that email exists, a reset link has been sent"
        }

    except requests.RequestException as e:
        logger.exception("Network error sending reset email")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to send reset email"
        )


@password_reset_router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """
    Resets the user's password using a valid token.
    """
    logger.info(f"Password reset attempt with token: {request.token[:10]}...")

    # Verify token exists
    token_data = reset_tokens.get(request.token)

    if not token_data:
        logger.warning("Invalid reset token used")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )

    # Check if token is expired
    if datetime.now(timezone.utc) > token_data["expires"]:
        logger.warning("Expired reset token used")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired"
        )

    # Check if token was already used
    if token_data["used"]:
        logger.warning("Already used reset token")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has already been used"
        )

    # TODO: Update user password in database
    # Example:
    # db = get_db()
    # user = db.query(User).filter(User.email == token_data["email"]).first()
    # if not user:
    #     raise HTTPException(status_code=404, detail="User not found")
    #
    # user.password = hash_password(request.new_password)
    # db.commit()

    # Mark token as used
    token_data["used"] = True

    # TODO: Mark token as used in database
    # Example:
    # reset_record = db.query(PasswordReset).filter(
    #     PasswordReset.token == request.token
    # ).first()
    # reset_record.used = True
    # db.commit()

    logger.info(f"Password successfully reset for user: {token_data['email']}")

    return {
        "ok": True,
        "message": "Password has been reset successfully"
    }


@password_reset_router.get("/verify-token/{token}")
async def verify_reset_token(token: str):
    """
    Verifies if a reset token is valid and not expired.
    """
    token_data = reset_tokens.get(token)

    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid reset token"
        )

    if datetime.now(timezone.utc) > token_data["expires"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired"
        )

    if token_data["used"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has already been used"
        )

    return {
        "ok": True,
        "valid": True,
        "email": token_data["email"]
    }