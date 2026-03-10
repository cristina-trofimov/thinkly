import pytest
from unittest.mock import MagicMock
from fastapi import FastAPI
from fastapi.testclient import TestClient
from types import SimpleNamespace
import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

from database_operations.database import get_db
from src.endpoints.user_preferences_api import user_preferences_router


# --- FIXTURES ---

@pytest.fixture
def mock_db():
    """Creates a mock database session."""
    return MagicMock()

@pytest.fixture
def client(mock_db):
    test_app = FastAPI()
    test_app.include_router(user_preferences_router)

    def override_get_db():
        try:
            yield mock_db
        finally:
            pass

    test_app.dependency_overrides[get_db] = override_get_db
    return TestClient(test_app)


# --- GET /all TESTS ---

def test_get_all_prefs_success(client, mock_db):
    """Test fetching get all user preferences by user_id."""
    prefs = SimpleNamespace(
        pref_id = 1,
        user_id = 10,
        theme = "light",
        notifications_enabled = True,
        last_used_programming_language = 71,
    )

    mock_db.query.return_value.filter_by.return_value.first.return_value = prefs

    response = client.get("/all?user_id=10")

    assert response.status_code == 200
    data = response.json()
    assert data["status_code"] == 200
    assert data["data"]["user_id"] == 10
    assert data["data"]["theme"] == "light"
    assert data["data"]["notifications_enabled"] == True
    assert data["data"]["last_used_programming_language"] == 71

def test_get_all_prefs_empty(client, mock_db):
    """Test fetching user preferences that doesn't exist."""
    mock_db.query.return_value.filter_by.return_value.first.return_value = None

    response = client.get("/all?user_id=100")

    data = response.json()
    assert data["status_code"] == 404
    assert "error" in data
    assert data["error"] == "User preferences not found"

def test_get_all_prefs_error(client, mock_db):
    """Test that a database error returns 500."""
    mock_db.query.return_value.filter_by.side_effect = Exception("DB Connection Lost")

    response = client.get("/all?user_id=10")

    assert response.status_code == 500
    assert "Failed to retrieve user preferences." in response.json()["detail"]


# --- POST /add TESTS ---

def test_create_new_user_prefs_with_user_id(client, mock_db):
    """Test adding new user preferences when they don't exist yet."""
    payload = {
        "pref_id": 1,
        "user_id": 100,
        "theme": "light",
        "notifications_enabled": True,
        "last_used_programming_language": 71,
    }

    mock_db.query.return_value.filter_by.return_value.first.return_value = None

    def fake_refresh(instance):
        instance.pref_id = 2

    mock_db.refresh.side_effect = fake_refresh

    response = client.post("/add", json=payload)

    assert response.status_code == 201
    data = response.json()
    assert data["status_code"] == 404
    assert "error" in data
    assert data["error"] == "User preferences not found"

def test_update_existing_user_prefs(client, mock_db):
    """Test updating existing user preferences when user_id is provided."""
    payload = {
        "pref_id": 1,
        "user_id": 10,
        "theme": "light",
        "notifications_enabled": True,
        "last_used_programming_language": 71,
    }

    existing = SimpleNamespace(
        pref_id = 1,
        user_id = 10,
        theme = "dark",
        notifications_enabled = False,
        last_used_programming_language = 51,
    )

    mock_db.query.return_value.filter_by.return_value.first.return_value = existing

    def fake_refresh(instance):
        instance.pref_id = 2

    mock_db.refresh.side_effect = fake_refresh

    response = client.post("/add", json=payload)

    assert response.status_code == 201
    mock_db.add.assert_not_called()
    mock_db.commit.assert_called_once()
    mock_db.refresh.assert_called_once_with(existing)

def test_add_user_prefs_db_error(client, mock_db):
    """Test that a commit failure rolls back and returns 500."""
    payload = {
        "pref_id": 1,
        "user_id": 10,
        "theme": "light",
        "notifications_enabled": True,
        "last_used_programming_language": 71,
    }

    mock_db.commit.side_effect = Exception("Commit Failed")

    response = client.post("/add", json=payload)

    assert response.status_code == 500
    assert "Failed to update user preferences." in response.json()["detail"]
    mock_db.rollback.assert_called_once()


# --- PATCH /theme TESTS ---

def test_update_theme_success(client, mock_db):
    """Test updating user theme preference."""
    payload = {
        "user_id": 10,
        "theme": "light",
    }

    existing = SimpleNamespace(
        user_id = 10,
        theme = "dark",
        notifications_enabled = True,
        last_used_programming_language = 71,
    )

    mock_db.query.return_value.filter_by.return_value.first.return_value = existing

    def fake_refresh(instance):
        instance.pref_id = 2

    mock_db.refresh.side_effect = fake_refresh

    response = client.patch("/theme", json=payload)

    assert response.status_code == 201
    mock_db.add.assert_not_called()
    mock_db.commit.assert_called_once()
    mock_db.refresh.assert_called_once_with(existing)

