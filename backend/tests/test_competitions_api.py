import warnings

# Suppress Pydantic V2 migration warnings globally for the test session.
warnings.filterwarnings("ignore", message=".*Pydantic V1 style.*")
warnings.filterwarnings("ignore", message=".*class-based `config` is deprecated.*")
warnings.filterwarnings("ignore", category=DeprecationWarning, module="pydantic.*")

import pytest
from unittest.mock import MagicMock, patch, call
from fastapi import FastAPI
from fastapi.testclient import TestClient
from datetime import datetime, timezone, timedelta
from types import SimpleNamespace
import sys
import os

# Path setup
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

from DB_Methods import database
from src.endpoints.competitions_api import competitions_router
from src.endpoints import authentification_api


# --- FIXTURES ---

@pytest.fixture
def mock_db():
    """Creates a mock database session."""
    db = MagicMock()
    db.commit = MagicMock()
    db.rollback = MagicMock()
    db.refresh = MagicMock()
    db.add = MagicMock()
    db.delete = MagicMock()
    return db


@pytest.fixture
def client(mock_db):
    """Creates a test client with the dependency override active."""
    test_app = FastAPI()
    # Include router with prefix to match main app
    test_app.include_router(competitions_router, prefix="/competitions")

    def override_get_db():
        try:
            yield mock_db
        finally:
            pass

    def override_get_current_user():
        return {"sub": "test@example.com", "role": "admin", "id": 1}

    # Import the competitions_api module to get the actual reference
    from src.endpoints import competitions_api

    # Apply the overrides using the correct references
    test_app.dependency_overrides[database.get_db] = override_get_db
    test_app.dependency_overrides[competitions_api.get_current_user] = override_get_current_user

    return TestClient(test_app)


def create_mock_query(return_value=None):
    """Helper to create a chainable mock query."""
    mock_query = MagicMock()
    mock_query.join.return_value = mock_query
    mock_query.filter.return_value = mock_query
    mock_query.filter_by.return_value = mock_query
    mock_query.order_by.return_value = mock_query
    mock_query.limit.return_value = mock_query
    mock_query.offset.return_value = mock_query
    mock_query.all.return_value = return_value if return_value is not None else []
    mock_query.first.return_value = return_value[0] if return_value and len(return_value) > 0 else None
    mock_query.count.return_value = len(return_value) if return_value else 0
    mock_query.delete.return_value = None
    return mock_query


# --- TESTS FOR GET / ---

def test_get_all_competitions_success(client, mock_db):
    """Test the happy path where competitions are returned."""
    fake_comps = [
        SimpleNamespace(
            event_id=101,
            base_event=SimpleNamespace(
                event_name="Winter Hackathon",
                event_location="Montreal",
                event_start_date=datetime(2025, 12, 1, 10, 0, 0),
                event_end_date=datetime(2025, 12, 1, 18, 0, 0),
            )
        ),
    ]

    mock_db.query.return_value = create_mock_query(fake_comps)
    response = client.get("/competitions/")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == 101
    assert data[0]["competition_title"] == "Winter Hackathon"


def test_get_all_competitions_empty(client, mock_db):
    """Test when the database is empty."""
    mock_db.query.return_value = create_mock_query([])
    response = client.get("/competitions/")

    assert response.status_code == 200
    assert response.json() == []


def test_get_all_competitions_db_error(client, mock_db):
    """Test how the endpoint handles a database exception."""
    mock_query = create_mock_query()
    mock_query.all.side_effect = Exception("DB Connection Lost")
    mock_db.query.return_value = mock_query

    response = client.get("/competitions/")
    assert response.status_code == 500
    assert "DB Connection Lost" in response.json()["detail"]


# --- TESTS FOR GET /list ---


def test_list_competitions_empty(client, mock_db):
    """Test listing when no competitions exist."""
    mock_query = create_mock_query([])
    mock_db.query.return_value = mock_query

    response = client.get("/competitions/list")
    assert response.status_code == 200
    assert response.json() == []


