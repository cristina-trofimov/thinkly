import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from types import SimpleNamespace
from unittest.mock import MagicMock


from endpoints.riddles_api import riddles_router
from DB_Methods import database

@pytest.fixture
def mock_db():
    return MagicMock()

@pytest.fixture
def client(mock_db):
    test_app = FastAPI()
    test_app.include_router(riddles_router)

    def override_get_db():
        yield mock_db


    
    test_app.dependency_overrides[database.get_db] = override_get_db

    return TestClient(test_app)

def test_create_riddle_success(client, mock_db):
    payload = {
        "question": "What has keys but can't open locks?",
        "answer": "A piano",
        "file": None
    }

    # --- DB behavior ---
    mock_db.add.return_value = None
    mock_db.commit.return_value = None
    
    # Simulate DB assigning an ID upon refresh
    def refresh_side_effect(instance):
        instance.riddle_id = 1
    mock_db.refresh.side_effect = refresh_side_effect

    # Simulate that check_riddle_exists returns None 
    mock_query = MagicMock()
    mock_query.filter.return_value = mock_query
    mock_query.first.return_value = None 
    mock_db.query.return_value = mock_query

    response = client.post("/create", json=payload)

    assert response.status_code == 201
    data = response.json()
    assert data["riddle_question"] == payload["question"]
    assert data["riddle_id"] == 1


def test_create_riddle_duplicate(client, mock_db):
    payload = {
        "question": "Duplicate Question",
        "answer": "Answer",
        "file": None
    }

    # Simulate existing riddle found in DB
    existing_riddle = SimpleNamespace(riddle_id=99, riddle_question="Duplicate Question")
    
    mock_query = MagicMock()
    mock_query.filter.return_value = mock_query
    mock_query.first.return_value = existing_riddle
    mock_db.query.return_value = mock_query

    response = client.post("/create", json=payload)

    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


def test_create_riddle_validation_error(client):
    """Test that empty strings fail validation"""
    payload = {
        "question": "   ",
        "answer": "Answer"
    }

    response = client.post("/create", json=payload)

    # 422 is the standard code for Pydantic validation errors
    assert response.status_code == 422 


def test_list_riddles_success(client, mock_db):
    # Mock return list of riddles
    riddle1 = SimpleNamespace(riddle_id=1, riddle_question="Q1", riddle_answer="A1", riddle_file=None)
    riddle2 = SimpleNamespace(riddle_id=2, riddle_question="Q2", riddle_answer="A2", riddle_file="img.png")
    
    mock_query = MagicMock()
    mock_query.all.return_value = [riddle1, riddle2]
    mock_db.query.return_value = mock_query

    response = client.get("/")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[1]["riddle_file"] == "img.png"


def test_get_riddle_by_id_success(client, mock_db):
    target_riddle = SimpleNamespace(riddle_id=10, riddle_question="Found me", riddle_answer="Yes", riddle_file=None)

    mock_query = MagicMock()
    mock_query.filter.return_value = mock_query
    mock_query.first.return_value = target_riddle
    mock_db.query.return_value = mock_query

    response = client.get("/10")

    assert response.status_code == 200
    assert response.json()["riddle_question"] == "Found me"


def test_get_riddle_not_found(client, mock_db):
    mock_query = MagicMock()
    mock_query.filter.return_value = mock_query
    mock_query.first.return_value = None # Not found
    mock_db.query.return_value = mock_query

    response = client.get("/999")

    assert response.status_code == 404
    assert response.json()["detail"] == "Riddle not found"


def test_delete_riddle_success(client, mock_db):
    target_riddle = SimpleNamespace(riddle_id=5, riddle_question="Delete me")

    # First query finds the riddle to delete
    mock_query = MagicMock()
    mock_query.filter.return_value = mock_query
    mock_query.first.return_value = target_riddle
    mock_db.query.return_value = mock_query

    response = client.delete("/5")

    assert response.status_code == 204
    mock_db.delete.assert_called_once_with(target_riddle)


def test_delete_riddle_not_found(client, mock_db):
    # Query finds nothing
    mock_query = MagicMock()
    mock_query.filter.return_value = mock_query
    mock_query.first.return_value = None
    mock_db.query.return_value = mock_query

    response = client.delete("/999")

    assert response.status_code == 404