def test_update_theme_no_user(client, mock_db):
    """Test updating user theme preference."""
    payload = {
        "user_id": 10,
        "theme": "light",
    }

    mock_db.query.return_value.filter_by.return_value.first.return_value = None

    response = client.patch("/theme", json=payload)

    assert response.status_code == 201
    data = response.json()
    assert data["status_code"] == 404
    assert "error" in data
    assert data["error"] == "User preferences not found"

def test_update_theme_db_error(client, mock_db):
    """Test that a commit failure rolls back and returns 500."""
    payload = {
        "user_id": 10,
        "theme": "light",
    }

    mock_db.commit.side_effect = Exception("Commit Failed")

    response = client.patch("/theme", json=payload)

    assert response.status_code == 500
    assert "Failed to update user's preferred theme." in response.json()["detail"]
    mock_db.rollback.assert_called_once()


# --- PATCH /notif TESTS ---

def test_update_notif_success(client, mock_db):
    """Test updating user notification preference."""
    payload = {
        "user_id": 10,
        "notifications_enabled": True,
    }

    existing = SimpleNamespace(
        user_id = 10,
        theme = "dark",
        notifications_enabled = False,
        last_used_programming_language = 71,
    )

    mock_db.query.return_value.filter_by.return_value.first.return_value = existing

    def fake_refresh(instance):
        instance.pref_id = 2

    mock_db.refresh.side_effect = fake_refresh

    response = client.patch("/notif", json=payload)

    assert response.status_code == 201
    mock_db.add.assert_not_called()
    mock_db.commit.assert_called_once()
    mock_db.refresh.assert_called_once_with(existing)

def test_update_notif_no_user(client, mock_db):
    """Test updating user theme preference."""
    payload = {
        "user_id": 10,
        "notifications_enabled": True,
    }

    mock_db.query.return_value.filter_by.return_value.first.return_value = None

    response = client.patch("/notif", json=payload)

    assert response.status_code == 201
    data = response.json()
    assert data["status_code"] == 404
    assert "error" in data
    assert data["error"] == "User preferences not found"

def test_update_notif_db_error(client, mock_db):
    """Test that a commit failure rolls back and returns 500."""
    payload = {
        "user_id": 10,
        "notifications_enabled": True,
    }

    mock_db.commit.side_effect = Exception("Commit Failed")

    response = client.patch("/notif", json=payload)

    assert response.status_code == 500
    assert "Failed to update user's notification settings." in response.json()["detail"]
    mock_db.rollback.assert_called_once()


# --- PATCH /prog TESTS ---

def test_update_prog_success(client, mock_db):
    """Test updating user last programming language preference."""
    payload = {
        "user_id": 10,
        "last_used_programming_language": 71
    }

    existing = SimpleNamespace(
        pref_id = 2,
        user_id = 10,
        theme = "dark",
        notifications_enabled = True,
        last_used_programming_language = 70
    )

    mock_db.query.return_value.filter_by.return_value.first.return_value = existing

    def fake_refresh(instance):
        instance = instance

    mock_db.refresh.side_effect = fake_refresh

    response = client.patch("/prog", json=payload)

    assert response.status_code == 201
    mock_db.add.assert_not_called()
    mock_db.commit.assert_called_once()
    mock_db.refresh.assert_called_once_with(existing)

def test_update_prog_no_user(client, mock_db):
    """Test updating user theme preference."""
    payload = {
        "user_id": 10,
        "last_used_programming_language": 71
    }

    mock_db.query.return_value.filter_by.return_value.first.return_value = None

    response = client.patch("/prog", json=payload)

    assert response.status_code == 201
    data = response.json()
    assert data["status_code"] == 404
    assert "error" in data
    assert data["error"] == "User preferences not found"

def test_update_prog_db_error(client, mock_db):
    """Test that a commit failure rolls back and returns 500."""
    payload = {
        "user_id": 10,
        "last_used_programming_language": 71,
    }

    mock_db.commit.side_effect = Exception("Commit Failed")

    response = client.patch("/prog", json=payload)

    assert response.status_code == 500
    assert "Failed to update user's last programming language." in response.json()["detail"]
    mock_db.rollback.assert_called_once()

def test_create_missing_fields(client):
    """Test that a malformed request body returns 422 or 500."""
    response = client.post("/update", json={"bad_field": "value"})
    assert response.status_code in (422, 404, 500)