import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr, constr
from sqlalchemy.orm import Session
from typing import Annotated, Optional
from models.schema import UserAccount, UserPreferences, UserSession
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

ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7

# ---------------- Error Messages ----------------
ERROR_USER_NOT_FOUND = "User not found"
ERROR_INVALID_TOKEN = "Invalid token"


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

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: constr(min_length=8)

# ---------------- DB helpers ----------------
def get_user_by_email(db: Session, email: str) -> Optional[UserAccount]:
    return db.query(UserAccount).filter(UserAccount.email == email).first()

def update_user_password(db: Session, email: str, new_hashed_password: str) -> None:
    """Update the hashed_password field for a given user email"""
    user = db.query(UserAccount).filter(UserAccount.email == email).first()
    if not user:
        raise ValueError(ERROR_USER_NOT_FOUND)
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
            raise HTTPException(status_code=400, detail=ERROR_INVALID_TOKEN)
        return email
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=400, detail=ERROR_INVALID_TOKEN)

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

def create_refresh_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "jti": str(uuid.uuid4()), "type": "refresh"})
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
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=ERROR_INVALID_TOKEN)

def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        logger.warning("Access denied: Missing or invalid Authorization header.")
        raise HTTPException(status_code=401, detail="Missing token")
    token = auth_header.split(" ")[1]
    claims = decode_access_token(token)
    return claims

def role_required(required_role: str):
    def role_checker(current_user: Annotated[dict, Depends(get_current_user)]):
        if current_user.get("role") != required_role:
            logger.warning(f"Access Forbidden: User {current_user.get('sub')} attempted to access role '{required_role}' endpoint.")
            raise HTTPException(status_code=403, detail="Forbidden")
        return current_user
    return role_checker

# ---------------- Routes ----------------
@auth_router.post("/signup")
async def signup(request: SignupRequest, db: Annotated[Session, Depends(get_db)]):
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
async def login(request: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = get_user_by_email(db, request.email)

    if not user or not bcrypt.checkpw(request.password.encode(), user.hashed_password.encode()):
        logger.warning(f"Login failed: Invalid credentials for email: {request.email}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token_data = {"sub": user.email, "role": user.user_type, "id": user.user_id}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token({"sub": user.email})

    # Optional: Save session to DB like you did before
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    session = UserSession(
        user_id=user.user_id,
        jwt_token=access_token,
        expires_at=expires_at,
        is_active=True
    )
    db.add(session)
    _commit_or_rollback(db)

    # Set Refresh Token in HttpOnly Cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        samesite="lax",
        secure=True # Set to True in production when using HTTPS
    )

    return {"access_token": access_token}

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "your-google-client-id")

@auth_router.post("/google-auth")
async def google_login(request: GoogleAuthRequest, db: Annotated[Session, Depends(get_db)]):
    logger.info("Attempting Google OAuth login.")
    try:
        idinfo = id_token.verify_oauth2_token(request.credential, grequests.Request(), GOOGLE_CLIENT_ID)
        email = idinfo["email"]
        first_name = idinfo.get("given_name", "Google")
        last_name = idinfo.get("family_name", "User")
        
        user = get_user_by_email(db, email)

        if not user:
            logger.info(f"New user registration via Google OAuth: {email} {first_name} {last_name}")
            create_user(
                db, 
                email=email, 
                password_hash="", 
                first_name=first_name, 
                last_name=last_name, 
                type="participant"
            )
            user = get_user_by_email(db, email)
        
        if not user:
             raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create or retrieve user")

        token = create_access_token({"sub": user.email, "role": user.user_type, "id": user.user_id})

        # Create a session record for tracking logins
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        session = UserSession(
            user_id=user.user_id,
            jwt_token=token,
            expires_at=expires_at,
            is_active=True
        )
        db.add(session)
        _commit_or_rollback(db)

        logger.info(f"SUCCESSFUL GOOGLE AUTH: User '{email}' logged in/authenticated. Role: {user.user_type}")
        return {"access_token": token}
    except ValueError as e:
        logger.error(f"Google token verification failed: {e.__class__.__name__}. Credential length: {len(request.credential)}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid Google token: {str(e)}")
    
