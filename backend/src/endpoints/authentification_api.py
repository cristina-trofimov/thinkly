import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, constr
from sqlalchemy.orm import Session
from typing import Optional
from models.schema import UserAccount, UserPreferences
from google.oauth2 import id_token
from google.auth.transport import requests as grequests
from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone
import os
from dotenv import load_dotenv
import uuid
from DB_Methods.database import get_db, _commit_or_rollback
import logging
from .send_email_api import send_email_via_brevo

load_dotenv()
auth_router = APIRouter(tags=["Authentication"])
token_blocklist = set()

logger = logging.getLogger(__name__)

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60


# ---------------- Models ----------------
class SignupRequest(BaseModel):
    firstName: str
    lastName: str
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class GoogleAuthRequest(BaseModel):
    credential: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: constr(min_length=8)
# ---------------- DB helpers ----------------
def get_user_by_email(db: Session, email: str) -> Optional[UserAccount]:
    return db.query(UserAccount).filter(UserAccount.email == email).first()

def update_user_password(db: Session, email: str, new_hashed_password: str) -> None:
    """Update the hashed_password field for a given user email"""
    user = db.query(UserAccount).filter(UserAccount.email == email).first()
    if not user:
        raise ValueError("User not found")
    user.hashed_password = new_hashed_password
    db.commit()


def create_user(db: Session, email: str, password_hash: str, first_name: str, last_name: str, type: str = 'participant'):
    if type == 'owner':
        existing_owner = db.query(UserAccount).filter(UserAccount.user_type == 'owner').first()
        if existing_owner:
            logger.error("Owner creation failed: An owner already exists.")
            raise ValueError("An owner already exists. Only one owner is allowed.")
    new_user = UserAccount(
        email=email,
        first_name=first_name,
        last_name=last_name,
        hashed_password=password_hash,
        user_type=type
    )


    db.add(new_user)
    _commit_or_rollback(db)
    db.refresh(new_user)
    new_user_preferences = UserPreferences(
        user_id=new_user.user_id,
        theme="light",
        notifications_enabled=True
    )
    db.add(new_user_preferences)
    _commit_or_rollback(db)
    db.refresh(new_user_preferences)
    return new_user

def verify_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=400, detail="Invalid token")
        return email
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=400, detail="Invalid token")

def hash_password(password: str) -> str:
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(
        password.encode("utf-8"),
        hashed.encode("utf-8")
    )
# ---------------- JWT helpers ----------------
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta if expires_delta else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({
        "exp": expire,
        "jti": str(uuid.uuid4())  # Add unique JWT ID
    })
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def decode_access_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        jti = payload.get("jti")
        if jti in token_blocklist:
            logger.warning(f"Revoked token detected. JTI: {jti[:8]}...")
            raise HTTPException(status_code=401, detail="Token has been revoked")
        return payload
    except JWTError as e:
        logger.error(f"Token validation failed. Error: {e.__class__.__name__}. Token snippet: {token[:10]}...")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        logger.warning("Access denied: Missing or invalid Authorization header.")
        raise HTTPException(status_code=401, detail="Missing token")
    token = auth_header.split(" ")[1]
    claims = decode_access_token(token)
    return claims

def role_required(required_role: str):
    def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user.get("role") != required_role:
            logger.warning(f"Access Forbidden: User {current_user.get('sub')} attempted to access role '{required_role}' endpoint.")
            raise HTTPException(status_code=403, detail="Forbidden")
        return current_user
    return role_checker

# ---------------- Routes ----------------
@auth_router.post("/signup")
async def signup(request: SignupRequest, db: Session = Depends(get_db)):
    logger.info(f"Attempting signup for email: {request.email}")
    if get_user_by_email(db, request.email):
        logger.warning(f"Signup denied: User already exists with email: {request.email}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User already exists")
    
    try:
        password_hash = bcrypt.hashpw(request.password.encode(), bcrypt.gensalt()).decode()
        create_user(db, request.email, password_hash, request.firstName, request.lastName)
        logger.info(f"SUCCESSFUL SIGNUP: New user '{request.email}' created.")
        return {"message": "User created"}
    except Exception:
        logger.exception(f"FATAL error during user creation for email: {request.email}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error during signup")

@auth_router.post("/login")
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    logger.info(f"Attempting password login for email: {request.email}")
    user = get_user_by_email(db, request.email)
    
    if not user or not bcrypt.checkpw(request.password.encode(), user.hashed_password.encode()):
        logger.warning(f"Login failed: Invalid credentials for email: {request.email}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    
    token = create_access_token({"sub": user.email, "role": user.user_type, "id": user.user_id})
    logger.info(f"SUCCESSFUL LOGIN: User '{user.email}' logged in. Role: {user.user_type}")
    return {"token": token}

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "your-google-client-id")

