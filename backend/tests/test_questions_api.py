import pytest
from unittest.mock import MagicMock
from fastapi import FastAPI
from fastapi.testclient import TestClient
from datetime import datetime, timezone, timedelta
from email.utils import format_datetime
from types import SimpleNamespace
import sys
import os
from sqlalchemy.exc import IntegrityError, DataError

# 1. Boilerplate to make Python see the 'backend' folder
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

# --- IMPORTS ---
# 1. Import the dependency you need to override (Must match source exactly!)
from database_operations.database import get_db

# 2. Import the router you want to test
# (Replace 'src.endpoints.questions_api' with the actual path to your file)
from src.endpoints.questions_api import (
    Tag,
    questions_router,
    CreateTestCaseRequest,
    QuestionLanguageSpecificPropertiesResponse,
)

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


def build_query_mock(mock_db):
    query = MagicMock()
    mock_db.query.return_value = query
    query.filter.return_value = query
    query.filter_by.return_value = query
    query.with_entities.return_value = query
    query.order_by.return_value = query
    query.offset.return_value = query
    query.limit.return_value = query
    query.first.return_value = (0, datetime(2025, 1, 1, 0, 0, 0), 0, 0)
    return query

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
            tags=[SimpleNamespace(tag_id=1, tag_name="array"), SimpleNamespace(tag_id=2, tag_name="hashmap")],
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
            tags=[SimpleNamespace(tag_id=0, tag_name="linked-list")],
            test_cases=[
                SimpleNamespace(input_data="[1,2,3,4,5]", expected_output="[5,4,3,2,1]")
            ]
        )
    ]

    query = build_query_mock(mock_db)
    query.count.return_value = 2
    query.all.return_value = fake_questions

    # 2. Act
    response = client.get("/get-all-questions")

    # 3. Assert
    assert response.status_code == 200
    data = response.json()
    
    assert data["total"] == 2
    assert data["page"] == 1
    assert data["page_size"] == 25
    assert len(data["items"]) == 2
    
    # Verify the content of the first item
    assert data["items"][0]["question_id"] == 1
    assert data["items"][0]["question_name"] == "Two Sum"
    assert data["items"][0]["difficulty"] == "Easy"
    assert data["items"][0]["question_description"].startswith("Given an array")
    # Verify date handling (FastAPI usually serializes datetime to ISO string)
    assert "2025-01-10" in data["items"][0]["created_at"]
    assert response.headers["cache-control"] == "no-cache, must-revalidate"
    assert "last-modified" in response.headers
    assert "etag" in response.headers


def test_get_all_questions_returns_304_when_unmodified(client, mock_db):
    query = build_query_mock(mock_db)
    latest = datetime(2025, 2, 1, 10, 0, 0, tzinfo=timezone.utc)
    query.first.return_value = (0, latest, 0, 0)

    response = client.get(
        "/get-all-questions",
        headers={"If-Modified-Since": format_datetime(latest + timedelta(seconds=1), usegmt=True)},
    )

    assert response.status_code == 304
    assert response.headers["cache-control"] == "no-cache, must-revalidate"
    assert response.headers["last-modified"] == format_datetime(latest, usegmt=True)


def test_get_all_questions_returns_304_when_etag_matches(client, mock_db):
    query = build_query_mock(mock_db)
    latest = datetime(2025, 2, 1, 10, 0, 0, tzinfo=timezone.utc)
    query.first.return_value = (2, latest, 7, 10)
    query.count.return_value = 2
    query.all.return_value = []

    first_response = client.get("/get-all-questions")
    etag = first_response.headers["etag"]

    response = client.get(
        "/get-all-questions",
        headers={"If-None-Match": etag},
    )

    assert response.status_code == 304
    assert response.headers["etag"] == etag


