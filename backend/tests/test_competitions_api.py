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

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

from database_operations import database
from src.endpoints.competitions_api import (
    competitions_router,
    resolve_email_recipients,
    check_competition_name_exists,
    validate_competition_times,
    parse_datetime_from_request,
    create_competition_emails,
    send_competition_emails,
)
from src.endpoints import authentification_api


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_db():
    db = MagicMock()
    db.commit = MagicMock()
    db.rollback = MagicMock()
    db.refresh = MagicMock()
    db.add = MagicMock()
    db.delete = MagicMock()
    return db


@pytest.fixture
def client(mock_db):
    test_app = FastAPI()
    test_app.include_router(competitions_router, prefix="/competitions")

    def override_get_db():
        try:
            yield mock_db
        finally:
            pass

    def override_get_current_user():
        return {"sub": "test@example.com", "role": "admin", "id": 1}

    from src.endpoints import competitions_api

    test_app.dependency_overrides[database.get_db] = override_get_db
    test_app.dependency_overrides[competitions_api.get_current_user] = override_get_current_user

    return TestClient(test_app)


def create_mock_query(return_value=None):
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


# ---------------------------------------------------------------------------
# GET /
# ---------------------------------------------------------------------------

def test_get_all_competitions_success(client, mock_db):
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
    assert data["total"] == 1
    assert data["page"] == 1
    assert data["items"][0]["id"] == 101
    assert data["items"][0]["competition_title"] == "Winter Hackathon"


def test_get_all_competitions_empty(client, mock_db):
    mock_db.query.return_value = create_mock_query([])
    response = client.get("/competitions/")
    assert response.status_code == 200
    assert response.json() == {
        "total": 0,
        "page": 1,
        "page_size": 11,
        "items": [],
    }


def test_get_all_competitions_db_error(client, mock_db):
    mock_query = create_mock_query()
    mock_query.all.side_effect = Exception("DB Connection Lost")
    mock_db.query.return_value = mock_query
    response = client.get("/competitions/")
    assert response.status_code == 500
    assert response.json()["detail"] == "Failed to retrieve competitions."


# ---------------------------------------------------------------------------
# GET /list
# ---------------------------------------------------------------------------

def test_list_competitions_empty(client, mock_db):
    mock_query = create_mock_query([])
    mock_db.query.return_value = mock_query
    response = client.get("/competitions/list")
    assert response.status_code == 200
    assert response.json() == []


def test_list_competitions_error(client, mock_db):
    mock_query = create_mock_query()
    mock_query.join.side_effect = Exception("Database error")
    mock_db.query.return_value = mock_query
    response = client.get("/competitions/list")
    assert response.status_code == 500


def test_list_competitions_success(client, mock_db):
    """GET /list with actual data returns correctly shaped CompetitionResponse objects."""
    base_event = SimpleNamespace(
        event_id=5,
        event_name="Spring Contest",
        event_location="Quebec City",
        event_start_date=datetime(2026, 4, 1, 9, 0, 0, tzinfo=timezone.utc),
        event_end_date=datetime(2026, 4, 1, 17, 0, 0, tzinfo=timezone.utc),
        question_cooldown=300,
        created_at=datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc),
    )
    competition = SimpleNamespace(riddle_cooldown=60, event_id=5)

    join_query = MagicMock()
    join_query.join.return_value = join_query
    join_query.order_by.return_value = join_query
    join_query.all.return_value = [(base_event, competition)]

    count_query = MagicMock()
    count_query.filter.return_value = count_query
    count_query.count.return_value = 3

    call_count = [0]

    # db.query(BaseEvent, Competition) passes TWO positional args, so *args is required.
    def query_side_effect(*args):
        call_count[0] += 1
        if call_count[0] == 1:
            return join_query
        return count_query

    mock_db.query.side_effect = query_side_effect

    response = client.get("/competitions/list")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["event_id"] == 5
    assert data[0]["event_name"] == "Spring Contest"


# ---------------------------------------------------------------------------
# POST /create
# ---------------------------------------------------------------------------