def test_list_competitions_error(client, mock_db):
    """Test error handling in list endpoint."""
    mock_query = create_mock_query()
    mock_query.join.side_effect = Exception("Database error")
    mock_db.query.return_value = mock_query

    response = client.get("/competitions/list")
    assert response.status_code == 500


# --- TESTS FOR POST /create ---

@patch('src.endpoints.competitions_api.send_competition_emails')
@patch('src.endpoints.competitions_api._commit_or_rollback')
def test_create_competition_success(mock_commit, mock_send_emails, client, mock_db):
    """Test successful competition creation."""

    # Ensure no existing competition
    name_check_query = create_mock_query([])
    mock_db.query.return_value = name_check_query

    # Mock refresh to assign event_id and created_at
    def refresh_side_effect(obj):
        if hasattr(obj, 'event_id') and obj.event_id is None:
            obj.event_id = 1
        if hasattr(obj, 'created_at') and obj.created_at is None:
            obj.created_at = datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc)  # ✅ valid datetime

    mock_db.refresh.side_effect = refresh_side_effect

    payload = {
        "name": "New Competition",
        "date": "2026-02-15",
        "startTime": "10:00",
        "endTime": "18:00",
        "location": "Test Location",
        "questionCooldownTime": 300,
        "riddleCooldownTime": 60,
        "selectedQuestions": [1, 2, 3],
        "selectedRiddles": [4, 5, 6],
        "emailEnabled": False
    }

    response = client.post("/competitions/create", json=payload)
    assert response.status_code == 201



def test_create_competition_duplicate_name(client, mock_db):
    """Test creating competition with duplicate name."""
    # Mock existing competition
    existing = SimpleNamespace(event_id=1, event_name="Existing Competition")
    mock_db.query.return_value = create_mock_query([existing])

    payload = {
        "name": "Existing Competition",
        "date": "2026-02-15",
        "startTime": "10:00",
        "endTime": "18:00",
        "questionCooldownTime": 300,
        "riddleCooldownTime": 60,
        "selectedQuestions": [1, 2],
        "selectedRiddles": [3, 4]
    }

    response = client.post("/competitions/create", json=payload)
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


def test_create_competition_empty_name(client, mock_db):
    """Test validation for empty competition name."""
    payload = {
        "name": "   ",
        "date": "2026-02-15",
        "startTime": "10:00",
        "endTime": "18:00",
        "questionCooldownTime": 300,
        "riddleCooldownTime": 60,
        "selectedQuestions": [1],
        "selectedRiddles": [2]
    }

    response = client.post("/competitions/create", json=payload)
    assert response.status_code == 422


def test_create_competition_no_questions(client, mock_db):
    """Test validation for empty question list."""
    payload = {
        "name": "Test Competition",
        "date": "2026-02-15",
        "startTime": "10:00",
        "endTime": "18:00",
        "questionCooldownTime": 300,
        "riddleCooldownTime": 60,
        "selectedQuestions": [],
        "selectedRiddles": []
    }

    response = client.post("/competitions/create", json=payload)
    assert response.status_code == 422


def test_create_competition_mismatched_lengths(client, mock_db):
    """Test validation when questions and riddles have different lengths."""
    payload = {
        "name": "Test Competition",
        "date": "2026-02-15",
        "startTime": "10:00",
        "endTime": "18:00",
        "questionCooldownTime": 300,
        "riddleCooldownTime": 60,
        "selectedQuestions": [1, 2, 3],
        "selectedRiddles": [4, 5]
    }

    response = client.post("/competitions/create", json=payload)
    assert response.status_code == 422


def test_create_competition_negative_cooldown(client, mock_db):
    """Test validation for negative cooldown time."""
    payload = {
        "name": "Test Competition",
        "date": "2026-02-15",
        "startTime": "10:00",
        "endTime": "18:00",
        "questionCooldownTime": -100,
        "riddleCooldownTime": 60,
        "selectedQuestions": [1],
        "selectedRiddles": [2]
    }

    response = client.post("/competitions/create", json=payload)
    assert response.status_code == 422