@auth_router.post("/refresh", responses={401: {"description": "Refresh failed due to missing, invalid, or expired token"}})
async def refresh_token(request: Request, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")

    try:
        payload = jwt.decode(refresh_token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        email = payload.get("sub")
        user = get_user_by_email(db, email)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        # Create a new access token
        new_access_token = create_access_token(
            {"sub": user.email, "role": user.user_type, "id": user.user_id}
        )
        return {"access_token": new_access_token}

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired. Please login again.")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

@auth_router.get("/profile")
async def profile(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)]
):
    user_email = current_user.get("sub")
    logger.info(f"Fetching profile for user: {user_email}")
    
    user = get_user_by_email(db, user_email)
    
    if not user:
        logger.warning(f"Profile failed: User not found in DB for email: {user_email}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=ERROR_USER_NOT_FOUND)
        
    logger.info(f"Profile fetched successfully for user ID: {user.user_id}")
    return {"id": user.user_id, "firstName": user.first_name, "lastName": user.last_name, "email": user.email, "role": user.user_type}

@auth_router.post("/logout", responses={401: {"description": "Logout failed due to missing or invalid token"}})
async def logout(
    request: Request, 
    response: Response, # Add response here to clear cookies
    db: Session = Depends(get_db), 
    current_user: dict = Depends(get_current_user)
):
    user_email = current_user.get("sub", "N/A")
    user_id = current_user.get("id")
    
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    token = auth_header.split(" ")[1]
    payload = decode_access_token(token)
    jti = payload.get("jti")

    # 1. Revoke the Access Token (Add to blocklist)
    if jti:
        token_blocklist.add(jti)
        logger.info(f"Access token JTI {jti[:8]} revoked.")

    # 2. Clear the Refresh Token Cookie
    # This ensures the browser removes the 7-day token immediately
    response.delete_cookie(
        key="refresh_token",
        httponly=True,
        samesite="lax",
        secure=True # Match the settings used in /login
    )

    # 3. Database Cleanup (Optional but Recommended)
    # Mark the session as inactive so the refresh token can't be reused 
    if user_id:
        db.query(UserSession).filter(
            UserSession.user_id == user_id, 
            UserSession.is_active
        ).update({"is_active": False})
        db.commit()

    logger.info(f"SUCCESSFUL LOGOUT: User {user_email} logged out completely.")
    return {"msg": "Successfully logged out"}

@auth_router.get("/admin/dashboard")
async def admin_dashboard(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[dict, Depends(role_required("admin"))]
):
    user_email = current_user.get("sub", "N/A")
    logger.info(f"Admin dashboard accessed successfully by user: {user_email}")
    return {"message": "Welcome to the admin dashboard"}


@auth_router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, db: Annotated[Session, Depends(get_db)]):
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


@auth_router.post(
    "/reset-password",
    responses={
        400: { "description": "Invalid or expired reset token" }
    }
)
async def reset_password(request: ResetPasswordRequest, db: Annotated[Session, Depends(get_db)]):
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

@auth_router.post(
    "/change-password",
    responses={
        400: { "description": "User not found or incorrect old password" }
    }
)
async def change_password(
    request: ChangePasswordRequest, 
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)]
):
    user_email = current_user.get("sub")
    user = get_user_by_email(db, user_email)

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=ERROR_USER_NOT_FOUND)

    # Check if old password matches
    if not verify_password(request.old_password, user.hashed_password):
        logger.warning(f"Failed password change attempt: Incorrect old password for user {user_email}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect old password")

    # Hash new password and update
    new_hashed_password = hash_password(request.new_password)
    update_user_password(db, user_email, new_hashed_password)

    logger.info(f"Password changed successfully for user: {user_email}")
    return {"message": "Password changed successfully."}

@auth_router.get(
    "/is-google-account",
    responses={
        status.HTTP_404_NOT_FOUND: { "description": ERROR_USER_NOT_FOUND }
    }
)
async def is_google_account(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)]
):
    user_email = current_user.get("sub")
    user = get_user_by_email(db, user_email)
    
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=ERROR_USER_NOT_FOUND)
        
    # As per your requirement: Google users have an empty string as password in the DB
    is_google = user.hashed_password == ""
    
    return {"isGoogleUser": is_google}