@patch('src.endpoints.competitions_api.datetime')
@patch('src.endpoints.competitions_api.send_competition_emails')
@patch('src.endpoints.competitions_api._commit_or_rollback')
def test_create_competition_success(mock_commit, mock_send_emails, mock_datetime, client, mock_db):
    mock_datetime.now.return_value = datetime(2026, 2, 15, 9, 0, 0, tzinfo=timezone.utc)
    mock_datetime.fromisoformat = datetime.fromisoformat
    mock_datetime.side_effect = lambda *args, **kwargs: datetime(*args, **kwargs)

    mock_db.query.return_value = create_mock_query([])

    def refresh_side_effect(obj):
        if hasattr(obj, 'event_id') and obj.event_id is None:
            obj.event_id = 1
        if hasattr(obj, 'created_at') and obj.created_at is None:
            obj.created_at = datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc)

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
    mock_db.query.return_value = create_mock_query([])
    payload = {
        "name": "Test Competition",
        "date": "2026-07-15",
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


@patch('src.endpoints.competitions_api.datetime')
@patch('src.endpoints.competitions_api.send_competition_emails')
@patch('src.endpoints.competitions_api._commit_or_rollback')
def test_create_competition_with_email(mock_commit, mock_send_emails, mock_datetime, client, mock_db):
    mock_datetime.now.return_value = datetime(2026, 3, 15, 9, 0, 0, tzinfo=timezone.utc)
    mock_datetime.fromisoformat = datetime.fromisoformat
    mock_datetime.side_effect = lambda *args, **kwargs: datetime(*args, **kwargs)

    mock_db.query.return_value = create_mock_query([])

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
    mock_send_emails.assert_called_once()


@patch('src.endpoints.competitions_api.send_competition_emails')
@patch('src.endpoints.competitions_api._commit_or_rollback')
def test_create_competition_without_location(mock_commit, mock_send_emails, client, mock_db):
    """location is optional — competition should still be created successfully."""
    mock_db.query.return_value = create_mock_query([])

    def refresh_side_effect(obj):
        if hasattr(obj, 'event_id') and obj.event_id is None:
            obj.event_id = 7
        if hasattr(obj, 'created_at') and obj.created_at is None:
            obj.created_at = datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc)

    mock_db.refresh.side_effect = refresh_side_effect

    payload = {
        "name": "No Location Comp",
        "date": "2026-06-01",
        "startTime": "09:00",
        "endTime": "17:00",
        "questionCooldownTime": 120,
        "riddleCooldownTime": 30,
        "selectedQuestions": [10],
        "selectedRiddles": [20],
        "emailEnabled": False,
    }

    response = client.post("/competitions/create", json=payload)
    assert response.status_code == 201


@patch('src.endpoints.competitions_api.datetime')
@patch('src.endpoints.competitions_api.send_competition_emails')
@patch('src.endpoints.competitions_api._commit_or_rollback')
def test_create_competition_email_failure_does_not_block_201(
    mock_commit, mock_send_emails, mock_datetime, client, mock_db
):
    """Email scheduling failure should be swallowed — competition still returns 201."""
    mock_datetime.now.return_value = datetime(2026, 2, 15, 9, 0, 0, tzinfo=timezone.utc)
    mock_datetime.fromisoformat = datetime.fromisoformat
    mock_datetime.side_effect = lambda *args, **kwargs: datetime(*args, **kwargs)

    mock_send_emails.side_effect = Exception("SMTP timeout")
    mock_db.query.return_value = create_mock_query([])

    def refresh_side_effect(obj):
        if hasattr(obj, 'event_id') and obj.event_id is None:
            obj.event_id = 2
        if hasattr(obj, 'created_at') and obj.created_at is None:
            obj.created_at = datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc)

    mock_db.refresh.side_effect = refresh_side_effect

    payload = {
        "name": "Email Fail Comp",
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
            "subject": "Reminder",
            "body": "Details here.",
            "sendInOneMinute": False,
        },
    }

    response = client.post("/competitions/create", json=payload)
    assert response.status_code == 201


@patch('src.endpoints.competitions_api.datetime')
@patch('src.endpoints.competitions_api._commit_or_rollback')
def test_create_competition_db_rollback_on_error(mock_commit, mock_datetime, client, mock_db):
    mock_datetime.now.return_value = datetime(2026, 2, 15, 9, 0, 0, tzinfo=timezone.utc)
    mock_datetime.fromisoformat = datetime.fromisoformat
    mock_datetime.side_effect = lambda *args, **kwargs: datetime(*args, **kwargs)

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


# ---------------------------------------------------------------------------
# GET /{competition_id}
# ---------------------------------------------------------------------------

def test_get_competition_detailed_success(client, mock_db):
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
    assert data["selectedQuestions"] == [10, 11]
    assert data["selectedRiddles"] == [20, 21]


def test_get_competition_detailed_not_found(client, mock_db):
    mock_db.query.return_value = create_mock_query([])
    response = client.get("/competitions/999")
    assert response.status_code == 404


