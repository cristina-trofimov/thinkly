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
from src.endpoints.user_question_instance_api import user_question_instance_router


# --- FIXTURES ---

@pytest.fixture
def mock_db():
    """Creates a mock database session."""
    return MagicMock()

@pytest.fixture
def client(mock_db):
    test_app = FastAPI()
    test_app.include_router(user_question_instance_router)

    def override_get_db():
        try:
            yield mock_db
        finally:
            pass

    test_app.dependency_overrides[get_db] = override_get_db
    return TestClient(test_app)


# --- GET /instance TESTS ---

def test_get_user_question_instance_success(client, mock_db):
    """Test fetching user's question instance."""
    mock = SimpleNamespace(
        user_question_instance_id = 1,
        user_id = 1,
        question_instance_id = 1,
        points = 71,
        riddle_complete = False,
        lapse_time = 100,
        attempts = 1
    )

    mock_db.query.return_value.filter_by.return_value.first.return_value = mock

    response = client.get("/instance?user_id=1&question_instance_id=1")

    assert response.status_code == 200
    data = response.json()
    assert data["status_code"] == 200
    assert data["data"]["user_question_instance_id"] == 1
    assert data["data"]["points"] == 71
    assert data["data"]["riddle_complete"] == False

def test_get_user_question_instance_empty(client, mock_db):
    """Test fetching user's question instance that doesn't exist."""
    mock_db.query.return_value.filter_by.return_value.first.return_value = None

    response = client.get("/instance?user_id=1&question_instance_id=1")

    assert response.status_code == 200
    assert response.json()["data"] is None

def test_get_user_question_instance_db_error(client, mock_db):
    """Test that a database error returns 500."""
    mock_db.query.return_value.filter_by.side_effect = Exception("DB Connection Lost")

    response = client.get("/instance?user_id=1&question_instance_id=1")

    assert response.status_code == 500
    assert "Failed to retrieve user's question instance" in response.json()["detail"]


# --- PUT /put TESTS ---

def test_create_new_user_question_instance(client, mock_db):
    """Test creating a new user_question_instance when one doesn't exist yet."""
    payload = {
        "user_id": 1,
        "question_instance_id": 1,
        "points": 71,
        "riddle_complete": False,
        "lapse_time": 100,
        "attempts": 1
    }

    mock_db.query.return_value.filter_by.return_value.first.return_value = None

    def fake_refresh(instance):
        instance.user_question_instance_id = 1

    mock_db.refresh.side_effect = fake_refresh

    response = client.put("/put", json=payload)

    assert response.status_code == 201
    mock_db.add.assert_called_once()
    mock_db.commit.assert_called_once()
    mock_db.refresh.assert_called_once()
    
    response_data = response.json()
    assert response_data['status_code'] == 200
    assert response_data['data']['user_id'] == 1
    assert response_data['data']['points'] == payload['points']

def test_update_existing_user_question_instance(client, mock_db):
    """Test updating an existing user_question_instance when user_id and question_instance_id is provided."""
    payload = {
        "user_id": 1,
        "question_instance_id": 1,
        "points": 71,
        "riddle_complete": False,
        "lapse_time": 100,
        'attempts': 2
    }

    existing = SimpleNamespace(
        user_question_instance_id = 1,
        user_id = 1,
        question_instance_id = 1,
        points = 71,
        riddle_complete = True,
        lapse_time = 50,
        attempts = 1
    )

    mock_db.query.return_value.filter_by.return_value.first.return_value = existing

    def fake_refresh(instance):
        instance.user_question_instance_id = 1

    mock_db.refresh.side_effect = fake_refresh

    response = client.put("/put", json=payload)

    assert response.status_code == 201
    mock_db.add.assert_not_called()
    mock_db.commit.assert_called_once()
    mock_db.refresh.assert_called_once_with(existing)
    
    response_data = response.json()
    assert response_data['status_code'] == 200
    assert response_data['data']['riddle_complete'] == payload['riddle_complete']
    assert response_data['data']['lapse_time'] == payload['lapse_time']

def test_add_user_question_instance_db_error(client, mock_db):
    """Test that a commit failure rolls back and returns 500."""
    payload = {
        "user_id": 1,
        "question_instance_id": 1,
        "points": 71,
        "riddle_complete": False,
        "lapse_time": 100,
        'attempts': 2
    }

    mock_db.commit.side_effect = Exception("Commit Failed")

    response = client.put("/put", json=payload)

    assert response.status_code == 500
    assert "Failed to update user's question instance" in response.json()["detail"]
    mock_db.rollback.assert_called_once()

def test_create_question_instance_missing_fields(client):
    """Test that a malformed request body returns 422 or 500."""
    response = client.put("/put", json={"bad_field": "value"})
    assert response.status_code in (422, 500)