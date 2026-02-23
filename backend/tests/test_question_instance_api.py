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
from src.endpoints.question_instance_api import question_instance_router


# --- FIXTURES ---

@pytest.fixture
def mock_db():
    """Creates a mock database session."""
    return MagicMock()

@pytest.fixture
def client(mock_db):
    test_app = FastAPI()
    test_app.include_router(question_instance_router)

    def override_get_db():
        try:
            yield mock_db
        finally:
            pass

    test_app.dependency_overrides[get_db] = override_get_db
    return TestClient(test_app)


# --- GET /find TESTS ---

def test_get_question_instance_success(client, mock_db):
    """Test fetching a question instance by question_id."""
    fake_instances = [
        SimpleNamespace(
            question_instance_id=1,
            event_id=10,
            question_id=5,
            points=100,
            riddle_id=None,
            is_riddle_completed=False,
        )
    ]

    mock_db.query.return_value.filter_by.return_value.filter_by.return_value.all.return_value = fake_instances
    mock_db.query.return_value.filter_by.return_value.all.return_value = fake_instances

    response = client.get("/find?question_id=5")

    assert response.status_code == 200
    data = response.json()
    assert data["status_code"] == 200
    assert len(data["data"]) == 1
    assert data["data"][0]["question_id"] == 5
    assert data["data"][0]["event_id"] == 10
    assert data["data"][0]["points"] == 100
    assert data["data"][0]["is_riddle_completed"] == False

def test_get_question_instance_with_event_id(client, mock_db):
    """Test fetching a question instance filtered by both question_id and event_id."""
    fake_instances = [
        SimpleNamespace(
            question_instance_id=2,
            event_id=10,
            question_id=5,
            points=50,
            riddle_id=3,
            is_riddle_completed=True,
        )
    ]

    mock_db.query.return_value.filter_by.return_value.filter_by.return_value.all.return_value = fake_instances

    response = client.get("/find?question_id=5&event_id=10")

    assert response.status_code == 200
    data = response.json()
    assert data["status_code"] == 200
    assert len(data["data"]) == 1
    assert data["data"][0]["event_id"] == 10
    assert data["data"][0]["is_riddle_completed"] == True

def test_get_question_instance_empty(client, mock_db):
    """Test fetching a question instance that doesn't exist."""
    mock_db.query.return_value.filter_by.return_value.all.return_value = []

    response = client.get("/find?question_id=999")

    assert response.status_code == 200
    data = response.json()
    assert data["status_code"] == 200
    assert data["data"] == []

def test_get_question_instance_db_error(client, mock_db):
    """Test that a database error returns 500."""
    mock_db.query.return_value.filter_by.side_effect = Exception("DB Connection Lost")

    response = client.get("/find?question_id=5")

    assert response.status_code == 500
    assert "Failed to retrieve question instance" in response.json()["detail"]


# --- POST /update TESTS ---

def test_create_question_instance_no_event_id(client, mock_db):
    """Test creating a practice instance (event_id is None) — always inserts."""
    payload = {
        "question_id": 5,
        "event_id": None,
        "points": 80,
        "riddle_id": None,
        "is_riddle_completed": False,
    }

    # Simulate the refreshed instance having an ID
    def fake_refresh(instance):
        instance.question_instance_id = 1

    mock_db.refresh.side_effect = fake_refresh

    response = client.post("/update", json=payload)

    assert response.status_code == 201
    mock_db.add.assert_called_once()
    mock_db.commit.assert_called_once()
    data = response.json()
    assert data["status_code"] == 200
    assert data["data"]["question_id"] == 5
    assert data["data"]["event_id"] is None

def test_create_question_instance_new_with_event_id(client, mock_db):
    """Test creating a new instance when one doesn't exist yet for the event."""
    payload = {
        "question_id": 5,
        "event_id": 10,
        "points": 75,
        "riddle_id": None,
        "is_riddle_completed": False,
    }

    # first() returns None -> no existing instance -> should INSERT
    mock_db.query.return_value.filter_by.return_value.filter_by.return_value.first.return_value = None
    mock_db.query.return_value.filter_by.return_value.first.return_value = None

    def fake_refresh(instance):
        instance.question_instance_id = 2

    mock_db.refresh.side_effect = fake_refresh

    response = client.post("/update", json=payload)

    assert response.status_code == 201
    mock_db.add.assert_called_once()
    mock_db.commit.assert_called_once()

def test_update_existing_question_instance(client, mock_db):
    """Test updating an existing instance when event_id is provided."""
    payload = {
        "question_id": 5,
        "event_id": 10,
        "points": 95,
        "riddle_id": 3,
        "is_riddle_completed": True,
    }

    existing = SimpleNamespace(
        question_instance_id=2,
        event_id=10,
        question_id=5,
        points=50,
        riddle_id=None,
        is_riddle_completed=False,
    )

    mock_db.query.return_value.filter_by.return_value.filter_by.return_value.first.return_value = existing
    mock_db.query.return_value.filter_by.return_value.first.return_value = existing

    def fake_refresh(instance):
        pass  # attributes already set on existing by the endpoint

    mock_db.refresh.side_effect = fake_refresh

    response = client.post("/update", json=payload)

    assert response.status_code == 201
    # add should NOT be called since the instance already exists
    mock_db.add.assert_not_called()
    mock_db.commit.assert_called_once()

def test_create_question_instance_db_error(client, mock_db):
    """Test that a commit failure rolls back and returns 500."""
    payload = {
        "question_id": 5,
        "event_id": None,
        "points": 80,
        "riddle_id": None,
        "is_riddle_completed": False,
    }

    mock_db.commit.side_effect = Exception("Commit Failed")

    response = client.post("/update", json=payload)

    assert response.status_code == 500
    assert "Failed to upload question instance" in response.json()["detail"]
    mock_db.rollback.assert_called_once()

def test_create_question_instance_missing_fields(client):
    """Test that a malformed request body returns 422 or 500."""
    # Sending completely wrong data
    response = client.post("/update", json={"bad_field": "value"})
    # Will raise a KeyError internally -> 500
    assert response.status_code in (422, 500)