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

from database_operations.database import get_db  # fixed import
from src.endpoints.base_event_api import base_event_router


# --- FIXTURES ---

@pytest.fixture
def mock_db():
    return MagicMock()

@pytest.fixture
def client(mock_db):
    test_app = FastAPI()
    test_app.include_router(base_event_router)

    def override_get_db():
        try:
            yield mock_db
        finally:
            pass

    test_app.dependency_overrides[get_db] = override_get_db
    return TestClient(test_app)


# --- GET /find TESTS ---

def test_get_event_by_id_success(client, mock_db):
    instance = SimpleNamespace(
        event_id=1,
        event_name="Competition 10",
        event_location=None,
        question_cooldown=5,
        event_start_date='2026-01-13 03:54:26.585121+00',
        event_end_date='2026-01-13 05:54:26.585121+00',
        created_at='2026-01-27 03:54:26.585121+00',
        updated_at='2026-01-27 03:54:26.585121+00',
    )
    mock_db.query.return_value.filter_by.return_value.first.return_value = instance

    response = client.get("/find?event_id=1")

    assert response.status_code == 200
    data = response.json()
    assert data["status_code"] == 200
    assert data["data"]["event_name"] == "Competition 10"
    assert data["data"]["event_location"] is None
    assert data["data"]["question_cooldown"] == 5

def test_get_event_by_id_empty(client, mock_db):
    mock_db.query.return_value.filter_by.return_value.first.return_value = None

    response = client.get("/find?event_id=999")

    assert response.status_code == 200
    data = response.json()
    assert data["status_code"] == 200
    assert data["data"] is None

def test_get_event_by_id_db_error(client, mock_db):
    mock_db.query.return_value.filter_by.side_effect = Exception("DB Connection Lost")

    response = client.get("/find?event_id=5")

    assert response.status_code == 500
    assert "Failed to retrieve event by id" in response.json()["detail"]


# --- GET /get TESTS ---

def test_get_event_by_name_success(client, mock_db):
    instance = SimpleNamespace(
        event_id=1,
        event_name="Competition 10",
        event_location=None,
        question_cooldown=5,
        event_start_date='2026-01-13 03:54:26.585121+00',
        event_end_date='2026-01-13 05:54:26.585121+00',
        created_at='2026-01-27 03:54:26.585121+00',
        updated_at='2026-01-27 03:54:26.585121+00',
    )
    mock_db.query.return_value.filter_by.return_value.first.return_value = instance

    response = client.get("/get?event_name=Competition 10")

    assert response.status_code == 200
    data = response.json()
    assert data["status_code"] == 200
    assert data["data"]["event_name"] == "Competition 10"
    assert data["data"]["event_location"] is None
    assert data["data"]["question_cooldown"] == 5

def test_get_event_by_name_empty(client, mock_db):
    mock_db.query.return_value.filter_by.return_value.first.return_value = None

    response = client.get("/get?event_name='Competition 10'")

    assert response.status_code == 200
    data = response.json()
    assert data["status_code"] == 200
    assert data["data"] is None

def test_get_event_by_name_db_error(client, mock_db):
    mock_db.query.return_value.filter_by.side_effect = Exception("DB Connection Lost")

    response = client.get("/get?event_name=Comp")

    assert response.status_code == 500
    assert "Failed to retrieve event by name" in response.json()["detail"]


# --- POST /update TESTS ---

def test_create_new_event(client, mock_db):
    payload = {
        'event_id': 10,
        'event_name': "Competition 10",
        'event_location': None,
        'question_cooldown': 5,
        'event_start_date': '2026-01-13 03:54:26.585121+00',
        'event_end_date': '2026-01-13 05:54:26.585121+00',
        'created_at': '2026-01-27 03:54:26.585121+00',
        'updated_at': '2026-01-27 03:54:26.585121+00',
    }
    mock_db.query.return_value.filter_by.return_value.first.return_value = None
    mock_db.refresh.side_effect = None

    response = client.post("/update", json=payload)

    assert response.status_code == 201
    mock_db.add.assert_called_once()
    mock_db.commit.assert_called_once()

def test_update_existing_event(client, mock_db):
    payload = {
        'event_id': 1,
        'event_name': "Competition 10",
        'event_location': None,
        'question_cooldown': 5,
        'event_start_date': '2026-01-13 03:54:26.585121+00',
        'event_end_date': '2026-01-13 05:54:26.585121+00',
        'created_at': '2026-01-27 03:54:26.585121+00',
        'updated_at': '2026-01-27 03:54:26.585121+00',
    }
    existing = SimpleNamespace(
        event_id=1,
        event_name="Competition 10",
        event_location=None,
        question_cooldown=15,
        event_start_date='2026-01-13 03:54:26.585121+00',
        event_end_date='2026-01-15 05:54:26.585121+00',
        created_at='2026-01-27 03:54:26.585121+00',
        updated_at='2026-01-27 03:54:26.585121+00',
    )
    mock_db.query.return_value.filter_by.return_value.first.return_value = existing
    mock_db.refresh.side_effect = lambda instance: None

    response = client.post("/update", json=payload)

    assert response.status_code == 201
    mock_db.add.assert_not_called()
    mock_db.commit.assert_called_once()

def test_create_event_db_error(client, mock_db):
    payload = {
        'event_id': 1,
        'event_name': "Competition 10",
        'event_location': None,
        'question_cooldown': 5,
        'event_start_date': '2026-01-13 03:54:26.585121+00',
        'event_end_date': '2026-01-13 05:54:26.585121+00',
        'created_at': '2026-01-27 03:54:26.585121+00',
        'updated_at': '2026-01-27 03:54:26.585121+00',
    }
    mock_db.commit.side_effect = Exception("Commit Failed")

    response = client.post("/update", json=payload)

    assert response.status_code == 500
    assert "Failed to upload event" in response.json()["detail"]
    mock_db.rollback.assert_called_once()

def test_create_event_missing_fields(client):
    response = client.post("/update", json={"bad_field": "value"})
    assert response.status_code in (422, 500)