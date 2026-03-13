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
from src.endpoints.most_recent_sub_api import most_recent_sub_router


# --- FIXTURES ---

@pytest.fixture
def mock_db():
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
    """Test fetching most recent submission by user_question_instance_id."""
    fake_row = SimpleNamespace(
        row_id=1,
        user_question_instance_id=10,
        code="print('hello world')",
        lang_judge_id=71,
        submitted_on="2025-01-10T12:00:00",
        submission_id=99,
    )

    mock_db.query.return_value.filter_by.return_value.first.return_value = fake_row

    response = client.get("/latest?user_question_instance_id=10")

    assert response.status_code == 200
    data = response.json()
    assert data["status_code"] == 200
    assert data["data"]["user_question_instance_id"] == 10
    assert data["data"]["code"] == "print('hello world')"
    assert data["data"]["lang_judge_id"] == 71
    assert data["data"]["submission_id"] == 99

def test_get_most_recent_sub_not_found(client, mock_db):
    """Test fetching most recent submission that doesn't exist returns null data."""
    mock_db.query.return_value.filter_by.return_value.first.return_value = None

    response = client.get("/latest?user_question_instance_id=999")

    assert response.status_code == 200
    data = response.json()
    assert data["status_code"] == 200
    assert data["data"] is None

def test_get_most_recent_sub_db_error(client, mock_db):
    """Test that a database error returns 500."""
    mock_db.query.return_value.filter_by.side_effect = Exception("DB Connection Lost")

    response = client.get("/latest?user_question_instance_id=10")

    assert response.status_code == 500
    assert "Failed to retrieve most recent submission" in response.json()["detail"]

def test_get_most_recent_sub_missing_param(client):
    """Test that missing required query param returns 422."""
    response = client.get("/latest")
    assert response.status_code == 422


# --- POST /update TESTS ---

def test_create_new_most_recent_sub(client, mock_db):
    """Test creating a new MostRecentSubmission when none exists yet."""
    payload = {
        "user_question_instance_id": 10,
        "code": "print('hello')",
        "lang_judge_id": 71,
        "submission_id": 55,
    }

    mock_db.query.return_value.filter_by.return_value.first.return_value = None

    # Simulate db.refresh populating the new row
    def fake_refresh(obj):
        obj.row_id = 1
        obj.submitted_on = "2025-01-10T12:00:00"

    mock_db.refresh.side_effect = fake_refresh

    response = client.post("/update", json=payload)

    assert response.status_code == 201
    mock_db.add.assert_called_once()
    mock_db.commit.assert_called_once()
    data = response.json()["data"]
    assert data["user_question_instance_id"] == 10
    assert data["code"] == "print('hello')"
    assert data["submission_id"] == 55

def test_update_existing_most_recent_sub(client, mock_db):
    """Test updating an existing MostRecentSubmission."""
    payload = {
        "user_question_instance_id": 10,
        "code": "print('updated')",
        "lang_judge_id": 71,
        "submission_id": 66,
    }

    existing = SimpleNamespace(
        row_id=1,
        user_question_instance_id=10,
        code="print('old')",
        lang_judge_id=71,
        submitted_on="2025-01-10T12:00:00",
        submission_id=55,
    )

    mock_db.query.return_value.filter_by.return_value.first.return_value = existing
    mock_db.refresh.return_value = None

    response = client.post("/update", json=payload)

    assert response.status_code == 201
    mock_db.add.assert_not_called()
    mock_db.commit.assert_called_once()
    mock_db.refresh.assert_called_once_with(existing)
    # Verify mutation happened
    assert existing.code == "print('updated')"
    assert existing.submission_id == 66

def test_update_most_recent_sub_commit_error(client, mock_db):
    """Test that a commit failure rolls back and returns 500."""
    payload = {
        "user_question_instance_id": 10,
        "code": "print('hello')",
        "lang_judge_id": 71,
        "submission_id": 55,
    }

    mock_db.query.return_value.filter_by.return_value.first.return_value = None
    mock_db.commit.side_effect = Exception("Commit Failed")

    response = client.post("/update", json=payload)

    assert response.status_code == 500
    assert "Failed to update most recent submission" in response.json()["detail"]
    mock_db.rollback.assert_called_once()

def test_update_most_recent_sub_missing_fields(client):
    """Test that a malformed request body returns 500 (KeyError)."""
    response = client.post("/update", json={"bad_field": "value"})
    assert response.status_code == 500