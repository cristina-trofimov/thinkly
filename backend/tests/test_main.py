import pytest
from fastapi.testclient import TestClient
from fastapi import HTTPException
from unittest.mock import MagicMock, patch
from datetime import timedelta, datetime, timezone

import sys
import os

# Note: Environment variables are set in conftest.py which loads first
# No need to set them here anymore

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

from src.endpoints import authentification_api
from src.database_operations import database
from fastapi import FastAPI
import bcrypt

# Create a dummy app for testing and include the router
app = FastAPI()
app.include_router(authentification_api.auth_router)

# --- Fixtures ---

@pytest.fixture
def mock_db_session():
    """Mocks the SQLAlchemy database session."""
    return MagicMock()

@pytest.fixture
def client(mock_db_session):
    # Overriding get_db for the app used in these tests
    app.dependency_overrides[database.get_db] = lambda: mock_db_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def mock_user():
    user = MagicMock()
    user.user_id = 1
    user.email = "test@example.com"
    user.first_name = "Test"
    user.last_name = "User"
    user.user_type = "participant"
    user.hashed_password = bcrypt.hashpw(b"password123", bcrypt.gensalt()).decode("utf-8")
    return user

@pytest.fixture
def admin_user(mock_user):
    """Creates a mock admin user."""
    mock_user.user_type = "admin"
    return mock_user

# --- Existing Tests ---

def test_signup_success(client, mock_db_session):
    payload = {
        "firstName": "Tina",
        "lastName": "Test",
        "email": "tina@example.com",
        "password": "password123"
    }
    with patch("src.endpoints.authentification_api.get_user_by_email", return_value=None), \
         patch("src.endpoints.authentification_api.create_user") as mock_create:
        response = client.post("/signup", json=payload)
        assert response.status_code == 200
        assert response.json() == {"message": "User created"}
        mock_create.assert_called_once()

def test_signup_existing_user(client):
    payload = {
        "firstName": "Tina",
        "lastName": "Test",
        "email": "existing@example.com",
        "password": "password123"
    }
    with patch("src.endpoints.authentification_api.get_user_by_email", return_value=MagicMock()):
        response = client.post("/signup", json=payload)
        assert response.status_code == 400
        assert response.json()["detail"] == "User already exists"

def test_login_success(client, mock_user):
    payload = {"email": "test@example.com", "password": "password123"}
    with patch("src.endpoints.authentification_api.get_user_by_email", return_value=mock_user), \
         patch("src.endpoints.authentification_api._commit_or_rollback"):
        response = client.post("/login", json=payload)
        
        assert response.status_code == 200
        assert "access_token" in response.json()
        assert "refresh_token" in response.cookies

def test_login_wrong_password(client, mock_user):
    payload = {"email": "test@example.com", "password": "WRONG_PASSWORD"}
    with patch("src.endpoints.authentification_api.get_user_by_email", return_value=mock_user):
        response = client.post("/login", json=payload)
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid credentials"

def test_google_auth_success(client):
    mock_google_data = {
        "email": "googleuser@example.com",
        "given_name": "Google",
        "family_name": "User"
    }
    new_google_user = MagicMock()
    new_google_user.email = "googleuser@example.com"
    new_google_user.user_type = "participant"
    new_google_user.user_id = 99

    with patch("google.oauth2.id_token.verify_oauth2_token", return_value=mock_google_data), \
         patch("src.endpoints.authentification_api.get_user_by_email", side_effect=[None, new_google_user]), \
         patch("src.endpoints.authentification_api.create_user"), \
         patch("src.endpoints.authentification_api._commit_or_rollback"):
        response = client.post("/google-auth", json={"credential": "fake-jwt-token"})
        assert response.status_code == 200
        assert "access_token" in response.json()