def test_get_competition_detailed_with_email(client, mock_db):
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
    assert data["emailNotification"]["subject"] == "Test Subject"


def test_get_competition_detailed_no_questions(client, mock_db):
    """Competition with no question instances returns empty lists."""
    base_event = SimpleNamespace(
        event_id=3,
        event_name="Empty Comp",
        event_location=None,
        event_start_date=datetime(2026, 5, 1, 10, 0, 0, tzinfo=timezone.utc),
        event_end_date=datetime(2026, 5, 1, 18, 0, 0, tzinfo=timezone.utc),
        question_cooldown=200
    )
    competition = SimpleNamespace(riddle_cooldown=45)

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
            mock_q.first.return_value = None
        return mock_q

    mock_db.query.side_effect = query_side_effect

    response = client.get("/competitions/3")
    assert response.status_code == 200
    data = response.json()
    assert data["selectedQuestions"] == []
    assert data["selectedRiddles"] == []


# ---------------------------------------------------------------------------
# PUT /{competition_id}
# ---------------------------------------------------------------------------

def test_update_competition_not_found(client, mock_db):
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
    base_event = SimpleNamespace(event_id=1, event_name="Old Name")
    competition = SimpleNamespace(riddle_cooldown=60, event_id=1)
    existing_other = SimpleNamespace(event_id=2, event_name="Existing Name")

    call_count = [0]

    def query_side_effect(model):
        mock_q = create_mock_query()
        model_name = str(model)
        if 'BaseEvent' in model_name:
            call_count[0] += 1
            mock_q.first.return_value = base_event if call_count[0] == 1 else existing_other
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


@patch('src.endpoints.competitions_api._commit_or_rollback')
def test_update_competition_keeps_same_name(mock_commit, client, mock_db):
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
        "name": "Same Name",
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


@patch('src.endpoints.competitions_api._commit_or_rollback')
def test_update_competition_success(mock_commit, client, mock_db):
    """Full happy-path PUT: fields are updated and response contains new values."""
    base_event = SimpleNamespace(
        event_id=10,
        event_name="Old Name",
        event_location="Old Place",
        question_cooldown=200,
        event_start_date=datetime(2026, 3, 1, 10, 0, 0, tzinfo=timezone.utc),
        event_end_date=datetime(2026, 3, 1, 18, 0, 0, tzinfo=timezone.utc),
        created_at=datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc),
    )
    competition = SimpleNamespace(riddle_cooldown=30, event_id=10)

    # The update flow issues two db.query(BaseEvent) calls:
    #   1. Fetch competition by ID          -> return base_event
    #   2. check_competition_name_exists    -> return None (new name is unique)
    base_event_calls = [0]

    def query_side_effect(model):
        mock_q = create_mock_query()
        model_name = str(model)
        if 'BaseEvent' in model_name:
            base_event_calls[0] += 1
            mock_q.first.return_value = base_event if base_event_calls[0] == 1 else None
        elif 'Competition' in model_name:
            mock_q.first.return_value = competition
        return mock_q

    mock_db.query.side_effect = query_side_effect

    payload = {
        "name": "Updated Competition",
        "date": "2026-05-20",
        "startTime": "08:00",
        "endTime": "16:00",
        "location": "New Venue",
        "questionCooldownTime": 500,
        "riddleCooldownTime": 90,
        "selectedQuestions": [7, 8],
        "selectedRiddles": [9, 10],
        "emailEnabled": False,
    }

    response = client.put("/competitions/10", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["event_name"] == "Updated Competition"
    assert data["question_cooldown"] == 500


@patch('src.endpoints.competitions_api.create_competition_emails')
@patch('src.endpoints.competitions_api._commit_or_rollback')
def test_update_competition_with_email(mock_commit, mock_create_emails, client, mock_db):
    """PUT with emailEnabled=True calls create_competition_emails."""
    base_event = SimpleNamespace(
        event_id=11,
        event_name="Comp With Email",
        event_location="Somewhere",
        question_cooldown=300,
        event_start_date=datetime(2026, 4, 1, 10, 0, 0, tzinfo=timezone.utc),
        event_end_date=datetime(2026, 4, 1, 18, 0, 0, tzinfo=timezone.utc),
        created_at=datetime(2026, 1, 1, 0, 0, 0, tzinfo=timezone.utc),
    )
    competition = SimpleNamespace(riddle_cooldown=60, event_id=11)

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
        "name": "Comp With Email",
        "date": "2026-04-01",
        "startTime": "10:00",
        "endTime": "18:00",
        "questionCooldownTime": 300,
        "riddleCooldownTime": 60,
        "selectedQuestions": [1],
        "selectedRiddles": [2],
        "emailEnabled": True,
        "emailNotification": {
            "to": "all",
            "subject": "Update!",
            "body": "Competition was updated.",
            "sendInOneMinute": False,
        },
    }

    response = client.put("/competitions/11", json=payload)
    assert response.status_code == 200
    mock_create_emails.assert_called_once()


