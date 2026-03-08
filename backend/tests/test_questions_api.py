import pytest
from unittest.mock import MagicMock
from fastapi import FastAPI
from fastapi.testclient import TestClient
from datetime import datetime
from types import SimpleNamespace
import sys
import os

from src.endpoints.questions_api import Tag

# 1. Boilerplate to make Python see the 'backend' folder
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

# --- IMPORTS ---
# 1. Import the dependency you need to override (Must match source exactly!)
from database_operations.database import get_db

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
    # We use SimpleNamespace so we can access attributes like q.question_name via dot notation
    fake_questions = [
        SimpleNamespace(
            question_id=1, 
            question_name="Two Sum",
            question_description="Given an array of integers, return indices of two numbers that add to target.",
            media=None,
            difficulty="Easy",
            preset_code="def two_sum(nums, target):\n    pass",
            from_string_function="def from_string(s):\n    return s",
            to_string_function="def to_string(result):\n    return str(result)",
            template_solution="def two_sum(nums, target):\n    return []",
            created_at=datetime(2025, 1, 10, 12, 0, 0),
            last_modified_at=datetime(2025, 1, 10, 12, 0, 0),
            tags=[SimpleNamespace(tag_name="array"), SimpleNamespace(tag_name="hashmap")],
            test_cases=[
                SimpleNamespace(input_data="[2,7,11,15],9", expected_output="[0,1]"),
                SimpleNamespace(input_data="[3,2,4],6", expected_output="[1,2]")
            ]
        ),
        SimpleNamespace(
            question_id=2, 
            question_name="Reverse Linked List",
            question_description="Reverse a singly linked list.",
            media=None,
            difficulty="Medium",
            preset_code="def reverse_list(head):\n    pass",
            from_string_function="def from_string(s):\n    return s",
            to_string_function="def to_string(result):\n    return str(result)",
            template_solution="def reverse_list(head):\n    return head",
            created_at=datetime(2025, 2, 15, 14, 30, 0),
            last_modified_at=datetime(2025, 2, 15, 14, 30, 0),
            tags=[SimpleNamespace(tag_name="linked-list")],
            test_cases=[
                SimpleNamespace(input_data="[1,2,3,4,5]", expected_output="[5,4,3,2,1]")
            ]
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
    assert data[0]["question_name"] == "Two Sum"
    assert data[0]["difficulty"] == "Easy"
    assert data[0]["question_description"].startswith("Given an array")
    assert data[0]["tags"] == ["array", "hashmap"]
    assert data[0]["testcases"] == [["[2,7,11,15],9", "[0,1]"], ["[3,2,4],6", "[1,2]"]]
    # Verify date handling (FastAPI usually serializes datetime to ISO string)
    assert "2025-01-10" in data[0]["created_at"]
    assert "2025-01-10" in data[0]["last_modified_at"]
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


def test_get_question_by_id_success(client, mock_db):
    fake_question = SimpleNamespace(
        question_id=42,
        question_name="Find Pair",
        question_description="Return two indices.",
        media=None,
        difficulty="easy",
        preset_code="",
        from_string_function="def from_string(s): return s",
        to_string_function="def to_string(x): return str(x)",
        template_solution="def solve(): pass",
        created_at=datetime(2025, 1, 1, 0, 0, 0),
        last_modified_at=datetime(2025, 1, 2, 0, 0, 0),
        tags=[SimpleNamespace(tag_name="array")],
        test_cases=[SimpleNamespace(input_data="1 2", expected_output="3")],
    )
    mock_db.query.return_value.filter.return_value.first.return_value = fake_question

    response = client.get("/get-question-by-id/42")

    assert response.status_code == 200
    payload = response.json()
    assert payload["question_id"] == 42
    assert payload["tags"] == ["array"]
    assert payload["testcases"] == [["1 2", "3"]]


def test_get_question_by_id_not_found(client, mock_db):
    mock_db.query.return_value.filter.return_value.first.return_value = None

    response = client.get("/get-question-by-id/404")

    assert response.status_code == 404
    assert response.json()["detail"] == "Question with id 404 not found"


def test_batch_delete_questions_partial_success(client, mock_db):
    id_query = MagicMock()
    id_query.filter.return_value.all.return_value = [
        SimpleNamespace(question_id=1),
        SimpleNamespace(question_id=3),
    ]

    delete_query = MagicMock()
    delete_query.filter.return_value.delete.return_value = 2

    mock_db.query.side_effect = [id_query, delete_query]

    response = client.request("DELETE", "/batch-delete", json={"question_ids": [1, 2, 3, 3]})

    assert response.status_code == 200
    payload = response.json()
    assert payload["deleted_count"] == 2
    assert payload["deleted_questions"] == [{"question_id": 1}, {"question_id": 3}]
    assert payload["total_requested"] == 3
    assert payload["errors"] == [{"question_id": 2, "error": "Question not found."}]
    mock_db.commit.assert_called_once()


def test_batch_delete_questions_error_rolls_back(client, mock_db):
    failing_query = MagicMock()
    failing_query.filter.side_effect = Exception("DB exploded")
    mock_db.query.return_value = failing_query

    response = client.request("DELETE", "/batch-delete", json={"question_ids": [1]})

    assert response.status_code == 500
    assert response.json()["detail"] == "Error deleting questions."
    mock_db.rollback.assert_called_once()


def test_update_question_not_found_returns_500_with_message(client, mock_db):
    mock_db.query.return_value.filter.return_value.first.return_value = None

    payload = {
        "question_name": "Updated",
        "question_description": "Updated description",
        "difficulty": "easy",
        "preset_code": "",
        "from_string_function": "",
        "to_string_function": "",
        "template_solution": "def solve(): pass",
        "tags": [],
        "testcases": [],
    }

    response = client.put("/update-question/999", json=payload)

    assert response.status_code == 500
    assert "Update failed" in response.json()["detail"]
    mock_db.rollback.assert_called_once()