def test_get_all_questions_returns_200_when_one_validator_is_stale(client, mock_db):
    query = build_query_mock(mock_db)
    latest = datetime(2025, 2, 1, 10, 0, 0, tzinfo=timezone.utc)
    query.first.return_value = (1, latest, 1, 1)
    query.count.return_value = 1
    query.all.return_value = [
        SimpleNamespace(
            question_id=1,
            question_name="Two Sum",
            question_description="desc",
            media=None,
            difficulty="easy",
            created_at=datetime(2025, 1, 1, 0, 0, 0),
            last_modified_at=latest,
            tags=[],
            test_cases=[],
            language_specific_properties=[],
            question_instances=[],
        )
    ]

    first_response = client.get("/get-all-questions")
    etag = first_response.headers["etag"]

    response = client.get(
        "/get-all-questions",
        headers={
            "If-None-Match": etag,
            "If-Modified-Since": format_datetime(latest - timedelta(seconds=10), usegmt=True),
        },
    )

    assert response.status_code == 200
    assert response.json()["total"] == 1
def test_get_all_questions_empty(client, mock_db):
    """Test when the database has no questions."""

    query = build_query_mock(mock_db)
    query.count.return_value = 0
    query.all.return_value = []

    # Act
    response = client.get("/get-all-questions")

    # Assert
    assert response.status_code == 200
    assert response.json() == {"total": 0, "page": 1, "page_size": 25, "items": []}


def test_get_all_questions_applies_filters_and_pagination(client, mock_db):
    query = build_query_mock(mock_db)
    query.count.return_value = 1
    query.all.return_value = []

    response = client.get(
        "/get-all-questions",
        params={"page": 2, "page_size": 10, "search": "array", "difficulty": "easy"},
    )

    assert response.status_code == 200
    query.filter.assert_called()
    query.offset.assert_called_once_with(10)
    query.limit.assert_called_once_with(10)


def test_get_all_questions_accepts_sort_param(client, mock_db):
    query = build_query_mock(mock_db)
    query.count.return_value = 0
    query.all.return_value = []

    response = client.get("/get-all-questions", params={"sort": "desc"})

    assert response.status_code == 200
    query.order_by.assert_called_once()


def test_get_all_questions_rejects_invalid_page_size(client):
    response = client.get("/get-all-questions", params={"page_size": 101})
    assert response.status_code == 422

def test_get_all_questions_db_error(client, mock_db):
    """Test how the endpoint handles a database exception."""

    query = build_query_mock(mock_db)
    query.count.side_effect = Exception("Database Timeout")

    # Act
    response = client.get("/get-all-questions")

    # Assert
    assert response.status_code == 500
    # Check that our custom error message structure is present
    assert "Failed to retrieve questions" in response.json()["detail"]

def test_get_question_success(client, mock_db):
    """Test the path where the question is returned correctly."""
    
    fake_question = {
            'question_id': 1,
            'question_name': "Two Sum", 
            'question_description': 'question.question_description',
            'difficulty': "Easy",
            'created_at': datetime(2025, 1, 10, 12, 0, 0),
    }

    mock_db.query.return_value.filter_by.return_value.first.return_value = fake_question

    response = client.get("/question?question_id=1")

    assert response.status_code == 200
    data = response.json()
    assert data['data']["question_id"] == 1
    assert data['data']["question_name"] == "Two Sum"
    assert data['data']["difficulty"] == "Easy"
    assert "2025-01-10" in data['data']["created_at"]

def test_get_question_empty(client, mock_db):
    """Test when the database doesn't have the question."""

    mock_db.query.return_value.filter_by.return_value.first.return_value = None

    response = client.get("/question?question_id=10")

    assert response.status_code == 200
    data = response.json()
    assert data['data'] == None

def test_get_question_db_error(client, mock_db):
    """Test how the endpoint handles a database exception."""
    
    mock_db.query.return_value.filter_by.side_effect = Exception("Database Timeout")

    response = client.get("/question?question_id=10")

    assert response.status_code == 500
    assert "Failed to retrieve question" in response.json()["detail"]
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
    assert payload["tags"] == [{"tag_id": 0, "tag_name": "array"}]
    assert payload["test_cases"] == [
        {
            "test_case_id": 0,
            "question_id": 0,
            "input_data": "1 2",
            "expected_output": "3",
        }
    ]


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


