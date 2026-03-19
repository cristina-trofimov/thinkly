import pytest, datetime
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
    """Test fetching submissions for a user_question_instance_id."""
    fake_subs = [
        SimpleNamespace(
            submission_id = 1,
            user_question_instance_id = 42,
            lang_judge_id = 71,
            compile_output = "Accepted",
            submitted_on = "2025-01-10T12:00:00",
            runtime = 45,
            status = "Accepted",
            memory = 512,
            stdout = "5\n",
            stderr = None,
            message = None
        ),
        SimpleNamespace(
            submission_id = 2,
            user_question_instance_id = 7,
            lang_judge_id = 71,
            compile_output = "Wrong Answer",
            submitted_on = "2025-01-10T12:00:00",
            runtime = 300,
            status = "Wrong Answer",
            memory = 256,
            stdout = None,
            stderr = None,
            message = "Expected 5 but got None"
        ),
    ]

    mock_db.query.return_value.filter_by.return_value.all.return_value = [fake_subs[0]]

    response = client.get("/all?user_question_instance_id=42")

    assert response.status_code == 200
    data = response.json()
    assert data["status_code"] == 200
    assert len(data["data"]) == 1
    assert data["data"][0]["submission_id"] == 1
    assert data["data"][0]["status"] == "Accepted"
    assert data["data"][0]["message"] is None

def test_get_all_submissions_empty(client, mock_db):
    """Test when no submissions exist for the given user_question_instance_id."""
    mock_db.query.return_value.filter_by.return_value.all.return_value = []

    response = client.get("/all?user_question_instance_id=99")

    assert response.status_code == 200
    data = response.json()
    assert data["status_code"] == 200
    assert data["data"] == []

def test_get_all_submissions_db_error(client, mock_db):
    """Test that a database error returns 500."""
    mock_db.query.return_value.filter_by.side_effect = Exception("DB Timeout")

    response = client.get("/all?user_question_instance_id=1")

    assert response.status_code == 500
    assert "Failed to retrieve submissions" in response.json()["detail"]


# --- POST /add TESTS ---

def test_save_submission_success(client, mock_db):
    """Test saving a submission successfully."""
    payload = {
        "user_question_instance_id": 7,
        "lang_judge_id": 71,
        "compile_output": "Accepted",
        "submitted_on": "2025-01-10T12:00:00",
        "runtime": 45,
        "status": "Accepted",
        "memory": 512,
        "stdout": "5\n",
        "stderr": None,
        "message": None
    }

    def fake_refresh(instance):
        instance.submission_id = 1

    mock_db.refresh.side_effect = fake_refresh

    response = client.post("/add", json=payload)

    assert response.status_code == 201
    mock_db.add.assert_called_once()
    mock_db.commit.assert_called_once()
    mock_db.refresh.assert_called_once()
    data = response.json()
    assert data["status_code"] == 200
    assert data["data"]['submission_id'] == 1
    assert data["data"]['memory'] == 512
    assert data["data"]['runtime'] == 45
    assert data["data"]['stderr'] is None
    assert data["data"]['message'] is None

def test_save_submission_db_error(client, mock_db):
    """Test that a commit failure rolls back and returns 500."""
    payload = {
        "user_id": 42,
        "lang_judge_id": 71,
        "question_instance_id": 7,
        "compile_output": "Accepted",
        "submitted_on": "2025-01-10T12:00:00",
        "runtime": 0.045,
        "status": "Accepted",
        "memory": 512,
        "stdout": None,
        "stderr": None,
        "message": None
    }

    mock_db.commit.side_effect = Exception("Commit Failed")

    response = client.post("/add", json=payload)

    assert response.status_code == 500
    assert "Failed to upload submission" in response.json()["detail"]
    mock_db.rollback.assert_called_once()

def test_save_submission_missing_required_fields(client, mock_db):
    """Test that a payload missing required keys returns 500 (KeyError)."""
    incomplete_payload = {
        "user_question_instance_id": 42,
        # missing question_instance_id, compile_output, submitted_on
    }

    response = client.post("/add", json=incomplete_payload)

    assert response.status_code == 500
