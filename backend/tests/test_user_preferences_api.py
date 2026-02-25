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

from DB_Methods.database import get_db
from src.endpoints.most_recent_sub_api import most_recent_sub_router


# --- FIXTURES ---

@pytest.fixture
def mock_db():
    """Creates a mock database session."""
    return MagicMock()

@pytest.fixture
def client(mock_db):
    test_app = FastAPI()
    test_app.include_router(most_recent_sub_router)

    def override_get_db():
        try:
            yield mock_db
        finally:
            pass

    test_app.dependency_overrides[get_db] = override_get_db
    return TestClient(test_app)


# --- GET /latest TESTS ---

def test_get_most_recent_sub_success(client, mock_db):
    """Test fetching most recent submission by user_id and question_instance_id."""
    most_recent_run = SimpleNamespace(
        question_instance_id=1,
        user_id=10,
        code="print('hello world')",
        lang_judge_id=71,
    )

    mock_db.query.return_value.filter_by.return_value.first.return_value = most_recent_run

    response = client.get("/latest?user_id=10&question_instance_id=1")

    assert response.status_code == 200
    data = response.json()
    assert data["status_code"] == 200
    assert data["data"]["question_instance_id"] == 1
    assert data["data"]["user_id"] == 10
    assert data["data"]["code"] == "print('hello world')"
    assert data["data"]["lang_judge_id"] == 71

def test_get_most_recent_sub_empty(client, mock_db):
    """Test fetching most recent submission that doesn't exist."""
    mock_db.query.return_value.filter_by.return_value.first.return_value = None

    response = client.get("/latest?user_id=100&question_instance_id=999")

    assert response.status_code == 200
    data = response.json()
    assert data["status_code"] == 200
    assert data["data"] == None

def test_get_most_recent_sub_db_error(client, mock_db):
    """Test that a database error returns 500."""
    mock_db.query.return_value.filter_by.side_effect = Exception("DB Connection Lost")

    response = client.get("/latest?user_id=10&question_instance_id=1")

    assert response.status_code == 500
    assert "Failed to retrieve most recent submission" in response.json()["detail"]


# --- POST /update TESTS ---

def test_create_new_most_recent_sub_with_user_id_question_instance_id(client, mock_db):
    """Test creating a new submission when one doesn't exist yet."""
    payload = {
        "question_instance_id": 5,
        "user_id": 10,
        "code": "print('goodbye~~~)",
        "lang_judge_id": 71,
    }

    mock_db.query.return_value.filter_by.return_value.first.return_value = None

    response = client.post("/update", json=payload)

    assert response.status_code == 201
    mock_db.add.assert_called_once()
    mock_db.commit.assert_called_once()

def test_update_existing_most_recent_submission(client, mock_db):
    """Test updating an existing submission when user_id and question_instance_id is provided."""
    payload = {
        "question_instance_id": 5,
        "user_id": 10,
        "code": "print('goodbye~~~)",
        "lang_judge_id": 71,
    }

    existing = SimpleNamespace(
        question_instance_id=5,
        user_id=10,
        code = "print('hello world)",
        lang_judge_id = 71,
    )

    mock_db.query.return_value.filter_by.return_value.first.return_value = existing

    mock_db.refresh.return_value = None

    response = client.post("/update", json=payload)

    assert response.status_code == 201
    mock_db.add.assert_not_called()
    mock_db.commit.assert_called_once()
    mock_db.refresh.assert_called_once_with(existing)

def test_add_most_recent_sub_db_error(client, mock_db):
    """Test that a commit failure rolls back and returns 500."""
    payload = {
        "question_instance_id": 1,
        "user_id": 10,
        "code": "print('hello world)",
        "lang_judge_id": 71
    }

    mock_db.commit.side_effect = Exception("Commit Failed")

    response = client.post("/update", json=payload)

    assert response.status_code == 500
    assert "Failed to updating most recent submission" in response.json()["detail"]
    mock_db.rollback.assert_called_once()

def test_create_question_instance_missing_fields(client):
    """Test that a malformed request body returns 422 or 500."""
    response = client.post("/update", json={"bad_field": "value"})
    assert response.status_code in (422, 500)