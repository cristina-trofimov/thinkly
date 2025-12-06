import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch

import sys
import os

# 1. Get the path to the 'backend' folder (the parent of 'tests')
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)

# 2. Add 'backend' to the system path so Python can find 'src'
sys.path.append(parent_dir)

# 3. NOW import the file following the folder structure
# Note: We use the actual filename 'authentification_api' (no .py)
from src.endpoints import authentification_api
from src.DB_Methods import database

# --- Setup: Import the app and router ---
# We assume your file is named 'auth.py'. 
# If it is named differently, change 'from auth import ...' below.
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
    This ensures we don't hit a real database.
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
    """Creates a mock user object behaving like a SQLAlchemy model."""
    user = MagicMock()
    user.user_id = 1
    user.email = "test@example.com"
    user.username = "testuser"
    user.first_name = "Test"
    user.last_name = "User"
    user.type = "participant"
    # Generate a real hash for "password123" so bcrypt.checkpw works
    user.salt = bcrypt.hashpw(b"password123", bcrypt.gensalt()).decode() 
    return user

@pytest.fixture
def admin_user(mock_user):
    """Creates a mock admin user."""
    mock_user.type = "admin"
    return mock_user

# --- Tests ---

def test_signup_success(client, mock_db_session):
    """Test that a new user can sign up successfully."""
    payload = {
        "firstName": "Tina",
        "lastName": "Test",
        "email": "tina@example.com",
        "password": "password123",
        "username": "tinatest"
    }

    # Patch the helper function 'get_user_by_email' to return None (user doesn't exist)
    # Patch 'create_user' to verify it gets called
    with patch("auth.get_user_by_email", return_value=None), \
         patch("auth.create_user") as mock_create:
        
        response = client.post("/signup", json=payload)
        
        assert response.status_code == 200
        assert response.json() == {"message": "User created"}
        mock_create.assert_called_once()

def test_signup_existing_user(client):
    """Test that signing up with an existing email fails."""
    payload = {
        "firstName": "Tina",
        "lastName": "Test",
        "email": "existing@example.com",
        "password": "password123",
        "username": "tinatest"
    }

    # Mock that a user ALREADY exists
    with patch("auth.get_user_by_email", return_value=MagicMock()):
        response = client.post("/signup", json=payload)
        assert response.status_code == 400
        assert response.json()["detail"] == "User already exists"

def test_login_success(client, mock_user):
    """Test successful login returns a token."""
    payload = {
        "email": "test@example.com",
        "password": "password123"
    }

    # Mock DB finding the user
    with patch("auth.get_user_by_email", return_value=mock_user):
        response = client.post("/login", json=payload)
        
        assert response.status_code == 200
        assert "token" in response.json()

def test_login_wrong_password(client, mock_user):
    """Test login fails with incorrect password."""
    payload = {
        "email": "test@example.com",
        "password": "WRONG_PASSWORD"
    }

    with patch("auth.get_user_by_email", return_value=mock_user):
        response = client.post("/login", json=payload)
        assert response.status_code == 401
        assert response.json()["detail"] == "Invalid credentials"

def test_google_auth_success(client):
    """Test Google OAuth flow with mocked Google API."""
    
    # Mock data returned by Google
    mock_google_data = {
        "email": "googleuser@example.com",
        "name": "Google User"
    }
    
    # We create a new user object for this test
    new_google_user = MagicMock()
    new_google_user.email = "googleuser@example.com"
    new_google_user.type = "participant"
    new_google_user.user_id = 99

    # 1. Mock the verify_oauth2_token (Google API call)
    # 2. Mock get_user_by_email (return None first to simulate new user, then return user)
    # 3. Mock create_user
    with patch("google.oauth2.id_token.verify_oauth2_token", return_value=mock_google_data), \
         patch("auth.get_user_by_email", side_effect=[None, new_google_user]), \
         patch("auth.create_user"):
        
        response = client.post("/google-auth", json={"credential": "fake-jwt-token"})
        
        assert response.status_code == 200
        assert "token" in response.json()

def test_profile_endpoint(client, mock_user):
    """Test accessing a protected route with a valid token."""
    
    # Create a valid token manually using your helper function
    token = authentification_api.create_access_token({"sub": mock_user.email, "role": mock_user.type, "id": mock_user.user_id})
    
    with patch("auth.get_user_by_email", return_value=mock_user):
        response = client.get(
            "/profile", 
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        assert response.json()["email"] == mock_user.email

def test_logout_revocation(client, mock_user):
    """Test that logging out adds the token ID (jti) to the blocklist."""
    
    # 1. Generate token
    token = authentification_api.create_access_token({"sub": mock_user.email, "role": mock_user.type, "id": mock_user.user_id})
    
    # 2. Call Logout
    response = client.post(
        "/logout",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.json()["msg"] == "Successfully logged out"

    # 3. Verify accessing Profile with the SAME token now fails
    # We expect 401 because the JTI is now in token_blocklist
    response_protected = client.get(
        "/profile",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response_protected.status_code == 401
    assert response_protected.json()["detail"] == "Token has been revoked"

def test_admin_dashboard_access_denied(client, mock_user):
    """Test that a regular 'participant' cannot access admin dashboard."""
    
    # User is 'participant'
    token = authentification_api.create_access_token({"sub": mock_user.email, "role": "participant", "id": mock_user.user_id})
    
    response = client.get(
        "/admin/dashboard",
        headers={"Authorization": f"Bearer {token}"}
    )
    # Expect 403 Forbidden
    assert response.status_code == 403

def test_admin_dashboard_access_granted(client, admin_user):
    """Test that an 'admin' can access admin dashboard."""
    
    # User is 'admin'
    token = authentification_api.create_access_token({"sub": admin_user.email, "role": "admin", "id": admin_user.user_id})
    
    response = client.get(
        "/admin/dashboard",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Welcome to the admin dashboard"