@auth_router.post("/google-auth")
async def google_login(request: GoogleAuthRequest, db: Session = Depends(get_db)):
    logger.info("Attempting Google OAuth login.")
    try:
        idinfo = id_token.verify_oauth2_token(request.credential, grequests.Request(), GOOGLE_CLIENT_ID)
        email = idinfo["email"]
        name = idinfo.get("name", "Unknown User")
        user = get_user_by_email(db, email)
        
        if not user:
            logger.info(f"New user registration via Google OAuth: {email}")
            create_user(db, email=email, password_hash="", first_name=name, last_name="", type="participant")
            user = get_user_by_email(db, email)
        
        token = create_access_token({"sub": user.email, "role": user.user_type, "id": user.user_id})
        logger.info(f"SUCCESSFUL GOOGLE AUTH: User '{email}' logged in/authenticated. Role: {user.user_type}")
        return {"token": token}
    except ValueError as e:
        logger.error(f"Google token verification failed: {e.__class__.__name__}. Credential length: {len(request.credential)}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid Google token: {str(e)}")

@auth_router.get("/profile")
async def profile(db: Session = Depends(get_db),current_user: dict = Depends(get_current_user)):
    user_email = current_user.get("sub")
    logger.info(f"Fetching profile for user: {user_email}")
    
    user = get_user_by_email(db, user_email)
    
    if not user:
        logger.warning(f"Profile failed: User not found in DB for email: {user_email}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    logger.info(f"Profile fetched successfully for user ID: {user.user_id}")
    return {"id": user.user_id, "email": user.email, "role": user.user_type}


@auth_router.post("/logout")
async def logout(request: Request, current_user: dict = Depends(get_current_user)):
    user_email = current_user.get("sub", "N/A")
    user_id = current_user.get("id", "N/A")
    logger.info(f"Attempting logout/token revocation for user: {user_email} (ID: {user_id})")
    
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        # This case should ideally be caught by get_current_user, but we log defensively.
        logger.warning("Logout failure: Missing Authorization header.")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Authorization header")

    token = auth_header.split(" ")[1]
    
    # We rely on decode_access_token to handle JWTError and HTTPException
    payload = decode_access_token(token)
    jti = payload.get("jti")

    if not jti:
        logger.warning(f"Logout complete for user {user_email}, but token is stateless (no JTI for revocation).")
        return {"msg": "Token does not support logout / already stateless"}

    token_blocklist.add(jti)
    logger.info(f"SUCCESSFUL LOGOUT: Token JTI '{jti[:8]}...' revoked for user: {user_email}")
    return {"msg": "Successfully logged out"}

@auth_router.get("/admin/dashboard")
async def admin_dashboard(db: Session = Depends(get_db),current_user: dict = Depends(role_required("admin"))):
    user_email = current_user.get("sub", "N/A")
    logger.info(f"Admin dashboard accessed successfully by user: {user_email}")
    return {"message": "Welcome to the admin dashboard"}


@auth_router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    logger.info(f"Password reset requested for email: {request.email}")

    # Check if user exists (but don't reveal this to the client)
    user = get_user_by_email(db, request.email)

    if user:
        # Generate a password reset token (valid for 1 hour)
        reset_token = create_access_token(
            data={"sub": user.email, "purpose": "password_reset"},
            expires_delta=timedelta(hours=1)
        )

        # Create reset link with the actual token
        reset_link = f"http://localhost:5173/reset-password?token={reset_token}"

        try:
            send_email_via_brevo(
                to=[request.email],
                subject="Password Reset Request",
                text=f"Click this link to reset your password: {reset_link}\n\nThis link will expire in 1 hour.",
                html=f"""
                            <html>
                                <body>
                                    <h2>Password Reset Request</h2>
                                    <p>Click the link below to reset your password:</p>
                                    <p><a href="{reset_link}" style="color: #007bff; text-decoration: none; font-weight: bold;">Reset Password</a></p>
                                    <p>Or copy and paste this link in your browser:</p>
                                    <p>{reset_link}</p>
                                    <p><em>This link will expire in 1 hour.</em></p>
                                </body>
                            </html>
                            """
            )
            logger.info(f"Password reset email sent to: {request.email}")
        except Exception as e:
            logger.error(f"Failed to send password reset email to {request.email}: {str(e)}")
    else:
        logger.info(f"Password reset requested for non-existent email: {request.email}")

    # Always return the same message for security
    return {"message": "If your account exists, a password reset email has been sent."}


@auth_router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    try:
        # Verify the token
        payload = jwt.decode(request.token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        email = payload.get("sub")
        purpose = payload.get("purpose")

        if not email or purpose != "password_reset":
            raise HTTPException(status_code=400, detail="Invalid or expired reset token")

        # Get user from database
        user = get_user_by_email(db, email)
        if not user:
            raise HTTPException(status_code=400, detail="Invalid or expired reset token")

        hashed_password = hash_password(request.new_password)
        update_user_password(db, email, hashed_password)

        logger.info(f"Password successfully reset for user: {email}")
        return {"message": "Password has been reset successfully."}

    except jwt.ExpiredSignatureError:
        logger.warning("Expired reset token used")
        raise HTTPException(status_code=400, detail="Reset token has expired")
    except jwt.JWTError as e:
        logger.error(f"Invalid reset token: {str(e)}")
        raise HTTPException(status_code=400, detail="Invalid reset token")