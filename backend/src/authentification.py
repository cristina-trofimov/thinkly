from flask import Flask, request, jsonify
from flask_bcrypt import Bcrypt
from flask_jwt_extended import (
    JWTManager, create_access_token, jwt_required, get_jwt, get_jwt_identity
)
from google.oauth2 import id_token
from google.auth.transport import requests as grequests
from .db import SessionLocal
from sqlalchemy.orm import Session
from typing import Optional, List
from .models.schema import User
from .DB_Methods.crudOperations import _commit_or_rollback
import os

app = Flask(__name__)
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "your-secret-key")
bcrypt = Bcrypt(app)
jwt = JWTManager(app)

from flask_cors import CORS

CORS(
    app,
    resources={r"/*": {"origins": "http://localhost:5173"}},
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "OPTIONS"]
)

from flask import Flask, request, jsonify
from flask_bcrypt import Bcrypt
from flask_jwt_extended import (
    JWTManager, create_access_token, jwt_required, get_jwt, get_jwt_identity
)
from google.oauth2 import id_token
from google.auth.transport import requests as grequests
import datetime

app = Flask(__name__)
app.config["JWT_SECRET_KEY"] = "your-secret-key"
bcrypt = Bcrypt(app)
jwt = JWTManager(app)

from flask_cors import CORS

CORS(
    app,
    resources={r"/*": {"origins": "http://localhost:5173"}},
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "OPTIONS"]
)







# Store revoked tokens (in memory or Redis for production)
token_blocklist = set()

@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    jti = jwt_payload["jti"]
    return jti in token_blocklist


users = [
    {
        "id": 1,
        "email": "admin@example.com",
        "password_hash": bcrypt.generate_password_hash("admin123").decode(),
        "provider": "local",
        "role": "admin"
    }
]



def find_user_by_id(user_id: int):
    return next((u for u in users if u["id"] == user_id), None)

def get_user_by_username(db: Session, username: str) -> Optional[User]:
    """Retrieve a user by username."""
    return db.query(User).filter(User.username == username).first()

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Retrieve a user by email."""
    return db.query(User).filter(User.email == email).first()


def search_users(db: Session, keyword: str) -> List[User]:
    """Search for users by name or email."""
    return db.query(User).filter(
        (User.username.ilike(f"%{keyword}%")) |
        (User.email.ilike(f"%{keyword}%")) |
        (User.first_name.ilike(f"%{keyword}%")) |
        (User.last_name.ilike(f"%{keyword}%"))
    ).all()

def create_user(db: Session, username: str, email: str, password_hash: str, first_name: str, last_name: str, type: str = 'user'):
    # Prevent multiple owners
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
        type=type,
    )
    db.add(new_user)
    _commit_or_rollback(db)
    db.refresh(new_user)
    return new_user


@app.post("/signup")
def signup():
    data = request.get_json()
    first_name = data["firstName"]
    last_name = data["lastName"]
    email = data["email"]
    password = data["password"]
    username = data["username"]
    
    with SessionLocal() as db:
        existing_user = get_user_by_email(db, email)
        if existing_user:
            return jsonify({"error": "User already exists"}), 400

        password_hash = bcrypt.generate_password_hash(password).decode()
        new_user = create_user(
            db,
            username=username,
            email=email,
            password_hash=password_hash,
            first_name=first_name,
            last_name=last_name,
            type="user"
        )
    return jsonify({"message": "User created"}), 201


@app.post("/login")
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")
    
    with SessionLocal() as db:
        user = get_user_by_email(email)
        if not user or not bcrypt.check_password_hash(user["password_hash"], password):
            return jsonify({"error": "Invalid credentials"}), 401
        
        # Use email (string) as identity, put role in additional_claims
        access_token = create_access_token(
            identity=user.email,
            additional_claims={"role": user.type, "id": user.user_id}
        )
    return jsonify(token=access_token)


GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "your-google-client-id")

@app.post("/google-auth")
def google_login():
    data = request.get_json()
    token = data.get("credential")  # The Google ID token from frontend

    try:
        idinfo = id_token.verify_oauth2_token(token, grequests.Request(), GOOGLE_CLIENT_ID)

        email = idinfo["email"]
        name = idinfo.get("name", "Unknown User")
        
        with SessionLocal() as db:
            user = get_user_by_email(email)
            if not user:
                new_user = create_user(
                        db,
                        username=email,
                        email=email,
                        password_hash="",  # No password for Google users
                        first_name=name,
                        last_name="",
                        type="user"
                    )
            user = get_user_by_email(email)
            access_token = create_access_token(
                identity=user.email,
                additional_claims={"role": user. type, "id": user.user_id}
            )

        return jsonify({"token": access_token})

    except ValueError as e:
        return jsonify({"error": "Invalid Google token", "details": str(e)}), 401


from functools import wraps

def role_required(role):
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            claims = get_jwt()["sub"]  # same as identity in create_access_token
            if claims.get("role") != role:
                return jsonify({"error": "Forbidden"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator

@app.get("/profile")
@jwt_required()
def profile():
    # get_jwt_identity() returns the identity you stored (email string here)
    email = get_jwt_identity()
    claims = get_jwt()   # contains additional_claims e.g. "role"
    role = claims.get("role")
    
    with SessionLocal() as db:
        user = get_user_by_email(db, email)
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        return jsonify({
            "id": user.user_id,
            "email": user.email,
            "role": role
        })
    
@app.post("/logout")
@jwt_required()
def logout():
    jti = get_jwt()["jti"]  # JWT ID
    token_blocklist.add(jti)
    return jsonify({"msg": "Successfully logged out"}), 200


@app.get("/admin/dashboard")
@role_required("admin")
def admin_dashboard():
    return jsonify({"message": "Welcome to the admin dashboard"})












