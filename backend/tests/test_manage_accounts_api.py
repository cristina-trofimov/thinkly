import pytest
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient
from endpoints.manage_accounts_api import get_db
from main import app

client = TestClient(app)


@pytest.fixture
def mock_db():
    """Fixture to create a mock database session"""
    db = Mock()
    db.begin = MagicMock()
    db.begin.return_value.__enter__ = Mock()
    db.begin.return_value.__exit__ = Mock(return_value=False)
    return db


@pytest.fixture
def mock_user():
    """Fixture for mock user data"""
    user = Mock()
    user.user_id = 2
    user.first_name = "John"
    user.last_name = "Doe"
    user.email = "johndoe@example.com"
    user.type = "participant"
    return user


class TestManageAccountsAPI:
    """Tests for the Manage Accounts API endpoints"""

    def test_get_users_no_user(self, mock_db):
        """Test getting users when database is empty"""
        def override_get_db():
            yield mock_db
        app.dependency_overrides[get_db] = override_get_db

        with patch("endpoints.manage_accounts_api.get_all_users", return_value=[]):
            response = client.get("/manageAccounts/users")
            assert response.status_code == 200
            assert response.json() == []

        app.dependency_overrides.clear()

    def test_get_users_one_user(self, mock_db, mock_user):
        """Test getting a single user from database"""
        def override_get_db():
            yield mock_db
        app.dependency_overrides[get_db] = override_get_db

        with patch("endpoints.manage_accounts_api.get_all_users", return_value=[mock_user]):
            response = client.get("/manageAccounts/users")
            data = response.json()
            assert response.status_code == 200
            assert len(data) == 1
            assert data[0]["user_id"] == 2
            assert data[0]["first_name"] == "John"
            assert data[0]["last_name"] == "Doe"
            assert data[0]["email"] == "johndoe@example.com"
            assert data[0]["type"] == "participant"

        app.dependency_overrides.clear()

    def test_get_users_multiple_users(self, mock_db):
        """Test getting multiple users from database"""
        user1 = Mock(user_id=1, first_name="John", last_name="Doe", email="jd@example.com", type="participant")
        user2 = Mock(user_id=2, first_name="Jane", last_name="Smith", email="js@example.com", type="admin")
        users_list = [user1, user2]

        def override_get_db():
            yield mock_db
        app.dependency_overrides[get_db] = override_get_db

        with patch("endpoints.manage_accounts_api.get_all_users", return_value=users_list):
            response = client.get("/manageAccounts/users")
            data = response.json()
            assert response.status_code == 200
            assert len(data) == 2
            assert data[0]["user_id"] == 1
            assert data[0]["email"] == "jd@example.com"
            assert data[1]["user_id"] == 2
            assert data[1]["type"] == "admin"

        app.dependency_overrides.clear()

    def test_delete_users_success(self, mock_db, mock_user):
        """Successfully delete users"""
        def override_get_db():
            yield mock_db
        app.dependency_overrides[get_db] = override_get_db

        mock_user.user_id = 10
        mock_user.first_name = "Mike"
        mock_user.last_name = "Ross"

        with patch("endpoints.manage_accounts_api.get_user_by_id", return_value=mock_user), \
             patch("endpoints.manage_accounts_api.delete_user_full") as mock_delete:
            payload = {"user_ids": [10]}
            response = client.request("DELETE", "/manageAccounts/users/batch-delete", json=payload)
            data = response.json()

            assert response.status_code == 200
            assert data["deleted_count"] == 1
            assert data["total_requested"] == 1
            assert data["message"] == "Deleted 1 users successfully"
            assert len(data["deleted_users"]) == 1
            assert data["deleted_users"][0]["user_id"] == 10
            assert data["deleted_users"][0]["first_name"] == "Mike"
            assert data["errors"] is None
            mock_delete.assert_called_once_with(mock_db, 10)

        app.dependency_overrides.clear()

    def test_delete_users_multiple_success(self, mock_db):
        """Successfully delete multiple users"""
        def override_get_db():
            yield mock_db
        app.dependency_overrides[get_db] = override_get_db

        user1 = Mock(user_id=1, first_name="Alice", last_name="Smith", email="alice@example.com", type="participant")
        user2 = Mock(user_id=2, first_name="Bob", last_name="Jones", email="bob@example.com", type="admin")

        def get_user_side_effect(db, uid):
            if uid == 1:
                return user1
            elif uid == 2:
                return user2
            raise ValueError("User not found")

        with patch("endpoints.manage_accounts_api.get_user_by_id", side_effect=get_user_side_effect), \
             patch("endpoints.manage_accounts_api.delete_user_full") as mock_delete:
            payload = {"user_ids": [1, 2]}
            response = client.request("DELETE", "/manageAccounts/users/batch-delete", json=payload)
            data = response.json()

            assert response.status_code == 200
            assert data["deleted_count"] == 2
            assert data["total_requested"] == 2
            assert len(data["deleted_users"]) == 2
            assert data["errors"] is None
            assert mock_delete.call_count == 2

        app.dependency_overrides.clear()

    def test_delete_users_partial_success(self, mock_db, mock_user):
        """Some deletions fail, some succeed - should return 207"""
        def override_get_db():
            yield mock_db
        app.dependency_overrides[get_db] = override_get_db

        mock_user.user_id = 1

        def get_user_side_effect(db, uid):
            if uid == 1:
                return mock_user
            raise ValueError("User not found")

        with patch("endpoints.manage_accounts_api.get_user_by_id", side_effect=get_user_side_effect), \
             patch("endpoints.manage_accounts_api.delete_user_full") as mock_delete:
            payload = {"user_ids": [1, 2]}
            response = client.request("DELETE", "/manageAccounts/users/batch-delete", json=payload)
            data = response.json()

            assert response.status_code == 207
            assert data["deleted_count"] == 1
            assert data["total_requested"] == 2
            assert len(data["deleted_users"]) == 1
            assert len(data["errors"]) == 1
            assert data["errors"][0]["user_id"] == 2
            assert "User not found" in data["errors"][0]["error"]
            mock_delete.assert_called_once_with(mock_db, 1)

        app.dependency_overrides.clear()

    def test_delete_users_no_ids_provided(self, mock_db):
        """No user IDs in request should raise 400"""
        def override_get_db():
            yield mock_db
        app.dependency_overrides[get_db] = override_get_db

        payload = {"user_ids": []}
        response = client.request("DELETE", "/manageAccounts/users/batch-delete", json=payload)
        assert response.status_code == 400
        assert response.json()["detail"] == "No user IDs provided"

        app.dependency_overrides.clear()

    def test_delete_users_all_fail(self, mock_db):
        """All deletions fail → 500"""
        def override_get_db():
            yield mock_db
        app.dependency_overrides[get_db] = override_get_db

        def failing_get_user(db, uid):
            raise ValueError("User not found")

        with patch("endpoints.manage_accounts_api.get_user_by_id", side_effect=failing_get_user):
            response = client.request("DELETE", "/manageAccounts/users/batch-delete", json={"user_ids": [1, 2]})
            assert response.status_code == 500
            assert response.json()["detail"] == "Failed to delete any users."

        app.dependency_overrides.clear()

    def test_delete_users_unexpected_error(self, mock_db):
        """Test handling of unexpected errors during deletion"""
        def override_get_db():
            yield mock_db
        app.dependency_overrides[get_db] = override_get_db

        user = Mock(user_id=1, first_name="Test", last_name="User", email="test@example.com", type="participant")

        with patch("endpoints.manage_accounts_api.get_user_by_id", return_value=user), \
             patch("endpoints.manage_accounts_api.delete_user_full", side_effect=Exception("Database error")):
            payload = {"user_ids": [1]}
            response = client.request("DELETE", "/manageAccounts/users/batch-delete", json=payload)
            data = response.json()

            assert response.status_code == 500
            assert data["detail"] == "Failed to delete any users."

        app.dependency_overrides.clear()

    def test_update_user_success(self, mock_db, mock_user):
        """Successfully updates a user"""
        def override_get_db():
            yield mock_db
        app.dependency_overrides[get_db] = override_get_db

        updated_user = Mock(
            user_id=2,
            first_name="John",
            last_name="Doe",
            email="newemail@example.com",
            type="admin",
        )

        with patch("endpoints.manage_accounts_api.update_user_in_db", return_value=updated_user):
            response = client.patch(
                "/manageAccounts/users/2",
                json={"email": "newemail@example.com", "type": "admin"},
            )
            data = response.json()
            assert response.status_code == 200
            assert data["user_id"] == 2
            assert data["email"] == "newemail@example.com"
            assert data["type"] == "admin"
            assert data["first_name"] == "John"
            assert data["last_name"] == "Doe"

        app.dependency_overrides.clear()

    def test_update_user_value_error(self, mock_db):
        """Update raises ValueError -> 400"""
        def override_get_db():
            yield mock_db
        app.dependency_overrides[get_db] = override_get_db

        with patch("endpoints.manage_accounts_api.update_user_in_db", side_effect=ValueError("Invalid data")):
            response = client.patch(
                "/manageAccounts/users/99",
                json={"email": "bad@example.com"},
            )
            assert response.status_code == 400
            assert response.json()["detail"] == "Invalid data"

        app.dependency_overrides.clear()

    def test_update_user_partial_fields(self, mock_db):
        """Update only one field (email)"""
        def override_get_db():
            yield mock_db
        app.dependency_overrides[get_db] = override_get_db

        updated_user = Mock(
            user_id=5,
            first_name="Partial",
            last_name="Update",
            email="partial@example.com",
            type="participant",
        )

        with patch("endpoints.manage_accounts_api.update_user_in_db", return_value=updated_user):
            response = client.patch("/manageAccounts/users/5", json={"email": "partial@example.com"})
            data = response.json()
            assert response.status_code == 200
            assert data["email"] == "partial@example.com"
            assert data["user_id"] == 5
            assert data["first_name"] == "Partial"
            assert data["last_name"] == "Update"

        app.dependency_overrides.clear()

    def test_update_user_all_fields(self, mock_db):
        """Update all available fields"""
        def override_get_db():
            yield mock_db
        app.dependency_overrides[get_db] = override_get_db

        updated_user = Mock(
            user_id=3,
            first_name="NewFirst",
            last_name="NewLast",
            email="newemail@example.com",
            type="admin",
        )

        with patch("endpoints.manage_accounts_api.update_user_in_db", return_value=updated_user) as mock_update:
            response = client.patch(
                "/manageAccounts/users/3",
                json={
                    "email": "newemail@example.com",
                    "first_name": "NewFirst",
                    "last_name": "NewLast",
                    "type": "admin",
                },
            )
            data = response.json()
            assert response.status_code == 200
            assert data["user_id"] == 3
            assert data["email"] == "newemail@example.com"
            assert data["first_name"] == "NewFirst"
            assert data["last_name"] == "NewLast"
            assert data["type"] == "admin"
            
            mock_update.assert_called_once()
            call_kwargs = mock_update.call_args[1]
            assert call_kwargs["email"] == "newemail@example.com"
            assert call_kwargs["first_name"] == "NewFirst"
            assert call_kwargs["last_name"] == "NewLast"
            assert call_kwargs["type"] == "admin"

        app.dependency_overrides.clear()

    def test_update_user_nonexistent(self, mock_db):
        """Update non-existent user should raise 400"""
        def override_get_db():
            yield mock_db
        app.dependency_overrides[get_db] = override_get_db

        with patch("endpoints.manage_accounts_api.update_user_in_db", side_effect=ValueError("User not found")):
            response = client.patch(
                "/manageAccounts/users/999",
                json={"email": "test@example.com"},
            )
            assert response.status_code == 400
            assert "User not found" in response.json()["detail"]

        app.dependency_overrides.clear()

    def test_update_user_empty_payload(self, mock_db):
        """Update with no fields should still call crud but may not change anything"""
        def override_get_db():
            yield mock_db
        app.dependency_overrides[get_db] = override_get_db

        existing_user = Mock(
            user_id=7,
            first_name="Same",
            last_name="User",
            email="same@example.com",
            type="participant",
        )

        with patch("endpoints.manage_accounts_api.update_user_in_db", return_value=existing_user) as mock_update:
            response = client.patch("/manageAccounts/users/7", json={})
            data = response.json()
            assert response.status_code == 200
            assert data["user_id"] == 7
            mock_update.assert_called_once()
            call_kwargs = mock_update.call_args[1]
            assert len(call_kwargs) == 1 
            assert call_kwargs["user_id"] == 7

        app.dependency_overrides.clear()