import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from typing import Optional
from db import SessionLocal
from models.schema import User
from DB_Methods.crudOperations import _commit_or_rollback
from google.oauth2 import id_token
from google.auth.transport import requests as grequests
from jose import jwt, JWTError
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import uuid


load_dotenv()
auth_router = APIRouter(tags=["Authentication"])
token_blocklist = set()

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 180


# ---------------- Models ----------------
class SignupRequest(BaseModel):
    firstName: str
    lastName: str
    email: EmailStr
    password: str
    username: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class GoogleAuthRequest(BaseModel):
    credential: str

# ---------------- DB helpers ----------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()

def create_user(db: Session, username: str, email: str, password_hash: str, first_name: str, last_name: str, type: str = 'participant'):
    if type == 'owner':
        existing_owner = db.query(User).filter(User.type == 'owner').first()
        if existing_owner:
            raise ValueError("An owner already exists. Only one owner is allowed.")
    new_user = User(
        username=username,
        email=email,
        first_name=first_name,
        last_name=last_name,
        salt=password_hash,
        type=type
    )
    db.add(new_user)
    _commit_or_rollback(db)
    db.refresh(new_user)
    return new_user

# ---------------- JWT helpers ----------------
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta if expires_delta else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
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
            raise HTTPException(status_code=401, detail="Token has been revoked")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = auth_header.split(" ")[1]
    claims = decode_access_token(token)
    return claims

def role_required(required_role: str):
    def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user.get("role") != required_role:
            raise HTTPException(status_code=403, detail="Forbidden")
        return current_user
    return role_checker

# ---------------- Routes ----------------
@auth_router.post("/signup")
async def signup(request: SignupRequest, db: Session = Depends(get_db)):
    if get_user_by_email(db, request.email):
        raise HTTPException(status_code=400, detail="User already exists")
    password_hash = bcrypt.hashpw(request.password.encode(), bcrypt.gensalt()).decode()
    create_user(db, request.username, request.email, password_hash, request.firstName, request.lastName)
    return {"message": "User created"}

@auth_router.post("/login")
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, request.email)
    if not user or not bcrypt.checkpw(request.password.encode(), user.salt.encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": user.email, "role": user.type, "id": user.user_id})
    return {"token": token}

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "your-google-client-id")

@auth_router.post("/google-auth")
async def google_login(request: GoogleAuthRequest, db: Session = Depends(get_db)):
    try:
        idinfo = id_token.verify_oauth2_token(request.credential, grequests.Request(), GOOGLE_CLIENT_ID)
        email = idinfo["email"]
        name = idinfo.get("name", "Unknown User")
        user = get_user_by_email(db, email)
        if not user:
            create_user(db, username=email, email=email, password_hash="", first_name=name, last_name="", type="participant")
            user = get_user_by_email(db, email)
        token = create_access_token({"sub": user.email, "role": user.type, "id": user.user_id})
        return {"token": token}
    except ValueError as e:
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {str(e)}")

@auth_router.get("/profile")
async def profile(db: Session = Depends(get_db),current_user: dict = Depends(get_current_user)):
    email = current_user.get("sub")
    user = get_user_by_email(db, email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"id": user.user_id, "email": user.email, "role": user.type}


@auth_router.post("/logout")
async def logout(request: Request, current_user: dict = Depends(get_current_user)):
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    token = auth_header.split(" ")[1]
    payload = decode_access_token(token)

    jti = payload.get("jti")
    if not jti:
        # Tokens without jti can't be revoked, but don't crash
        return {"msg": "Token does not support logout / already stateless"}

    token_blocklist.add(jti)
    return {"msg": "Successfully logged out"}

@auth_router.get("/admin/dashboard")
async def admin_dashboard(db: Session = Depends(get_db),current_user: dict = Depends(role_required("admin"))):
    return {"message": "Welcome to the admin dashboard"}











