import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch
from types import SimpleNamespace

from main import app
from endpoints import authentification  # <-- your file path
from endpoints.authentification import auth_router, JWT_SECRET_KEY, JWT_ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

client = TestClient(app)


# ---------------- Fixtures ----------------

@pytest.fixture
def mock_db():
    db = Mock()
    return db


@pytest.fixture
def mock_user():
    user = Mock()
    user.user_id = 1
    user.email = "test@example.com"
    user.first_name = "John"
    user.last_name = "Doe"
    user.salt = "hashedpassword"
    user.type = "user"
    return user


@pytest.fixture
def mock_token():
    return "mocked.jwt.token"


# ---------------- Helper Functions ----------------

def override_get_db(mock_db):
    def _override():
        yield mock_db
    return _override


# ---------------- Tests ----------------

class TestAuthEndpoints:

    def test_signup_success(self, mock_db):
        with patch("endpoints.authentification.get_user_by_email", return_value=None), \
             patch("endpoints.authentification.create_user", return_value=SimpleNamespace()), \
             patch("bcrypt.hashpw", return_value=b"hashedpassword"):

            app.dependency_overrides[authentification.get_db] = override_get_db(mock_db)

            response = client.post("/auth/signup", json={
                "firstName": "John",
                "lastName": "Doe",
                "email": "test@example.com",
                "password": "password123",
                "username": "johndoe"
            })

            assert response.status_code == 200
            assert response.json() == {"message": "User created"}
            app.dependency_overrides.clear()

    def test_signup_user_exists(self, mock_db):
        with patch("endpoints.authentification.get_user_by_email", return_value=SimpleNamespace()):
            app.dependency_overrides[authentification.get_db] = override_get_db(mock_db)

            response = client.post("/auth/signup", json={
                "firstName": "John",
                "lastName": "Doe",
                "email": "test@example.com",
                "password": "password123",
                "username": "johndoe"
            })
            assert response.status_code == 400
            assert response.json()["detail"] == "User already exists"

            app.dependency_overrides.clear()

    def test_login_success(self, mock_db, mock_user):
        with patch("endpoints.authentification.get_user_by_email", return_value=mock_user), \
             patch("bcrypt.checkpw", return_value=True), \
             patch("endpoints.authentification.create_access_token", return_value="jwt_token"):

            app.dependency_overrides[authentification.get_db] = override_get_db(mock_db)

            response = client.post("/auth/login", json={"email": "test@example.com", "password": "password123"})
            assert response.status_code == 200
            assert response.json() == {"token": "jwt_token"}
            app.dependency_overrides.clear()

    def test_login_invalid_credentials(self, mock_db, mock_user):
        with patch("endpoints.authentification.get_user_by_email", return_value=mock_user), \
             patch("bcrypt.checkpw", return_value=False):

            app.dependency_overrides[authentification.get_db] = override_get_db(mock_db)

            response = client.post("/auth/login", json={"email": "test@example.com", "password": "wrongpass"})
            assert response.status_code == 401
            assert response.json()["detail"] == "Invalid credentials"
            app.dependency_overrides.clear()

    def test_google_login_new_user(self, mock_db):
        idinfo_mock = {"email": "google@example.com", "name": "Google User"}
        with patch("endpoints.authentification.id_token.verify_oauth2_token", return_value=idinfo_mock), \
             patch("endpoints.authentification.get_user_by_email", side_effect=[None, SimpleNamespace(user_id=1, email="google@example.com", type="user")]), \
             patch("endpoints.authentification.create_user", return_value=SimpleNamespace()), \
             patch("endpoints.authentification.create_access_token", return_value="jwt_token"):

            app.dependency_overrides[authentification.get_db] = override_get_db(mock_db)

            response = client.post("/auth/google-auth", json={"credential": "fake-google-token"})
            assert response.status_code == 200
            assert response.json() == {"token": "jwt_token"}
            app.dependency_overrides.clear()

    def test_google_login_invalid_token(self, mock_db):
        with patch("endpoints.authentification.id_token.verify_oauth2_token", side_effect=ValueError("invalid")):
            app.dependency_overrides[authentification.get_db] = override_get_db(mock_db)

            response = client.post("/auth/google-auth", json={"credential": "bad-token"})
            assert response.status_code == 401
            assert "Invalid Google token" in response.json()["detail"]
            app.dependency_overrides.clear()

    def test_profile_success(self, mock_db):
        # token data for get_current_user
        token_data = {"sub": "test@example.com", "role": "user", "id": 1}

        # Use a SimpleNamespace so it is JSON serializable
        mock_user_obj = SimpleNamespace(
            user_id=1,
            email="test@example.com",
            type="user"
        )

        # Override DB dependency
        app.dependency_overrides[authentification.get_db] = override_get_db(mock_db)

        # Patch get_user_by_email and decode_access_token
        with patch("endpoints.authentification.get_user_by_email", return_value=mock_user_obj), \
                patch("endpoints.authentification.decode_access_token", return_value=token_data):
            headers = {"Authorization": "Bearer fake-token"}
            response = client.get("/auth/profile", headers=headers)

        assert response.status_code == 200
        assert response.json() == {"id": 1, "email": "test@example.com", "role": "user"}

        app.dependency_overrides.clear()

    def test_logout_success(self, mock_db):
        token_payload = {"jti": "tokenid123"}
        with patch("endpoints.authentification.decode_access_token", return_value=token_payload):
            from endpoints.authentification import token_blocklist
            token_blocklist.clear()

            response = client.post("/auth/logout", headers={"Authorization": "Bearer some-token"})
            assert response.status_code == 200
            assert "Successfully logged out" in response.json()["msg"]
            assert "tokenid123" in token_blocklist

    def test_admin_dashboard_authorized(self):
        # override current_user to admin
        app.dependency_overrides[authentification.get_current_user] = lambda: {"role": "admin"}

        response = client.get("/auth/admin/dashboard")
        assert response.status_code == 200
        assert response.json() == {"message": "Welcome to the admin dashboard"}

        app.dependency_overrides.clear()