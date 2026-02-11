import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from datetime import timedelta, datetime, timezone
from jose import jwt
import sys
import os
from src.endpoints import authentification_api
from src.DB_Methods import database
from fastapi import FastAPI
import bcrypt


# Note: Environment variables are set in conftest.py which loads first

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)


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
    test_client = TestClient(app)
    yield test_client
    # Clean up after each test
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





# ---------------------EXTRA TESTS FOR FULL COVERAGE ---------------------





def test_signup_fatal_error(client):
    """Covers the 'except Exception' block in /signup"""
    payload = {"firstName": "f", "lastName": "l", "email": "err@a.com", "password": "p"}
    with patch("src.endpoints.authentification_api.get_user_by_email", return_value=None), \
         patch("src.endpoints.authentification_api.create_user", side_effect=Exception("DB Down")):
        response = client.post("/signup", json=payload)
        assert response.status_code == 500
        assert "Internal server error" in response.json()["detail"]

def test_create_user_owner_already_exists(mock_db_session):
    """Covers the logic preventing multiple owners in create_user helper"""
    from src.endpoints.authentification_api import create_user
    mock_db_session.query().filter().first.return_value = MagicMock() # Existing owner
    
    with pytest.raises(ValueError, match="Only one owner is allowed"):
        create_user(mock_db_session, "o@a.com", "hash", "f", "l", type="owner")

def test_refresh_token_expired(client):
    """Covers jwt.ExpiredSignatureError in /refresh"""
    # Create a token that expired 1 hour ago
    expired_token = jwt.encode(
        {"sub": "a@a.com", "type": "refresh", "exp": datetime.now(timezone.utc) - timedelta(hours=1)},
        authentification_api.JWT_SECRET_KEY,
        algorithm=authentification_api.JWT_ALGORITHM
    )
    client.cookies.set("refresh_token", expired_token)
    
    response = client.post("/refresh")
    assert response.status_code == 401
    assert "expired" in response.json()["detail"].lower()

def test_refresh_token_wrong_type(client):
    """Covers payload.get('type') != 'refresh' check"""
    token = authentification_api.create_access_token({"sub": "a@a.com"}) # Missing 'type': 'refresh'
    client.cookies.set("refresh_token", token)
    
    response = client.post("/refresh")
    assert response.status_code == 401
    assert "Invalid token type" in response.json()["detail"]

def test_logout_no_jti(client, mock_user):
    # Token without JTI
    token = jwt.encode({"sub": mock_user.email}, authentification_api.JWT_SECRET_KEY)
    
    with patch("src.endpoints.authentification_api.decode_access_token", 
               return_value={"sub": mock_user.email}):
        response = client.post("/logout", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        assert response.json()["msg"] == "Successfully logged out"

def test_profile_user_not_found(client, mock_user):
    """Covers the 'if not user' block in /profile"""
    token = authentification_api.create_access_token({"sub": "ghost@a.com", "role": "participant"})
    with patch("src.endpoints.authentification_api.get_user_by_email", return_value=None):
        response = client.get("/profile", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 404
        assert "User not found" in response.json()["detail"]

def test_google_auth_registration_failure(client):
    """Covers the 'if not user' safety check after create_user in google_auth"""
    mock_id_info = {"email": "err@a.com", "given_name": "G", "family_name": "U"}
    with patch("google.oauth2.id_token.verify_oauth2_token", return_value=mock_id_info), \
         patch("src.endpoints.authentification_api.get_user_by_email", return_value=None), \
         patch("src.endpoints.authentification_api.create_user"):
        # Second call to get_user_by_email also returns None
        response = client.post("/google-auth", json={"credential": "fake"})
        assert response.status_code == 500
        assert "Failed to create" in response.json()["detail"]