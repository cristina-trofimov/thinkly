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

from database_operations.database import get_db

from src.endpoints.testcase_api import testcase_router
from models.schema import Question, TestCase

# --- FIXTURES ---

@pytest.fixture
def mock_db():
    """Creates a mock database session."""
    return MagicMock()

@pytest.fixture
def client(mock_db):
    test_app = FastAPI()
    test_app.include_router(testcase_router)

    def override_get_db():
        try:
            yield mock_db
        finally:
            pass

    test_app.dependency_overrides[get_db] = override_get_db
    return TestClient(test_app)

# --- GET /{question_id} TESTS ---

def test_get_all_testcases_success(client, mock_db):
    """Test fetching all test cases for an existing question."""
    # 1. Setup mock data
    q_mock = SimpleNamespace(question_id=1)
    tc1 = SimpleNamespace(
        test_case_id=10, 
        question_id=1, 
        input_data={"input": "test"}, 
        expected_output={"output": "success"}
    )
    tc2 = SimpleNamespace(
        test_case_id=11, 
        question_id=1, 
        input_data={"input": "test2"}, 
        expected_output={"output": "success2"}
    )

    # 2. Create specific query mocks for Question and TestCase
    mock_question_query = MagicMock()
    mock_question_query.filter.return_value.first.return_value = q_mock

    mock_testcase_query = MagicMock()
    mock_testcase_query.filter_by.return_value.all.return_value = [tc1, tc2]

    # 3. Route the queries based on the model being requested
    def query_side_effect(model):
        if model == Question:
            return mock_question_query
        elif model == TestCase:
            return mock_testcase_query
        return MagicMock()

    mock_db.query.side_effect = query_side_effect

    # 4. Execute request
    response = client.get("/1")

    # 5. Assertions
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["test_case_id"] == 10
    assert data[1]["test_case_id"] == 11

def test_get_all_testcases_empty_list(client, mock_db):
    """Test fetching test cases for a question that exists, but has no test cases yet."""
    q_mock = SimpleNamespace(question_id=1)

    mock_question_query = MagicMock()
    mock_question_query.filter.return_value.first.return_value = q_mock

    mock_testcase_query = MagicMock()
    mock_testcase_query.filter_by.return_value.all.return_value = [] # Empty list

    def query_side_effect(model):
        if model == Question:
            return mock_question_query
        elif model == TestCase:
            return mock_testcase_query
        return MagicMock()

    mock_db.query.side_effect = query_side_effect

    response = client.get("/1")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 0

def test_get_all_testcases_question_not_found(client, mock_db):
    """Test fetching test cases for a question ID that doesn't exist."""
    mock_question_query = MagicMock()
    mock_question_query.filter.return_value.first.return_value = None # Question not found

    def query_side_effect(model):
        if model == Question:
            return mock_question_query
        return MagicMock()

    mock_db.query.side_effect = query_side_effect

    response = client.get("/99")

    assert response.status_code == 404
    assert response.json()["detail"] == "Question 99 not found"

def test_get_all_testcases_db_error(client, mock_db):
    """Test that an unexpected database error returns a 500."""
    mock_question_query = MagicMock()
    # Simulate DB connection failure during the Question query
    mock_question_query.filter.side_effect = Exception("DB Connection Lost") 

    def query_side_effect(model):
        if model == Question:
            return mock_question_query
        return MagicMock()

    mock_db.query.side_effect = query_side_effect

    response = client.get("/1")

    assert response.status_code == 500
    assert response.json()["detail"] == "Failed to retrieve test cases."