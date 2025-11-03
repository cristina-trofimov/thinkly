from flask import Flask, request, jsonify
from flask_bcrypt import Bcrypt
from flask_jwt_extended import (
    JWTManager, create_access_token, jwt_required, get_jwt, get_jwt_identity
)
from google.oauth2 import id_token
from google.auth.transport import requests as grequests

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