@patch('src.endpoints.competitions_api._commit_or_rollback')
def test_update_competition_end_before_start(mock_commit, client, mock_db):
    """PUT rejects end time <= start time."""
    base_event = SimpleNamespace(
        event_id=12, event_name="Timing Test",
        event_location=None, question_cooldown=300,
        event_start_date=datetime(2026, 3, 1, 10, 0, 0, tzinfo=timezone.utc),
        event_end_date=datetime(2026, 3, 1, 18, 0, 0, tzinfo=timezone.utc),
        created_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
    )
    competition = SimpleNamespace(riddle_cooldown=60, event_id=12)

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
        "name": "Timing Test",
        "date": "2026-03-01",
        "startTime": "18:00",
        "endTime": "10:00",
        "questionCooldownTime": 300,
        "riddleCooldownTime": 60,
        "selectedQuestions": [1],
        "selectedRiddles": [2],
        "emailEnabled": False,
    }

    response = client.put("/competitions/12", json=payload)
    assert response.status_code == 400
    assert "after start time" in response.json()["detail"]


# ---------------------------------------------------------------------------
# DELETE /{competition_id}
# ---------------------------------------------------------------------------

@patch('src.endpoints.competitions_api._commit_or_rollback')
def test_delete_competition_success(mock_commit, client, mock_db):
    base_event = SimpleNamespace(event_id=1, event_name="Test Competition")
    mock_db.query.return_value = create_mock_query([base_event])
    response = client.delete("/competitions/1")
    assert response.status_code == 204


def test_delete_competition_not_found(client, mock_db):
    mock_db.query.return_value = create_mock_query([])
    response = client.delete("/competitions/999")
    assert response.status_code == 404


@patch('src.endpoints.competitions_api._commit_or_rollback')
def test_delete_competition_db_error(mock_commit, client, mock_db):
    base_event = SimpleNamespace(event_id=1, event_name="Test Competition")
    mock_query = create_mock_query([base_event])
    mock_query.delete.side_effect = Exception("Database error")
    mock_db.query.return_value = mock_query
    response = client.delete("/competitions/1")
    assert response.status_code == 500


@patch('src.endpoints.competitions_api.track_custom_event')
@patch('src.endpoints.competitions_api._commit_or_rollback')
def test_delete_competition_tracks_event(mock_commit, mock_track, client, mock_db):
    """Successful delete emits a competition_deleted analytics event."""
    base_event = SimpleNamespace(event_id=5, event_name="Tracked Comp")
    mock_db.query.return_value = create_mock_query([base_event])

    response = client.delete("/competitions/5")
    assert response.status_code == 204

    mock_track.assert_called_once()
    call_kwargs = mock_track.call_args[1]
    assert call_kwargs["event_name"] == "competition_deleted"
    assert call_kwargs["properties"]["competition_id"] == 5
    assert call_kwargs["properties"]["competition_name"] == "Tracked Comp"


# ---------------------------------------------------------------------------
# Helper function unit tests
# ---------------------------------------------------------------------------

