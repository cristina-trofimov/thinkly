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
from src.endpoints.submission_api import submission_router


# --- FIXTURES ---

@pytest.fixture
def mock_db():
    """Creates a mock database session."""
    return MagicMock()

@pytest.fixture
def client(mock_db):
    test_app = FastAPI()
    test_app.include_router(submission_router)

    def override_get_db():
        try:
            yield mock_db
        finally:
            pass

    test_app.dependency_overrides[get_db] = override_get_db
    return TestClient(test_app)


# --- GET /all TESTS ---

def test_get_all_submissions_success(client, mock_db):
    """Test fetching submissions for a user and question instance."""
    fake_subs = [
        SimpleNamespace(
            submission_id=1,
            user_id=42,
            question_instance_id=7,
            compile_output="Accepted",
            submitted_on="2025-01-10T12:00:00",
            runtime=0.045,
            status="Accepted",
            memory=512,
            stdout="5\n",
            stderr=None,
            message=None,
        ),
        SimpleNamespace(
            submission_id=2,
            user_id=42,
            question_instance_id=7,
            compile_output="Wrong Answer",
            submitted_on="2025-01-10T11:00:00",
            runtime=0.03,
            status="Wrong Answer",
            memory=256,
            stdout=None,
            stderr=None,
            message="Expected 5 but got 4",
        ),
    ]

    mock_db.query.return_value.filter_by.return_value.all.return_value = fake_subs

    response = client.get("/all?user_id=42&question_instance_id=7")

    assert response.status_code == 200
    data = response.json()
    assert data["status_code"] == 200
    assert len(data["data"]) == 2
    assert data["data"][0]["submission_id"] == 1
    assert data["data"][0]["user_id"] == 42
    assert data["data"][0]["status"] == "Accepted"
    assert data["data"][1]["message"] == "Expected 5 but got 4"

def test_get_all_submissions_empty(client, mock_db):
    """Test when no submissions exist for the given filters."""
    mock_db.query.return_value.filter_by.return_value.all.return_value = []

    response = client.get("/all?user_id=99&question_instance_id=99")

    assert response.status_code == 200
    data = response.json()
    assert data["status_code"] == 200
    assert data["data"] == []

def test_get_all_submissions_db_error(client, mock_db):
    """Test that a database error returns 500."""
    mock_db.query.return_value.filter_by.side_effect = Exception("DB Timeout")

    response = client.get("/all?user_id=1&question_instance_id=1")

    assert response.status_code == 500
    assert "Failed to retrieve submissions" in response.json()["detail"]
    assert "Exception" in response.json()["detail"]

def test_get_all_submissions_missing_params(client, mock_db):
    """Test that missing query params causes a TypeError/500 (int(None))."""
    response = client.get("/all")
    # user_id and question_instance_id default to None -> int(None) raises TypeError
    assert response.status_code == 500


# --- POST /add TESTS ---

def test_save_submission_success(client, mock_db):
    """Test saving a submission successfully."""
    payload = {
        "user_id": 42,
        "question_instance_id": 7,
        "compile_output": "Accepted",
        "submitted_on": "2025-01-10T12:00:00",
        "runtime": 0.045,
        "status": "Accepted",
        "memory": 512,
        "stdout": "5\n",
        "stderr": None,
        "message": None,
    }

    response = client.post("/add", json=payload)

    assert response.status_code == 201
    mock_db.add.assert_called_once()
    mock_db.commit.assert_called_once()
    assert response.json()["status_code"] == 200
    assert response.json()["message"] == "Submission sucessful"

def test_save_submission_with_null_optional_fields(client, mock_db):
    """Test saving a submission where all optional fields are None."""
    payload = {
        "user_id": 1,
        "question_instance_id": 3,
        "compile_output": "Compilation Error",
        "submitted_on": "2025-03-01T08:00:00",
        "runtime": None,
        "status": None,
        "memory": None,
        "stdout": None,
        "stderr": "SyntaxError: invalid syntax",
        "message": None,
    }

    response = client.post("/add", json=payload)

    assert response.status_code == 201
    mock_db.add.assert_called_once()
    mock_db.commit.assert_called_once()

def test_save_submission_db_error(client, mock_db):
    """Test that a commit failure rolls back and returns 500."""
    payload = {
        "user_id": 42,
        "question_instance_id": 7,
        "compile_output": "Accepted",
        "submitted_on": "2025-01-10T12:00:00",
        "runtime": 0.045,
        "status": "Accepted",
        "memory": 512,
        "stdout": None,
        "stderr": None,
        "message": None,
    }

    mock_db.commit.side_effect = Exception("Commit Failed")

    response = client.post("/add", json=payload)

    assert response.status_code == 500
    assert "Failed to upload submissions" in response.json()["detail"]
    mock_db.rollback.assert_called_once()

def test_save_submission_missing_required_fields(client, mock_db):
    """Test that a payload missing required keys returns 500 (KeyError)."""
    incomplete_payload = {
        "user_id": 42,
        # missing question_instance_id, compile_output, submitted_on
    }

    response = client.post("/add", json=incomplete_payload)

    assert response.status_code == 500

def test_save_submission_add_error(client, mock_db):
    """Test that a failure during db.add raises 500."""
    payload = {
        "user_id": 42,
        "question_instance_id": 7,
        "compile_output": "Accepted",
        "submitted_on": "2025-01-10T12:00:00",
        "runtime": None,
        "status": "Accepted",
        "memory": None,
        "stdout": None,
        "stderr": None,
        "message": None,
    }

    mock_db.add.side_effect = Exception("Add Failed")

    response = client.post("/add", json=payload)

    assert response.status_code == 500
    assert "Failed to upload submissions" in response.json()["detail"]
    mock_db.rollback.assert_called_once()