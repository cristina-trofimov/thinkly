import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from types import SimpleNamespace
from unittest.mock import MagicMock
from datetime import datetime
from sqlalchemy.exc import IntegrityError

import sys
import os

from endpoints.algotime_sessions_api import algotime_router
from DB_Methods import database
from endpoints.authentification_api import role_required, get_current_user

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
        question=mock_question,
        points=100
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
    assert data[0]["event_name"] == "Session 1"
    assert data[0]["series_id"] == 1
    assert len(data[0]["questions"]) == 1
    assert data[0]["questions"][0]["question_name"] == "Two Sum"