def test_create_competition_end_before_start(client, mock_db):
    """Test validation when end time is before start time."""
    mock_db.query.return_value = create_mock_query([])

    payload = {
        "name": "Test Competition",
        "date": "2026-02-15",
        "startTime": "18:00",
        "endTime": "10:00",
        "questionCooldownTime": 300,
        "riddleCooldownTime": 60,
        "selectedQuestions": [1],
        "selectedRiddles": [2]
    }

    response = client.post("/competitions/create", json=payload)
    assert response.status_code == 400
    assert "after start time" in response.json()["detail"]


def test_create_competition_past_date(client, mock_db):
    """Test validation when start time is in the past."""
    mock_db.query.return_value = create_mock_query([])

    payload = {
        "name": "Test Competition",
        "date": "2020-01-01",
        "startTime": "10:00",
        "endTime": "18:00",
        "questionCooldownTime": 300,
        "riddleCooldownTime": 60,
        "selectedQuestions": [1],
        "selectedRiddles": [2]
    }

    response = client.post("/competitions/create", json=payload)
    assert response.status_code == 400
    assert "future" in response.json()["detail"]


@patch('src.endpoints.competitions_api.send_competition_emails')
@patch('src.endpoints.competitions_api._commit_or_rollback')
def test_create_competition_with_email(mock_commit, mock_send_emails, client, mock_db):
    """Test creating competition with email notifications."""

    # No existing competition
    mock_db.query.return_value = create_mock_query([])

    # Mock refresh to populate event_id and created_at
    def refresh_side_effect(obj):
        if hasattr(obj, 'event_id') and obj.event_id is None:
            obj.event_id = 1
        if hasattr(obj, 'created_at') and obj.created_at is None:
            obj.created_at = datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc)

    mock_db.refresh.side_effect = refresh_side_effect

    payload = {
        "name": "Email Competition",
        "date": "2026-03-15",
        "startTime": "10:00",
        "endTime": "18:00",
        "questionCooldownTime": 300,
        "riddleCooldownTime": 60,
        "selectedQuestions": [1],
        "selectedRiddles": [2],
        "emailEnabled": True,
        "emailNotification": {
            "to": "test@example.com",
            "subject": "Competition Reminder",
            "body": "Don't forget!",
            "sendInOneMinute": False
        }
    }

    response = client.post("/competitions/create", json=payload)
    assert response.status_code == 201



# --- TESTS FOR GET /{competition_id} ---

def test_get_competition_detailed_success(client, mock_db):
    """Test getting detailed competition information."""
    base_event = SimpleNamespace(
        event_id=1,
        event_name="Test Competition",
        event_location="Test Location",
        event_start_date=datetime(2026, 2, 15, 10, 0, 0, tzinfo=timezone.utc),
        event_end_date=datetime(2026, 2, 15, 18, 0, 0, tzinfo=timezone.utc),
        question_cooldown=300
    )
    competition = SimpleNamespace(riddle_cooldown=60)
    question_instances = [
        SimpleNamespace(question_instance_id=1, question_id=10, riddle_id=20),
        SimpleNamespace(question_instance_id=2, question_id=11, riddle_id=21)
    ]

    def query_side_effect(model):
        mock_q = create_mock_query()
        model_name = str(model)

        if 'BaseEvent' in model_name:
            mock_q.first.return_value = base_event
        elif 'Competition' in model_name and 'Email' not in model_name:
            mock_q.first.return_value = competition
        elif 'QuestionInstance' in model_name:
            mock_q.all.return_value = question_instances
        elif 'CompetitionEmail' in model_name:
            mock_q.first.return_value = None

        return mock_q

    mock_db.query.side_effect = query_side_effect

    response = client.get("/competitions/1")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == 1
    assert data["competitionTitle"] == "Test Competition"
    assert len(data["selectedQuestions"]) == 2
    assert data["selectedQuestions"] == [10, 11]
    assert data["selectedRiddles"] == [20, 21]


def test_get_competition_detailed_not_found(client, mock_db):
    """Test getting non-existent competition."""
    mock_db.query.return_value = create_mock_query([])

    response = client.get("/competitions/999")
    assert response.status_code == 404


