from datetime import datetime, timedelta, timezone
import os
import uuid
import bcrypt
import jwt
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from src.models.schema import UserAccount
from dotenv import load_dotenv
from models import SessionModel as UserSession

load_dotenv()
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://postgres:postgres@localhost:5432/ThinklyDB"
)
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "JWT_SECRET")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
SESSION_DURATION_HOURS = int(os.getenv("SESSION_DURATION_HOURS", "2"))

# Setup
def get_db():
    """
    Dependency-style generator for getting a new database session.
    Usage example:
        with next(get_db()) as db:
            ...
    Or inside FastAPI:
        Depends(get_db)
    """

    engine = create_engine(DATABASE_URL, echo=False)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Helper functions
def _commit_or_rollback(db: Session):
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

def _generate_jwt(user_id: int) -> str:
    """Generate a JWT token for the given user ID."""
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=SESSION_DURATION_HOURS)  # Token expires in 1 hour
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def _verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a bcrypt hash."""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

# User Account Operations
def create_user_account(session: Session, username: str, email: str, hashed_password: str, user_type: str = 'regular') -> UserAccount:
    """Create a new user account."""
    new_user = UserAccount()
    new_user.username = username
    new_user.email = email
    new_user.hashed_password = hashed_password
    new_user.user_type = user_type

    session.add(new_user)
    _commit_or_rollback(session)
    session.refresh(new_user)
    return new_user

def get_user_by_username(session: Session, username: str) -> UserAccount | None:
    """Retrieve a user account by username."""
    return session.scalar(select(UserAccount).where(UserAccount.username == username))

def update_user_by_user_id(session: Session, user_id: int, new_user: UserAccount) -> UserAccount | None:
    """Update a user account by user ID."""
    user = session.get(UserAccount, user_id)
    if user:
        user.username = new_user.username
        user.email = new_user.email
        user.hashed_password = new_user.hashed_password
        user.user_type = new_user.user_type

        _commit_or_rollback(session)
        session.refresh(user)
        return user
    return None

def delete_user_account(session: Session, user_id: int) -> None:
    """Delete a user account by user ID."""
    user = session.get(UserAccount, user_id)
    if user:
        session.delete(user)
        _commit_or_rollback(session)

def login_user(db: Session, username: str, password: str):

    user = db.query(UserAccount).filter(UserAccount.username == username).first()
    if not user or not _verify_password(password, user.salt):
        raise ValueError("Invalid username or password")

    db.query(UserSession).filter(
        UserSession.user_id == user.user_id,
        UserSession.is_active
    ).update({"is_active": False})
    db.commit()

    jwt_token = _generate_jwt(user.user_id)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=SESSION_DURATION_HOURS)

    new_session = UserSession(
        session_id=str(uuid.uuid4()),
        user_id=user.user_id,
        jwt_token=jwt_token,
        expires_at=expires_at,
        is_active=True
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    return {
        "user_id": user.user_id,
        "username": user.username,
        "access_token": jwt_token,
        "expires_at": expires_at
    }