def test_show_question_on_frontpage_by_id_creates_instance(client, mock_db):
    question_lookup_query = MagicMock()
    question_lookup_query.filter.return_value.first.return_value = SimpleNamespace(question_id=5)

    existing_query = MagicMock()
    existing_query.filter.return_value.first.return_value = None

    mock_db.query.side_effect = [question_lookup_query, existing_query]

    response = client.put(
        "/show-question-on-frontpage-by-id/5",
        json={"should_show": True},
    )

    assert response.status_code == 200
    assert response.json() == {"question_id": 5, "show_on_frontpage": True}
    mock_db.add.assert_called_once()
    mock_db.commit.assert_called_once()


def test_show_question_on_frontpage_by_id_deletes_instance(client, mock_db):
    question_lookup_query = MagicMock()
    question_lookup_query.filter.return_value.first.return_value = SimpleNamespace(question_id=7)

    delete_query = MagicMock()
    delete_query.filter.return_value.delete.return_value = 1

    mock_db.query.side_effect = [question_lookup_query, delete_query]

    response = client.put(
        "/show-question-on-frontpage-by-id/7",
        json={"should_show": False},
    )

    assert response.status_code == 200
    assert response.json() == {"question_id": 7, "show_on_frontpage": False}
    mock_db.commit.assert_called_once()