def test_get_competition_detailed_with_email(client, mock_db):
    """Test getting competition with email notification."""
    base_event = SimpleNamespace(
        event_id=1,
        event_name="Test Competition",
        event_location="Test Location",
        event_start_date=datetime(2026, 2, 15, 10, 0, 0, tzinfo=timezone.utc),
        event_end_date=datetime(2026, 2, 15, 18, 0, 0, tzinfo=timezone.utc),
        question_cooldown=300
    )
    competition = SimpleNamespace(riddle_cooldown=60)
    email = SimpleNamespace(
        to="test@example.com",
        subject="Test Subject",
        body="Test Body",
        time_24h_before=datetime(2026, 2, 14, 10, 0, 0, tzinfo=timezone.utc),
        time_5min_before=datetime(2026, 2, 15, 9, 55, 0, tzinfo=timezone.utc),
        other_time=datetime(2026, 2, 15, 8, 0, 0, tzinfo=timezone.utc)
    )

    def query_side_effect(model):
        mock_q = create_mock_query()
        model_name = str(model)

        if 'BaseEvent' in model_name:
            mock_q.first.return_value = base_event
        elif 'Competition' in model_name and 'Email' not in model_name:
            mock_q.first.return_value = competition
        elif 'QuestionInstance' in model_name:
            mock_q.all.return_value = []
        elif 'CompetitionEmail' in model_name:
            mock_q.first.return_value = email

        return mock_q

    mock_db.query.side_effect = query_side_effect

    response = client.get("/competitions/1")

    assert response.status_code == 200
    data = response.json()
    assert data["emailNotification"] is not None
    assert data["emailNotification"]["subject"] == "Test Subject"


# --- TESTS FOR PUT /{competition_id} ---


def test_update_competition_not_found(client, mock_db):
    """Test updating non-existent competition."""
    mock_db.query.return_value = create_mock_query([])

    payload = {
        "name": "Updated Name",
        "date": "2026-03-15",
        "startTime": "11:00",
        "endTime": "19:00",
        "questionCooldownTime": 400,
        "riddleCooldownTime": 70,
        "selectedQuestions": [1],
        "selectedRiddles": [2]
    }

    response = client.put("/competitions/999", json=payload)
    assert response.status_code == 404


def test_update_competition_duplicate_name(client, mock_db):
    """Test updating with a name that already exists."""
    base_event = SimpleNamespace(event_id=1, event_name="Old Name")
    competition = SimpleNamespace(riddle_cooldown=60, event_id=1)
    existing_other = SimpleNamespace(event_id=2, event_name="Existing Name")

    call_count = [0]

    def query_side_effect(model):
        mock_q = create_mock_query()
        model_name = str(model)

        if 'BaseEvent' in model_name:
            call_count[0] += 1
            if call_count[0] == 1:
                mock_q.first.return_value = base_event
            else:
                # Name check query
                mock_q.first.return_value = existing_other
        elif 'Competition' in model_name:
            mock_q.first.return_value = competition

        return mock_q

    mock_db.query.side_effect = query_side_effect

    payload = {
        "name": "Existing Name",
        "date": "2026-03-15",
        "startTime": "11:00",
        "endTime": "19:00",
        "questionCooldownTime": 400,
        "riddleCooldownTime": 70,
        "selectedQuestions": [1],
        "selectedRiddles": [2]
    }

    response = client.put("/competitions/1", json=payload)
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


# --- TESTS FOR DELETE /{competition_id} ---

@patch('src.endpoints.competitions_api._commit_or_rollback')
def test_delete_competition_success(mock_commit, client, mock_db):
    """Test successful competition deletion."""
    base_event = SimpleNamespace(event_id=1, event_name="Test Competition")

    mock_db.query.return_value = create_mock_query([base_event])

    response = client.delete("/competitions/1")
    assert response.status_code == 204


def test_delete_competition_not_found(client, mock_db):
    """Test deleting non-existent competition."""
    mock_db.query.return_value = create_mock_query([])

    response = client.delete("/competitions/999")
    assert response.status_code == 404