class TestResolveEmailRecipients:

    def test_comma_separated_emails(self, mock_db):
        """Comma-separated string is split and stripped."""
        result = resolve_email_recipients(mock_db, "a@example.com, b@example.com")
        assert result == ["a@example.com", "b@example.com"]

    def test_single_email(self, mock_db):
        result = resolve_email_recipients(mock_db, "user@example.com")
        assert result == ["user@example.com"]

    def test_all_participants_keyword(self, mock_db):
        """'all' keyword queries UserAccount and filters by opted-out preferences."""
        user_rows = [
            SimpleNamespace(user_id=1, email="a@x.com"),
            SimpleNamespace(user_id=2, email="b@x.com"),
            SimpleNamespace(user_id=3, email="c@x.com"),
        ]
        opted_out = [SimpleNamespace(user_id=2)]

        account_query = MagicMock()
        account_query.all.return_value = user_rows

        prefs_query = MagicMock()
        prefs_query.filter.return_value = prefs_query
        prefs_query.all.return_value = opted_out

        call_count = [0]

        def query_side_effect(*args):
            call_count[0] += 1
            return account_query if call_count[0] == 1 else prefs_query

        mock_db.query.side_effect = query_side_effect

        result = resolve_email_recipients(mock_db, "all")
        assert "a@x.com" in result
        assert "c@x.com" in result
        assert "b@x.com" not in result  # opted out

    def test_all_participants_case_insensitive(self, mock_db):
        """'ALL PARTICIPANTS' variant is recognised."""
        mock_db.query.return_value.all.return_value = []
        prefs_query = MagicMock()
        prefs_query.filter.return_value = prefs_query
        prefs_query.all.return_value = []

        call_count = [0]
        def query_side_effect(*args):
            call_count[0] += 1
            return MagicMock(all=MagicMock(return_value=[]))

        mock_db.query.side_effect = query_side_effect
        result = resolve_email_recipients(mock_db, "ALL PARTICIPANTS")
        assert result == []

    def test_all_participants_db_error_returns_empty(self, mock_db):
        """DB failure inside 'all' path returns [] instead of crashing."""
        mock_db.query.side_effect = Exception("DB error")
        result = resolve_email_recipients(mock_db, "all")
        assert result == []

    def test_skips_empty_entries_in_csv(self, mock_db):
        """Trailing commas and blank segments are ignored."""
        result = resolve_email_recipients(mock_db, "a@x.com,,  ,b@x.com,")
        assert result == ["a@x.com", "b@x.com"]


class TestCheckCompetitionNameExists:

    def test_returns_true_when_name_exists(self, mock_db):
        mock_db.query.return_value.filter.return_value.first.return_value = SimpleNamespace(event_id=1)
        assert check_competition_name_exists(mock_db, "My Comp") is True

    def test_returns_false_when_name_missing(self, mock_db):
        mock_db.query.return_value.filter.return_value.first.return_value = None
        assert check_competition_name_exists(mock_db, "Unknown") is False

    def test_exclude_id_filters_self(self, mock_db):
        """Passing exclude_id allows the same competition to keep its own name."""
        mock_db.query.return_value.filter.return_value.filter.return_value.first.return_value = None
        result = check_competition_name_exists(mock_db, "Same Name", exclude_id=1)
        assert result is False


