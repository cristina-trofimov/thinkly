import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from datetime import timedelta

import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

from src.endpoints import authentification_api
from src.DB_Methods import database
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
    """
    Creates a TestClient with the database dependency overridden.
    """
    def override_get_db():
        try:
            yield mock_db_session
        finally:
            pass
    
    app.dependency_overrides[database.get_db] = override_get_db
    return TestClient(app)

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
    with patch("src.endpoints.authentification_api.get_user_by_email", return_value=mock_user):
        response = client.post("/login", json=payload)
        assert response.status_code == 200
        assert "token" in response.json()

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
         patch("src.endpoints.authentification_api.create_user"):
        response = client.post("/google-auth", json={"credential": "fake-jwt-token"})
        assert response.status_code == 200
        assert "token" in response.json()

def test_profile_endpoint(client, mock_user):
    token = authentification_api.create_access_token({"sub": mock_user.email, "role": mock_user.user_type, "id": mock_user.user_id})
    with patch("src.endpoints.authentification_api.get_user_by_email", return_value=mock_user):
        response = client.get("/profile", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        assert response.json()["email"] == mock_user.email

def test_logout_revocation(client, mock_user):
    token = authentification_api.create_access_token({"sub": mock_user.email, "role": mock_user.user_type, "id": mock_user.user_id})
    response = client.post("/logout", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["msg"] == "Successfully logged out"
    response_protected = client.get("/profile", headers={"Authorization": f"Bearer {token}"})
    assert response_protected.status_code == 401
    assert response_protected.json()["detail"] == "Token has been revoked"

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