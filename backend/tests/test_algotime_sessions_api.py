import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from types import SimpleNamespace
from unittest.mock import MagicMock


from endpoints.algotime_sessions_api import algotime_router
from database_operations import database
from endpoints.authentification_api import get_current_user
from models.schema import AlgoTimeSession,BaseEvent, QuestionInstance


@pytest.fixture
def mock_db():
    return MagicMock()

@pytest.fixture
def client(mock_db):
    test_app = FastAPI()
    test_app.include_router(algotime_router)

    def override_get_db():
        yield mock_db

    def override_get_current_user():
        return {"id": 1, "role": "admin"}

    test_app.dependency_overrides[database.get_db] = override_get_db
    test_app.dependency_overrides[get_current_user] = override_get_current_user

    return TestClient(test_app)

def test_create_algotime_success(client, mock_db):
    payload = {
        "seriesName": "AlgoTime Session",
        "questionCooldown": 300,
        "sessions": [
            {
                "name": "Session 1",
                "date": "2025-12-28",
                "startTime": "20:00",
                "endTime": "21:00",
                "selectedQuestions": [1, 2, 3, 4, 5, 6]
            }
        ]
    }

    # --- DB behavior ---
    mock_db.add.return_value = None
    mock_db.flush.return_value = None
    mock_db.commit.return_value = None

    mock_query = MagicMock()
    mock_query.filter.return_value = mock_query
    mock_query.first.return_value = None
    mock_query.count.return_value = 6

    mock_db.query.return_value = mock_query

    response = client.post("/create", json=payload)

    assert response.status_code == 201


def test_create_algotime_duplicate_series(client, mock_db):
    payload = {
        "seriesName": "AlgoTime Session",
        "sessions": [
            {
                "name": "Session 1",
                "date": "2025-12-28",
                "startTime": "20:00",
                "endTime": "21:00",
                "selectedQuestions": [1]
            }
        ]
    }

    # Simulate existing series
    mock_query = MagicMock()
    mock_query.filter.return_value = mock_query
    mock_query.first.return_value = SimpleNamespace(id=1)

    mock_db.query.return_value = mock_query

    response = client.post("/create", json=payload)

    assert response.status_code == 409

def test_get_all_algotime_sessions_success(client, mock_db):
    # Mock data structures
    mock_tag1 = SimpleNamespace(tag_name="Arrays")
    mock_tag2 = SimpleNamespace(tag_name="Dynamic Programming")
    
    mock_question = SimpleNamespace(
        question_id=1,
        question_name="Two Sum",
        question_description="Find two numbers that add up to target",
        difficulty="Easy",
        tags=[mock_tag1, mock_tag2]
    )
    
    mock_question_instance = SimpleNamespace(
        question=mock_question
    )
    
    mock_series = SimpleNamespace(
        algotime_series_id=1,
        algotime_series_name="Winter 2025 Series"
    )
    
    mock_event = SimpleNamespace(
        event_id=1,
        event_name="Session 1",
        event_start_date="2025-12-28T20:00:00",
        event_end_date="2025-12-28T21:00:00",
        question_cooldown=300
    )
    
    mock_session = SimpleNamespace(
        event_id=1,
        base_event=mock_event,
        algotime_series=mock_series
    )
    
    # Setup mock query chain
    mock_sessions_query = MagicMock()
    mock_sessions_query.all.return_value = [mock_session]
    
    mock_questions_query = MagicMock()
    mock_questions_query.filter.return_value = mock_questions_query
    mock_questions_query.all.return_value = [mock_question_instance]
    
    # Configure mock_db.query to return different queries based on the model
    def query_side_effect(model):
        if model == AlgoTimeSession:
            return mock_sessions_query
        elif model == QuestionInstance:
            return mock_questions_query
        return MagicMock()
    
    mock_db.query.side_effect = query_side_effect
    
    response = client.get("/")
    
    assert response.status_code == 200
    data = response.json()
    
    assert len(data) == 1
    assert data[0]["id"] == 1
    assert data[0]["eventName"] == "Session 1"
    assert data[0]["seriesId"] == 1
    assert len(data[0]["questions"]) == 1
    assert data[0]["questions"][0]["questionName"] == "Two Sum"

def test_get_algotime_session_success(client, mock_db):
    mock_tag = SimpleNamespace(tag_name="Arrays")
    mock_question = SimpleNamespace(
        question_id=1,
        question_name="Two Sum",
        question_description="Find two numbers",
        difficulty="Easy",
        tags=[mock_tag]
    )
    mock_question_instance = SimpleNamespace(
        question=mock_question,
    )
    mock_series = SimpleNamespace(
        algotime_series_id=1,
        algotime_series_name="Winter Series"
    )
    mock_event = SimpleNamespace(
        event_id=1,
        event_name="Session 1",
        event_start_date="2025-12-28T20:00:00",
        event_end_date="2025-12-28T21:00:00",
        question_cooldown=300,
        event_location="Room 101"
    )
    mock_session = SimpleNamespace(
        event_id=1,
        base_event=mock_event,
        algotime_series_id=1,
        algotime_series=mock_series
    )

    def query_side_effect(model):
        mock_query = MagicMock()
        mock_query.filter.return_value = mock_query
        if model == AlgoTimeSession:
            mock_query.first.return_value = mock_session
        elif model == QuestionInstance:
            mock_query.all.return_value = [mock_question_instance]
        return mock_query

    mock_db.query.side_effect = query_side_effect

    response = client.get("/1")

    assert response.status_code == 200
    data = response.json()
    assert data["eventName"] == "Session 1"
    assert data["location"] == "Room 101"
    assert data["questionCooldown"] == 300
    assert len(data["questions"]) == 1
    assert data["questions"][0]["questionName"] == "Two Sum"


