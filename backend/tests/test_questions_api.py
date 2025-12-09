import pytest
from unittest.mock import MagicMock
from fastapi import FastAPI
from fastapi.testclient import TestClient
from datetime import datetime
from types import SimpleNamespace
import sys
import os


# 1. Boilerplate to make Python see the 'backend' folder
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

# --- IMPORTS ---
# 1. Import the dependency you need to override (Must match source exactly!)
from DB_Methods.database import get_db

# 2. Import the router you want to test
# (Replace 'src.endpoints.questions_api' with the actual path to your file)
from src.endpoints.questions_api import questions_router 

# --- FIXTURES ---

@pytest.fixture
def mock_db():
    """Creates a mock database session."""
    return MagicMock()

@pytest.fixture
def client(mock_db):
    """
    Creates a test client with the dependency override active.
    We create a fresh FastAPI app here to test the router in isolation.
    """
    test_app = FastAPI()
    test_app.include_router(questions_router)

    # DEFINE THE OVERRIDE
    def override_get_db():
        try:
            yield mock_db
        finally:
            pass

    # APPLY THE OVERRIDE
    test_app.dependency_overrides[get_db] = override_get_db
    
    return TestClient(test_app)

# --- TESTS ---

def test_get_all_questions_success(client, mock_db):
    """Test the happy path where questions are returned correctly."""
    
    # 1. Arrange: Create fake question objects
    # We use SimpleNamespace so we can access attributes like q.title via dot notation
    fake_questions = [
        SimpleNamespace(
            question_id=1, 
            title="Two Sum", 
            difficulty="Easy",
            created_at=datetime(2025, 1, 10, 12, 0, 0)
        ),
        SimpleNamespace(
            question_id=2, 
            title="Reverse Linked List", 
            difficulty="Medium",
            created_at=datetime(2025, 2, 15, 14, 30, 0)
        )
    ]

    # Mock the chain: db.query(BaseQuestion).all()
    mock_db.query.return_value.all.return_value = fake_questions

    # 2. Act
    response = client.get("/get-all-questions")

    # 3. Assert
    assert response.status_code == 200
    data = response.json()
    
    # Verify the count
    assert len(data) == 2
    
    # Verify the content of the first item
    assert data[0]["id"] == 1
    assert data[0]["questionTitle"] == "Two Sum"
    assert data[0]["difficulty"] == "Easy"
    # Verify date handling (FastAPI usually serializes datetime to ISO string)
    assert "2025-01-10" in data[0]["date"]

def test_get_all_questions_empty(client, mock_db):
    """Test when the database has no questions."""
    
    # Arrange: db returns an empty list
    mock_db.query.return_value.all.return_value = []

    # Act
    response = client.get("/get-all-questions")

    # Assert
    assert response.status_code == 200
    assert response.json() == []

def test_get_all_questions_db_error(client, mock_db):
    """Test how the endpoint handles a database exception."""
    
    # Arrange: Trigger an exception when .all() is called
    mock_db.query.return_value.all.side_effect = Exception("Database Timeout")

    # Act
    response = client.get("/get-all-questions")

    # Assert
    assert response.status_code == 500
    # Check that our custom error message structure is present
    assert "Failed to retrieve questions" in response.json()["detail"]
    assert "Exception" in response.json()["detail"]