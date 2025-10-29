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

def find_user_by_email(email: str):
    return next((u for u in users if u["email"] == email), None)

def find_user_by_id(user_id: int):
    return next((u for u in users if u["id"] == user_id), None)



@app.post("/signup")
def signup():
    data = request.get_json()
    email = data["email"]
    password = data["password"]

    if any(u["email"] == email for u in users):
        return jsonify({"error": "User already exists"}), 400

    password_hash = bcrypt.generate_password_hash(password).decode()
    new_user = {
        "id": len(users) + 1,
        "email": email,
        "password_hash": password_hash,
        "provider": "local",
        "role": "student"  # default role
    }
    users.append(new_user)
    return jsonify({"message": "User created"}), 201


@app.post("/login")
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    user = find_user_by_email(email)
    if not user or not bcrypt.check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid credentials"}), 401

    # Use email (string) as identity, put role in additional_claims
    access_token = create_access_token(
        identity=user["email"],
        additional_claims={"role": user["role"]}
    )
    return jsonify(token=access_token)


GOOGLE_CLIENT_ID = "622761118132-r0i8qolh6dpgmovcjb2qiur4lm7mpfmq.apps.googleusercontent.com"

@app.post("/google-auth")
def google_login():
    data = request.get_json()
    token = data.get("credential")  # The Google ID token from frontend

    try:
        idinfo = id_token.verify_oauth2_token(token, grequests.Request(), GOOGLE_CLIENT_ID)

        email = idinfo["email"]
        name = idinfo.get("name", "Unknown User")

        user = next((u for u in users if u["email"] == email), None)
        
        if not user:
            user = {
                "id": len(users) + 1,
                "email": email,
                "password_hash": None,
                "provider": "google",
                "role": "student"  # default role maybe
            }
            users.append(user)

        # Issue your own JWT for session
        access_token = create_access_token(
            identity=user["email"],
            additional_claims={"role": user["role"], "id": user["id"]}
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

    # Find full user record in DB by email
    user = find_user_by_email(email)
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Return whatever you need — avoid returning password hashes
    return jsonify({
        "id": user["id"],
        "email": user["email"],
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