def test_get_algotime_session_not_found(client, mock_db):
    mock_query = MagicMock()
    mock_query.filter.return_value = mock_query
    mock_query.first.return_value = None
    mock_db.query.return_value = mock_query

    response = client.get("/999")

    assert response.status_code == 404


def test_update_algotime_session_success(client, mock_db):
    mock_question = SimpleNamespace(
        question_id=1,
        question_name="Two Sum",
        question_description="Find two numbers",
        difficulty="Easy",
        tags=[]
    )
    mock_question_instance = SimpleNamespace(
        question=mock_question,
        points=0
    )
    mock_series = SimpleNamespace(
        algotime_series_id=1,
        algotime_series_name="Winter Series"
    )
    mock_event = MagicMock()
    mock_event.event_id = 1
    mock_event.event_name = "Updated Session"
    mock_event.event_start_date = "2025-12-28T20:00:00"
    mock_event.event_end_date = "2025-12-28T21:00:00"
    mock_event.question_cooldown = 300
    mock_event.event_location = "Room 101"

    mock_session = SimpleNamespace(
        event_id=1,
        base_event=mock_event,
        algotime_series_id=1,
        algotime_series=mock_series
    )

    def query_side_effect(model):
        mock_query = MagicMock()
        mock_query.filter.return_value = mock_query
        if model == AlgoTimeSession:
            mock_query.first.return_value = mock_session
        elif model == QuestionInstance:
            mock_query.all.return_value = [mock_question_instance]
            mock_query.delete.return_value = None
        return mock_query

    mock_db.query.side_effect = query_side_effect
    mock_db.commit.return_value = None
    mock_db.refresh.return_value = None

    payload = {
        "name": "Updated Session",
        "date": "2025-12-28",
        "startTime": "20:00",
        "endTime": "21:00",
        "selectedQuestions": [1],
        "location": "Room 101"
    }

    response = client.put("/1", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["eventName"] == "Updated Session"


def test_update_algotime_session_not_found(client, mock_db):
    mock_query = MagicMock()
    mock_query.filter.return_value = mock_query
    mock_query.first.return_value = None
    mock_db.query.return_value = mock_query

    payload = {
        "name": "Updated Session",
        "date": "2025-12-28",
        "startTime": "20:00",
        "endTime": "21:00",
        "selectedQuestions": [1],
        "location": "Room 101"
    }

    response = client.put("/999", json=payload)

    assert response.status_code == 404


def test_delete_algotime_session_success(client, mock_db):
    mock_event = SimpleNamespace(
        event_id=1,
        event_name="Session 1"
    )
    mock_session = SimpleNamespace(
        event_id=1,
        algotime_series_id=1
    )

    def query_side_effect(model):
        mock_query = MagicMock()
        mock_query.filter.return_value = mock_query
        if model == AlgoTimeSession:
            mock_query.first.return_value = mock_session
            mock_query.count.return_value = 0
        elif model == BaseEvent:
            mock_query.first.return_value = mock_event
        elif model == QuestionInstance:
            mock_query.delete.return_value = None
        return mock_query

    mock_db.query.side_effect = query_side_effect
    mock_db.delete.return_value = None
    mock_db.flush.return_value = None
    mock_db.commit.return_value = None

    response = client.delete("/1")

    assert response.status_code == 204


def test_delete_algotime_session_not_found(client, mock_db):
    mock_query = MagicMock()
    mock_query.filter.return_value = mock_query
    mock_query.first.return_value = None
    mock_db.query.return_value = mock_query

    response = client.delete("/999")

    assert response.status_code == 404


def test_delete_algotime_session_cleans_up_empty_series(client, mock_db):
    mock_event = SimpleNamespace(
        event_id=1,
        event_name="Session 1"
    )
    mock_session = SimpleNamespace(
        event_id=1,
        algotime_series_id=5
    )

    call_counts = {"algotime_session_count": 0}

    def query_side_effect(model):
        mock_query = MagicMock()
        mock_query.filter.return_value = mock_query
        if model == AlgoTimeSession:
            call_counts["algotime_session_count"] += 1
            if call_counts["algotime_session_count"] == 1:
                mock_query.first.return_value = mock_session
            else:
                mock_query.count.return_value = 0
        elif model == BaseEvent:
            mock_query.first.return_value = mock_event
        else:
            mock_query.delete.return_value = None
        return mock_query

    mock_db.query.side_effect = query_side_effect
    mock_db.delete.return_value = None
    mock_db.flush.return_value = None
    mock_db.commit.return_value = None

    response = client.delete("/1")

    assert response.status_code == 204
    # Verify series cleanup was attempted
    assert mock_db.commit.called