class TestValidateCompetitionTimes:

    # FUTURE_START/END must be far enough ahead to survive CI runs for years.
    # PAST_START must be a genuinely historical date — NOT just "NOW - 2h" where
    # NOW is a class constant, because the constant may itself be in the future
    # relative to the real wall-clock when the test runs (which caused the original
    # failure: NOW=2026-03-01, real now=2026-02-28, so NOW-2h was still ahead).
    PAST_START   = datetime(2020, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
    FUTURE_START = datetime(2099, 6, 1, 10, 0, 0, tzinfo=timezone.utc)
    FUTURE_END   = datetime(2099, 6, 1, 18, 0, 0, tzinfo=timezone.utc)

    def test_valid_future_times_pass(self):
        validate_competition_times(self.FUTURE_START, self.FUTURE_END)  # must not raise

    def test_start_in_past_raises_400(self):
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            validate_competition_times(self.PAST_START, self.FUTURE_END)
        assert exc.value.status_code == 400
        assert "future" in exc.value.detail

    def test_end_before_start_raises_400(self):
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            validate_competition_times(self.FUTURE_END, self.FUTURE_START)
        assert exc.value.status_code == 400
        assert "after start time" in exc.value.detail

    def test_skip_future_check_allows_past_start(self):
        """skip_future_check=True bypasses the future-date guard (used for updates)."""
        validate_competition_times(self.PAST_START, self.FUTURE_END, skip_future_check=True)


class TestCreateCompetitionEmails:

    @patch('src.endpoints.competitions_api._commit_or_rollback')
    def test_creates_email_record_with_reminder_times(self, mock_commit, mock_db):
        competition = SimpleNamespace(event_id=99)
        email_data = MagicMock()
        email_data.subject = "Reminder"
        email_data.to = "user@x.com"
        email_data.body = "Join us!"
        email_data.sendInOneMinute = False
        email_data.sendAtLocal = None

        start_dt = datetime(2026, 5, 10, 14, 0, 0, tzinfo=timezone.utc)
        result = create_competition_emails(mock_db, competition, email_data, start_dt)

        mock_db.add.assert_called_once()
        added = mock_db.add.call_args[0][0]
        assert added.competition_id == 99
        assert added.time_24h_before == start_dt - timedelta(hours=24)
        assert added.time_5min_before == start_dt - timedelta(minutes=5)
        assert added.other_time is None

    @patch('src.endpoints.competitions_api._commit_or_rollback')
    def test_sets_other_time_when_send_in_one_minute(self, mock_commit, mock_db):
        competition = SimpleNamespace(event_id=1)
        email_data = MagicMock()
        email_data.subject = "Test"
        email_data.to = "u@x.com"
        email_data.body = "Body"
        email_data.sendInOneMinute = True
        email_data.sendAtLocal = None

        start_dt = datetime(2026, 5, 10, 14, 0, 0, tzinfo=timezone.utc)
        create_competition_emails(mock_db, competition, email_data, start_dt)

        added = mock_db.add.call_args[0][0]
        assert added.other_time is not None

    @patch('src.endpoints.competitions_api._commit_or_rollback')
    def test_sets_other_time_from_send_at_local(self, mock_commit, mock_db):
        competition = SimpleNamespace(event_id=2)
        email_data = MagicMock()
        email_data.subject = "Custom"
        email_data.to = "u@x.com"
        email_data.body = "Body"
        email_data.sendInOneMinute = False
        email_data.sendAtLocal = "2026-05-09T10:00:00+00:00"

        start_dt = datetime(2026, 5, 10, 14, 0, 0, tzinfo=timezone.utc)
        create_competition_emails(mock_db, competition, email_data, start_dt)

        added = mock_db.add.call_args[0][0]
        assert added.other_time is not None
        assert added.other_time.year == 2026


class TestSendCompetitionEmails:

    @patch('src.endpoints.competitions_api.send_email_via_brevo')
    @patch('src.endpoints.competitions_api.create_competition_emails')
    def test_logs_warning_when_no_recipients(self, mock_create, mock_brevo, mock_db):
        competition = SimpleNamespace(event_id=1)
        email_data = MagicMock()
        email_data.sendInOneMinute = False
        email_data.sendAtLocal = None
        mock_db.query.return_value.all.return_value = []

        # Stub resolve to return empty
        with patch('src.endpoints.competitions_api.resolve_email_recipients', return_value=[]):
            with patch('src.endpoints.competitions_api.logger') as mock_logger:
                send_competition_emails(
                    mock_db, competition, email_data,
                    datetime(2026, 5, 10, tzinfo=timezone.utc)
                )
                mock_logger.warning.assert_called_once()

        mock_brevo.assert_not_called()

    @patch('src.endpoints.competitions_api.send_email_via_brevo')
    @patch('src.endpoints.competitions_api.create_competition_emails')
    def test_sends_immediately_when_send_in_one_minute(self, mock_create, mock_brevo, mock_db):
        competition = SimpleNamespace(event_id=1)
        email_data = MagicMock()
        email_data.subject = "Test"
        email_data.body = "Body"
        email_data.sendInOneMinute = True
        email_data.sendAtLocal = None

        with patch('src.endpoints.competitions_api.resolve_email_recipients',
                   return_value=["u@x.com"]):
            send_competition_emails(
                mock_db, competition, email_data,
                datetime(2026, 5, 10, tzinfo=timezone.utc)
            )

        mock_brevo.assert_called_once()
        call_kwargs = mock_brevo.call_args[1]
        assert "[TEST]" in call_kwargs["subject"]

    @patch('src.endpoints.competitions_api.send_email_via_brevo')
    @patch('src.endpoints.competitions_api.create_competition_emails')
    def test_sends_via_brevo_when_send_at_local_set(self, mock_create, mock_brevo, mock_db):
        competition = SimpleNamespace(event_id=1)
        email_data = MagicMock()
        email_data.subject = "Scheduled"
        email_data.body = "Body"
        email_data.sendInOneMinute = False
        email_data.sendAtLocal = "2026-05-10T10:00:00+00:00"

        with patch('src.endpoints.competitions_api.resolve_email_recipients',
                   return_value=["u@x.com"]):
            send_competition_emails(
                mock_db, competition, email_data,
                datetime(2026, 5, 10, tzinfo=timezone.utc)
            )

        mock_brevo.assert_called_once()
        call_kwargs = mock_brevo.call_args[1]
        assert call_kwargs["subject"] == "Scheduled"


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------

def test_parse_datetime_invalid_format(client, mock_db):
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
    assert response.status_code in [400, 422]


def test_email_notification_invalid_datetime(client, mock_db):
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