def test_show_question_on_frontpage_by_id_returns_404_for_missing_question(client, mock_db):
    question_lookup_query = MagicMock()
    question_lookup_query.filter.return_value.first.return_value = None
    mock_db.query.return_value = question_lookup_query

    response = client.put(
        "/show-question-on-frontpage-by-id/999",
        json={"should_show": True},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Question with id 999 not found"


def test_update_question_not_found_returns_404_with_message(client, mock_db):
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

    assert response.status_code == 404
    assert "Update failed" in response.json()["detail"]


def test_upload_question_batch_db_error(client, mock_db):
    """Test that a DB error during batch upload returns 500 with generic message."""
    batch_payload = [
        {
            "question_name": "Batch Q",
            "question_description": "desc",
            "difficulty": "easy",
            "preset_code": "",
            "from_string_function": "",
            "to_string_function": "",
            "template_solution": "def s(): pass",
            "tags": [],
            "testcases": [],
        }
    ]

    mock_db.commit.side_effect = Exception("DB commit failed")

    response = client.post("/upload-question-batch", json=batch_payload)
    assert response.status_code == 500
    assert response.json()["detail"].startswith("Failed to upload question batch")




def test_get_question_by_id_unexpected_error_returns_500(client, mock_db):
    mock_db.query.side_effect = Exception("boom")

    response = client.get("/get-question-by-id/12")

    assert response.status_code == 500
    assert response.json()["detail"] == "Failed to retrieve question with id 12"


def test_get_all_questions_invalid_if_modified_since_uses_fallback(client, mock_db):
    query = build_query_mock(mock_db)
    query.first.return_value = (0, datetime(2025, 2, 1, 10, 0, 0), 0, 0)
    query.count.return_value = 0
    query.all.return_value = []

    response = client.get(
        "/get-all-questions",
        headers={"If-Modified-Since": "not-a-date"},
    )

    assert response.status_code == 200
    assert response.json()["items"] == []
    assert "last-modified" in response.headers


def test_upload_question_batch_integrity_error_returns_409(client, mock_db):
    batch_payload = [
        {
            "question_name": "Batch Q",
            "question_description": "desc",
            "difficulty": "easy",
            "preset_code": "",
            "from_string_function": "",
            "to_string_function": "",
            "template_solution": "def s(): pass",
            "tags": [],
            "testcases": [],
        }
    ]

    diag = SimpleNamespace(message_detail="question_name already exists")
    orig = SimpleNamespace(diag=diag)
    mock_db.commit.side_effect = IntegrityError("stmt", {}, orig)

    response = client.post("/upload-question-batch", json=batch_payload)

    assert response.status_code == 409
    assert "question_name already exists" in response.json()["detail"]
    mock_db.rollback.assert_called_once()


def test_upload_question_batch_data_error_returns_400(client, mock_db):
    batch_payload = [
        {
            "question_name": "Batch Q",
            "question_description": "desc",
            "difficulty": "easy",
            "preset_code": "",
            "from_string_function": "",
            "to_string_function": "",
            "template_solution": "def s(): pass",
            "tags": [],
            "testcases": [],
        }
    ]

    mock_db.commit.side_effect = DataError("stmt", {}, Exception("bad value\nextra"))

    response = client.post("/upload-question-batch", json=batch_payload)

    assert response.status_code == 400
    assert "bad value" in response.json()["detail"]
    mock_db.rollback.assert_called_once()


def test_batch_delete_questions_when_ids_missing_returns_zero(client, mock_db):
    id_query = MagicMock()
    id_query.filter.return_value.all.return_value = []
    mock_db.query.return_value = id_query

    response = client.request("DELETE", "/batch-delete", json={"question_ids": [10, 11]})

    assert response.status_code == 200
    payload = response.json()
    assert payload["deleted_count"] == 0
    assert payload["deleted_questions"] == []
    assert payload["errors"] == [
        {"question_id": 10, "error": "Question not found."},
        {"question_id": 11, "error": "Question not found."},
    ]
    mock_db.commit.assert_called_once()


def test_update_question_success_replaces_fields_tags_and_testcases(client, mock_db):
    existing_question = SimpleNamespace(
        question_id=7,
        question_name="Old",
        question_description="Old desc",
        media=None,
        difficulty="easy",
        preset_code="",
        from_string_function="",
        to_string_function="",
        template_solution="old",
        tags=[],
        test_cases=[SimpleNamespace(test_case_id=1, input_data="in", expected_output="out")],
    )

    question_query = MagicMock()
    question_query.filter.return_value.first.return_value = existing_question

    tag_query = MagicMock()
    tag_query.filter.return_value.all.return_value = []

    mock_db.query.side_effect = [question_query, tag_query]

    payload = {
        "question_name": "Updated",
        "question_description": "Updated description",
        "media": None,
        "difficulty": "medium",
        "preset_code": "",
        "from_string_function": "",
        "to_string_function": "",
        "template_solution": "def solve(): return 1",
        "tags": ["arrays"],
        "testcases": [["1 2", "3"]],
    }

    response = client.put("/update-question/7", json=payload)

    assert response.status_code == 200
    assert existing_question.question_name == "Updated"
    assert existing_question.difficulty == "medium"
    assert len(existing_question.test_cases) == 1
    assert existing_question.test_cases[0].question_id == 7
    mock_db.delete.assert_called_once()
    mock_db.commit.assert_called_once()
    mock_db.refresh.assert_called_once_with(existing_question)


def test_get_all_questions_uses_now_when_last_modified_missing(client, mock_db):
    query = build_query_mock(mock_db)
    query.first.return_value = (0, None, 0, 0)
    query.count.return_value = 0
    query.all.return_value = []

    response = client.get("/get-all-questions")

    assert response.status_code == 200
    assert response.json()["items"] == []
    assert "last-modified" in response.headers


def test_create_testcase_request_accepts_object_payload():
    payload = {"input_data": {"a": 1}, "expected_output": [1, 2, 3]}

    model = CreateTestCaseRequest.model_validate(payload)

    assert model.input_data == {"a": 1}
    assert model.expected_output == [1, 2, 3]


def test_question_language_specific_properties_response_handles_missing_language():
    qlsp = SimpleNamespace(
        question_id=1,
        language_id=2,
        language=None,
        from_json_function="from_json",
        to_json_function="to_json",
        preset_code="pass",
        template_solution="return 1",
    )

    response = QuestionLanguageSpecificPropertiesResponse.from_question_language_specific_properties(qlsp)

    assert response.question_id == 1
    assert response.language_id == 2
    assert response.language_display_name == ""