@patch('src.endpoints.competitions_api._commit_or_rollback')
def test_delete_competition_db_error(mock_commit, client, mock_db):
    """Test delete with database error."""
    base_event = SimpleNamespace(event_id=1, event_name="Test Competition")

    mock_query = create_mock_query([base_event])
    mock_query.delete.side_effect = Exception("Database error")
    mock_db.query.return_value = mock_query

    response = client.delete("/competitions/1")
    assert response.status_code == 500


# --- ADDITIONAL EDGE CASE TESTS ---

def test_parse_datetime_invalid_format(client, mock_db):
    """Test invalid date/time format handling."""
    mock_db.query.return_value = create_mock_query([])

    payload = {
        "name": "Test Competition",
        "date": "invalid-date",
        "startTime": "10:00",
        "endTime": "18:00",
        "questionCooldownTime": 300,
        "riddleCooldownTime": 60,
        "selectedQuestions": [1],
        "selectedRiddles": [2]
    }

    response = client.post("/competitions/create", json=payload)
    # Should get validation error or 400
    assert response.status_code in [400, 422]


@patch('src.endpoints.competitions_api._commit_or_rollback')
def test_create_competition_db_rollback_on_error(mock_commit, client, mock_db):
    """Test that database rollback is called on error."""
    mock_db.query.return_value = create_mock_query([])

    def refresh_side_effect(obj):
        raise Exception("Database error during refresh")

    mock_db.refresh.side_effect = refresh_side_effect

    payload = {
        "name": "Test Competition",
        "date": "2026-02-15",
        "startTime": "10:00",
        "endTime": "18:00",
        "questionCooldownTime": 300,
        "riddleCooldownTime": 60,
        "selectedQuestions": [1],
        "selectedRiddles": [2]
    }

    response = client.post("/competitions/create", json=payload)
    assert response.status_code == 500
    assert mock_db.rollback.called


@patch('src.endpoints.competitions_api._commit_or_rollback')
def test_update_competition_keeps_same_name(mock_commit, client, mock_db):
    """Test updating competition while keeping the same name."""
    base_event = SimpleNamespace(
        event_id=1,
        event_name="Same Name",
        event_location="Old Location",
        question_cooldown=300,
        event_start_date=datetime(2026, 2, 15, 10, 0, 0, tzinfo=timezone.utc),
        event_end_date=datetime(2026, 2, 15, 18, 0, 0, tzinfo=timezone.utc),
        created_at=datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    )
    competition = SimpleNamespace(riddle_cooldown=60, event_id=1)

    def query_side_effect(model):
        mock_q = create_mock_query()
        model_name = str(model)

        if 'BaseEvent' in model_name:
            mock_q.first.return_value = base_event
        elif 'Competition' in model_name:
            mock_q.first.return_value = competition

        return mock_q

    mock_db.query.side_effect = query_side_effect

    payload = {
        "name": "Same Name",  # Same as current
        "date": "2026-03-15",
        "startTime": "11:00",
        "endTime": "19:00",
        "location": "New Location",
        "questionCooldownTime": 400,
        "riddleCooldownTime": 70,
        "selectedQuestions": [1, 2],
        "selectedRiddles": [3, 4],
        "emailEnabled": False
    }

    response = client.put("/competitions/1", json=payload)
    assert response.status_code == 200


def test_email_notification_invalid_datetime(client, mock_db):
    """Test email notification with invalid sendAtLocal format."""
    payload = {
        "name": "Test Competition",
        "date": "2026-02-15",
        "startTime": "10:00",
        "endTime": "18:00",
        "questionCooldownTime": 300,
        "riddleCooldownTime": 60,
        "selectedQuestions": [1],
        "selectedRiddles": [2],
        "emailEnabled": True,
        "emailNotification": {
            "to": "test@example.com",
            "subject": "Test",
            "body": "Test body",
            "sendInOneMinute": False,
            "sendAtLocal": "invalid-datetime"
        }
    }

    response = client.post("/competitions/create", json=payload)
    assert response.status_code == 422