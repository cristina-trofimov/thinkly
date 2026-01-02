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