import pytest
from unittest.mock import MagicMock
from fastapi import FastAPI
from fastapi.testclient import TestClient
from datetime import datetime
from types import SimpleNamespace
import sys
import os

from backend.src.models.schema import Tag


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
    assert data[0]["question_id"] == 1
    assert data[0]["title"] == "Two Sum"
    assert data[0]["difficulty"] == "Easy"
    # Verify date handling (FastAPI usually serializes datetime to ISO string)
    assert "2025-01-10" in data[0]["created_at"]
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

def test_upload_question_success(client, mock_db):
    """Test uploading a single question successfully."""
    
    question_payload = {
        "question_name": "Sample Question",
        "question_description": "This is a sample question.",
        "difficulty": "easy",
        "preset_code": "class PresetCode:\n    pass",
        "from_string_function": "def from_string(s):\n    return s",
        "to_string_function": "def to_string(obj):\n    return str(obj)",
        "template_solution": "def solution():\n    pass",
        "tags": ["sample", "test"],
        "testcases": [
            ("input1", "output1"),
            ("input2", "output2")
        ]
    }

    response = client.post("/upload-question", json=question_payload)
    assert response.status_code == 201
    mock_db.add.assert_called_once()
    mock_db.commit.assert_called_once()

def test_upload_question_batch_success(client, mock_db):
    """Test uploading a batch of questions successfully."""
    
    batch_payload = [
        {
            "question_name": "Batch Question 1",
            "question_description": "First question in batch.",
            "difficulty": "medium",
            "preset_code": "",
            "from_string_function": "",
            "to_string_function": "",
            "template_solution": "def solution1():\n    pass",
            "tags": ["batch", "first"],
            "testcases": [
                ("inputA", "outputA")
            ]
        },
        {
            "question_name": "Batch Question 2",
            "question_description": "Second question in batch.",
            "difficulty": "hard",
            "preset_code": "",
            "from_string_function": "",
            "to_string_function": "",
            "template_solution": "def solution2():\n    pass",
            "tags": ["batch", "second"],
            "testcases": [
                ("inputB", "outputB")
            ]
        }
    ]

    response = client.post("/upload-question-batch", json=batch_payload)
    assert response.status_code == 201
    mock_db.add_all.assert_called_once()
    mock_db.commit.assert_called_once()

def test_upload_question_db_error(client, mock_db):
    """Test how the upload question endpoint handles a database exception."""
    
    question_payload = {
        "question_name": "Error Question",
        "question_description": "This will trigger a DB error.",
        "difficulty": "easy",
        "preset_code": "",
        "from_string_function": "",
        "to_string_function": "",
        "template_solution": "def solution():\n    pass",
        "tags": [],
        "testcases": []
    }

    # Arrange: Trigger an exception when commit is called
    mock_db.commit.side_effect = Exception("DB Commit Failed")

    response = client.post("/upload-question", json=question_payload)
    assert response.status_code == 500
    assert "Failed to upload question" in response.json()["detail"]

def test_upload_question_invalid_payload(client):
    """Test uploading a question with invalid payload."""
    
    invalid_payload = {
        # Missing required fields like question_name, template_solution, etc.
        "question_description": "Missing name and solution."
    }

    response = client.post("/upload-question", json=invalid_payload)
    assert response.status_code == 422

def test_upload_question_existing_name(client, mock_db):
    """Test uploading a question with a name that already exists."""
    
    question_payload = {
        "question_name": "Existing Question",
        "question_description": "This question name already exists.",
        "difficulty": "easy",
        "preset_code": "",
        "from_string_function": "",
        "to_string_function": "",
        "template_solution": "def solution():\n    pass",
        "tags": [],
        "testcases": []
    }

    # Arrange: Simulate existing question by raising an IntegrityError on commit
    from sqlalchemy.exc import IntegrityError
    mock_db.commit.side_effect = IntegrityError("Unique constraint failed", params={}, orig=None)

    response = client.post("/upload-question", json=question_payload)
    assert response.status_code == 500
    assert "Failed to upload question" in response.json()["detail"]

def test_upload_question_existing_tags(client, mock_db):
    """Test uploading a question with tags that already exist in the database."""
    
    question_payload = {
        "question_name": "Tag Test Question",
        "question_description": "Testing existing tags.",
        "difficulty": "medium",
        "preset_code": "",
        "from_string_function": "",
        "to_string_function": "",
        "template_solution": "def solution():\n    pass",
        "tags": ["existing_tag1", "existing_tag2"],
        "testcases": []
    }

    # Arrange: Mock existing tags in the database
    existing_tags = [
        Tag(tag_name="existing_tag1"),
        Tag(tag_name="existing_tag2")
    ]
    mock_db.query.return_value.filter.return_value.all.return_value = existing_tags

    response = client.post("/upload-question", json=question_payload)
    assert response.status_code == 201
    mock_db.add.assert_called_once()
    mock_db.commit.assert_called_once()