def test_profile_endpoint(client, mock_user, mock_db_session):
    token = authentification_api.create_access_token({
        "sub": mock_user.email, 
        "role": mock_user.user_type, 
        "id": mock_user.user_id,
        "jti": "some-unique-id" 
    })
    mock_session = MagicMock()
    mock_session.is_active = True
    
    with patch("src.endpoints.authentification_api.get_user_by_email", return_value=mock_user), \
         patch.object(mock_db_session.query(), "filter", return_value=mock_db_session.query()), \
         patch.object(mock_db_session.query(), "first", return_value=mock_session):
        
        response = client.get("/profile", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        assert response.json()["email"] == mock_user.email
        
def test_refresh_token_success(client, mock_user, mock_db_session):
    # Create a valid refresh token
    refresh_token = authentification_api.create_refresh_token({"sub": mock_user.email})
    client.cookies.set("refresh_token", refresh_token)

    with patch("src.endpoints.authentification_api.get_user_by_email", return_value=mock_user):
        response = client.post("/refresh")
        
        assert response.status_code == 200
        assert "access_token" in response.json()       

def test_admin_dashboard_access_denied(client, mock_user):
    token = authentification_api.create_access_token({"sub": mock_user.email, "role": "participant", "id": mock_user.user_id})
    response = client.get("/admin/dashboard", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403

def test_admin_dashboard_access_granted(client, admin_user):
    token = authentification_api.create_access_token({"sub": admin_user.email, "role": "admin", "id": admin_user.user_id})
    response = client.get("/admin/dashboard", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["message"] == "Welcome to the admin dashboard"

# --- NEW TESTS for missing endpoints ---

def test_forgot_password_user_exists(client, mock_user):
    """Test that a reset email is triggered if the user exists."""
    with patch("src.endpoints.authentification_api.get_user_by_email", return_value=mock_user), \
         patch("src.endpoints.authentification_api.send_email_via_brevo") as mock_email:
        response = client.post("/forgot-password", json={"email": "test@example.com"})
        assert response.status_code == 200
        assert "password reset email has been sent" in response.json()["message"]
        mock_email.assert_called_once()

def test_forgot_password_user_not_exists(client):
    """Test that the API returns the same message even if user doesn't exist (security)."""
    with patch("src.endpoints.authentification_api.get_user_by_email", return_value=None), \
         patch("src.endpoints.authentification_api.send_email_via_brevo") as mock_email:
        response = client.post("/forgot-password", json={"email": "nonexistent@example.com"})
        assert response.status_code == 200
        assert "password reset email has been sent" in response.json()["message"]
        mock_email.assert_not_called()

def test_reset_password_success(client, mock_user):
    """Test resetting password with a valid token."""
    reset_token = authentification_api.create_access_token(
        data={"sub": mock_user.email, "purpose": "password_reset"},
        expires_delta=timedelta(hours=1)
    )
    payload = {"token": reset_token, "new_password": "newpassword123"}
    with patch("src.endpoints.authentification_api.get_user_by_email", return_value=mock_user), \
         patch("src.endpoints.authentification_api.update_user_password") as mock_update:
        response = client.post("/reset-password", json=payload)
        assert response.status_code == 200
        assert response.json()["message"] == "Password has been reset successfully."
        mock_update.assert_called_once()

def test_reset_password_invalid_token(client):
    """Test that reset fails with an invalid token."""
    payload = {"token": "invalid-token", "new_password": "newpassword123"}
    response = client.post("/reset-password", json=payload)
    assert response.status_code == 400
    assert "Invalid reset token" in response.json()["detail"]

def test_change_password_success(client, mock_user):
    """Test changing password while logged in."""
    token = authentification_api.create_access_token({"sub": mock_user.email, "role": "participant", "id": mock_user.user_id})
    payload = {"old_password": "password123", "new_password": "newsecurepassword123"}
    
    with patch("src.endpoints.authentification_api.get_user_by_email", return_value=mock_user), \
         patch("src.endpoints.authentification_api.verify_password", return_value=True), \
         patch("src.endpoints.authentification_api.update_user_password") as mock_update:
        response = client.post(
            "/change-password",
            json=payload,
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        assert response.json()["message"] == "Password changed successfully."
        mock_update.assert_called_once()

def test_change_password_wrong_old_password(client, mock_user):
    """Test that change password fails if old password is wrong."""
    token = authentification_api.create_access_token({"sub": mock_user.email, "role": "participant", "id": mock_user.user_id})
    payload = {"old_password": "wrongpassword", "new_password": "newsecurepassword123"}
    
    with patch("src.endpoints.authentification_api.get_user_by_email", return_value=mock_user), \
         patch("src.endpoints.authentification_api.verify_password", return_value=False):
        response = client.post(
            "/change-password",
            json=payload,
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 400
        assert response.json()["detail"] == "Incorrect old password"

def test_is_google_account_true(client, mock_user):
    """Test is_google_account returns True when hashed_password is empty."""
    token = authentification_api.create_access_token({"sub": mock_user.email, "role": "participant", "id": mock_user.user_id})
    mock_user.hashed_password = ""
    
    with patch("src.endpoints.authentification_api.get_user_by_email", return_value=mock_user):
        response = client.get("/is-google-account", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        assert response.json()["isGoogleUser"] is True

def test_is_google_account_false(client, mock_user):
    """Test is_google_account returns False when hashed_password is not empty."""
    token = authentification_api.create_access_token({"sub": mock_user.email, "role": "participant", "id": mock_user.user_id})
    
    with patch("src.endpoints.authentification_api.get_user_by_email", return_value=mock_user):
        response = client.get("/is-google-account", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        assert response.json()["isGoogleUser"] is False
        
def test_role_required_wrong_role(client, mock_user):
    """Test accessing an admin route with a participant role."""
    token = authentification_api.create_access_token({"sub": mock_user.email, "role": "participant", "id": mock_user.user_id})
    response = client.get("/admin/dashboard", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403
    assert response.json()["detail"] == "Forbidden"
    

    
    
def test_create_user_owner_already_exists(mock_db_session):
    """Test the logic that prevents multiple owners."""
    existing_owner = MagicMock()
    # Mock query to return an existing owner
    mock_db_session.query().filter().first.return_value = existing_owner
    
    with pytest.raises(ValueError, match="Only one owner is allowed"):
        authentification_api.create_user(mock_db_session, "o@a.com", "hash", "f", "l", type="owner")

def test_signup_fatal_error(client):
    """Test the 'except Exception' block in signup."""
    payload = {"firstName": "f", "lastName": "l", "email": "err@a.com", "password": "p"}
    with patch("src.endpoints.authentification_api.get_user_by_email", return_value=None), \
         patch("src.endpoints.authentification_api.create_user", side_effect=Exception("DB Down")):
        response = client.post("/signup", json=payload)
        assert response.status_code == 500
        assert "Internal server error" in response.json()["detail"]
        
def test_refresh_token_expired(client):
    """Test the ExpiredSignatureError block in refresh."""
    # Create a token that expired 1 hour ago
    token = authentification_api.create_access_token({"sub": "a@a.com"}, expires_delta=timedelta(hours=-1))
    client.cookies.set("refresh_token", token)
    
    response = client.post("/refresh")
    assert response.status_code == 401
    assert "expired" in response.json()["detail"].lower()

def test_refresh_token_wrong_type(client):
    """Test passing an access token to the refresh endpoint."""
    access_token = authentification_api.create_access_token({"sub": "a@a.com"})
    client.cookies.set("refresh_token", access_token)
    
    response = client.post("/refresh")
    assert response.status_code == 401
    assert "Invalid token type" in response.json()["detail"]

def test_logout_missing_authorization_header(client, mock_user):
    """Test logout without Authorization header in the actual request."""
    # The get_current_user dependency will reject requests without proper auth
    response = client.post("/logout")  # No headers
    assert response.status_code == 401
    # The actual error is "Missing token" from get_current_user
    assert "Missing token" in response.json()["detail"]


def test_get_current_user_missing_token(client):
    """Test accessing protected endpoint without token."""
    response = client.get("/profile")
    assert response.status_code == 401
    assert "Missing token" in response.json()["detail"]

def test_get_current_user_invalid_token_format(client):
    """Test with malformed Authorization header."""
    response = client.get("/profile", headers={"Authorization": "InvalidFormat"})
    assert response.status_code == 401
    assert "Missing token" in response.json()["detail"]

def test_verify_token_no_email(client):
    from jose import jwt
    # Create token without 'sub' claim
    bad_token = jwt.encode({"jti": "test"}, authentification_api.JWT_SECRET_KEY, algorithm=authentification_api.JWT_ALGORITHM)
    
    # The code correctly raises HTTPException 400
    with pytest.raises(HTTPException) as excinfo:
        authentification_api.verify_token(bad_token)
    assert excinfo.value.status_code == 400
    assert excinfo.value.detail == "Invalid token"

def test_verify_token_invalid_jwt(client):
    # The code correctly raises HTTPException 400
    with pytest.raises(HTTPException) as excinfo:
        authentification_api.verify_token("completely-invalid-token")
    assert excinfo.value.status_code == 400

def test_verify_token_expired(client):
    """Test verify_token with expired token."""
    from jose import jwt
    
    # Create expired token
    payload = {
        "sub": "test@example.com",
        "exp": datetime.now(timezone.utc) - timedelta(hours=1)
    }
    expired_token = jwt.encode(payload, authentification_api.JWT_SECRET_KEY, algorithm=authentification_api.JWT_ALGORITHM)
    
    with pytest.raises(HTTPException) as exc_info:
        authentification_api.verify_token(expired_token)
    assert exc_info.value.status_code == 400
    assert "expired" in exc_info.value.detail.lower()

def test_decode_access_token_invalid(client):
    """Test decode_access_token with invalid token."""
    with pytest.raises(HTTPException) as exc_info:
        authentification_api.decode_access_token("invalid-token")
    assert exc_info.value.status_code == 401

def test_profile_user_not_found(client, mock_user):
    """Test profile endpoint when user is not in database."""
    token = authentification_api.create_access_token({
        "sub": "nonexistent@example.com",
        "role": "participant",
        "id": 999
    })
    
    with patch("src.endpoints.authentification_api.get_user_by_email", return_value=None):
        response = client.get("/profile", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 404
        assert "User not found" in response.json()["detail"]

def test_google_auth_user_creation_failure(client):
    """Test Google auth when user creation fails."""
    mock_google_data = {
        "email": "googleuser@example.com",
        "given_name": "Google",
        "family_name": "User"
    }
    
    with patch("google.oauth2.id_token.verify_oauth2_token", return_value=mock_google_data), \
         patch("src.endpoints.authentification_api.get_user_by_email", return_value=None), \
         patch("src.endpoints.authentification_api.create_user"):
        response = client.post("/google-auth", json={"credential": "fake-jwt-token"})
        assert response.status_code == 500
        assert "Failed to create or retrieve user" in response.json()["detail"]

def test_google_auth_invalid_token(client):
    """Test Google auth with invalid credential."""
    with patch("google.oauth2.id_token.verify_oauth2_token", side_effect=ValueError("Invalid token")):
        response = client.post("/google-auth", json={"credential": "invalid-token"})
        assert response.status_code == 401
        assert "Invalid Google token" in response.json()["detail"]

def test_refresh_token_missing(client):
    """Test refresh endpoint without refresh token."""
    response = client.post("/refresh")
    assert response.status_code == 401
    assert "Refresh token missing" in response.json()["detail"]

def test_refresh_token_invalid_jwt(client):
    """Test refresh endpoint with malformed token."""
    client.cookies.set("refresh_token", "invalid-token")
    response = client.post("/refresh")
    assert response.status_code == 401
    assert "Invalid refresh token" in response.json()["detail"]

def test_refresh_token_user_not_found(client):
    """Test refresh when user no longer exists."""
    refresh_token = authentification_api.create_refresh_token({"sub": "deleted@example.com"})
    client.cookies.set("refresh_token", refresh_token)
    
    with patch("src.endpoints.authentification_api.get_user_by_email", return_value=None):
        response = client.post("/refresh")
        assert response.status_code == 401
        assert "User not found" in response.json()["detail"]

def test_reset_password_wrong_purpose(client, mock_user):
    """Test reset password with token that has wrong purpose."""
    # Create token without password_reset purpose
    token = authentification_api.create_access_token(
        data={"sub": mock_user.email, "purpose": "other"},
        expires_delta=timedelta(hours=1)
    )
    payload = {"token": token, "new_password": "newpassword123"}
    
    response = client.post("/reset-password", json=payload)
    assert response.status_code == 400
    assert "Invalid or expired reset token" in response.json()["detail"]

def test_reset_password_no_email_in_token(client):
    """Test reset password with token missing email."""
    from jose import jwt
    
    # Create token without sub
    token = jwt.encode(
        {"purpose": "password_reset", "exp": datetime.now(timezone.utc) + timedelta(hours=1)},
        authentification_api.JWT_SECRET_KEY,
        algorithm=authentification_api.JWT_ALGORITHM
    )
    payload = {"token": token, "new_password": "newpassword123"}
    
    response = client.post("/reset-password", json=payload)
    assert response.status_code == 400
    assert "Invalid or expired reset token" in response.json()["detail"]

def test_reset_password_expired_token(client):
    """Test reset password with expired token."""
    from jose import jwt
    
    expired_payload = {
        "sub": "test@example.com",
        "purpose": "password_reset",
        "exp": datetime.now(timezone.utc) - timedelta(hours=1)
    }
    expired_token = jwt.encode(expired_payload, authentification_api.JWT_SECRET_KEY, algorithm=authentification_api.JWT_ALGORITHM)
    payload = {"token": expired_token, "new_password": "newpassword123"}
    
    response = client.post("/reset-password", json=payload)
    assert response.status_code == 400
    assert "expired" in response.json()["detail"].lower()

def test_reset_password_user_not_found(client):
    """Test reset password when user doesn't exist."""
    reset_token = authentification_api.create_access_token(
        data={"sub": "nonexistent@example.com", "purpose": "password_reset"},
        expires_delta=timedelta(hours=1)
    )
    payload = {"token": reset_token, "new_password": "newpassword123"}
    
    with patch("src.endpoints.authentification_api.get_user_by_email", return_value=None):
        response = client.post("/reset-password", json=payload)
        assert response.status_code == 400
        assert "Invalid or expired reset token" in response.json()["detail"]

def test_change_password_user_not_found(client):
    """Test change password when user doesn't exist."""
    token = authentification_api.create_access_token({"sub": "deleted@example.com", "role": "participant", "id": 999})
    payload = {"old_password": "oldpass", "new_password": "newpass123"}
    
    with patch("src.endpoints.authentification_api.get_user_by_email", return_value=None):
        response = client.post(
            "/change-password",
            json=payload,
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 404
        assert "User not found" in response.json()["detail"]

def test_is_google_account_user_not_found(client):
    """Test is_google_account when user doesn't exist."""
    token = authentification_api.create_access_token({"sub": "deleted@example.com", "role": "participant", "id": 999})
    
    with patch("src.endpoints.authentification_api.get_user_by_email", return_value=None):
        response = client.get("/is-google-account", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 404
        assert "User not found" in response.json()["detail"]

def test_update_user_password_user_not_found(mock_db_session):
    """Test update_user_password when user doesn't exist."""
    mock_db_session.query().filter().first.return_value = None
    
    with pytest.raises(ValueError, match="User not found"):
        authentification_api.update_user_password(mock_db_session, "nonexistent@example.com", "newhash")

def test_login_user_not_found(client):
    """Test login with non-existent user."""
    payload = {"email": "nonexistent@example.com", "password": "password123"}
    
    with patch("src.endpoints.authentification_api.get_user_by_email", return_value=None):
        response = client.post("/login", json=payload)
        assert response.status_code == 401
        assert "Invalid credentials" in response.json()["detail"]