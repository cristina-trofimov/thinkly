import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, MagicMock, patch
from datetime import datetime
from types import SimpleNamespace
from main import app
from endpoints import questions_api

client = TestClient(app)


# ---------------- Fixtures ----------------
@pytest.fixture
def mock_db():
    db = Mock()
    # Mock the bind and inspector for table check
    mock_bind = Mock()
    mock_inspector = Mock()
    mock_inspector.get_table_names.return_value = ["base_question", "competition", "user"]

    db.bind = mock_bind

    return db


# ---------------- Helper ----------------
def override_get_db(mock_db):
    def _override():
        yield mock_db

    return _override


# ---------------- Tests ----------------
class TestQuestionsEndpoints:

    def test_get_all_questions_success(self, mock_db):
        """Test successful retrieval of all questions"""
        # Create fake questions with all fields
        fake_questions = [
            SimpleNamespace(
                question_id=1,
                title="Two Sum",
                description="Find two numbers that add up to target",
                difficulty="Easy",
                solution="Use hash map for O(n) solution",
                media="https://example.com/image1.png",
                created_at=datetime(2025, 11, 1, 10, 30, 0)
            ),
            SimpleNamespace(
                question_id=2,
                title="Reverse Linked List",
                description="Reverse a singly linked list",
                difficulty="Medium",
                solution="Use three pointers: prev, current, next",
                media=None,
                created_at=datetime(2025, 11, 2, 14, 15, 0)
            )
        ]

        # Mock the query
        mock_db.query.return_value.all.return_value = fake_questions

        # Mock the inspector - patch where it's used, not where it's defined
        with patch('endpoints.questions_api.inspect') as mock_inspect:
            mock_inspector = Mock()
            mock_inspector.get_table_names.return_value = ["base_question"]
            mock_inspect.return_value = mock_inspector

            app.dependency_overrides[questions_api.get_db] = override_get_db(mock_db)

            response = client.get("/questions/")

            assert response.status_code == 200
            result = response.json()

            assert len(result) == 2
            assert result[0] == {
                "id": "1",
                "title": "Two Sum",
                "description": "Find two numbers that add up to target",
                "difficulty": "Easy",
                "solution": "Use hash map for O(n) solution",
                "media": "https://example.com/image1.png",
                "createdAt": "2025-11-01"
            }
            assert result[1] == {
                "id": "2",
                "title": "Reverse Linked List",
                "description": "Reverse a singly linked list",
                "difficulty": "Medium",
                "solution": "Use three pointers: prev, current, next",
                "media": None,
                "createdAt": "2025-11-02"
            }

            app.dependency_overrides.clear()

    def test_get_all_questions_empty(self, mock_db):
        """Test when no questions exist in database"""
        # Return empty list
        mock_db.query.return_value.all.return_value = []

        with patch('endpoints.questions_api.inspect') as mock_inspect:
            mock_inspector = Mock()
            mock_inspector.get_table_names.return_value = ["base_question"]
            mock_inspect.return_value = mock_inspector

            app.dependency_overrides[questions_api.get_db] = override_get_db(mock_db)

            response = client.get("/questions/")

            assert response.status_code == 200
            assert response.json() == []

            app.dependency_overrides.clear()

    def test_get_all_questions_without_created_at(self, mock_db):
        """Test questions without created_at field"""
        fake_questions = [
            SimpleNamespace(
                question_id=1,
                title="Test Question",
                description="Test description",
                difficulty="Easy",
                solution="Test solution",
                media=None,
                # No created_at field
            )
        ]

        mock_db.query.return_value.all.return_value = fake_questions

        with patch('endpoints.questions_api.inspect') as mock_inspect:
            mock_inspector = Mock()
            mock_inspector.get_table_names.return_value = ["base_question"]
            mock_inspect.return_value = mock_inspector

            app.dependency_overrides[questions_api.get_db] = override_get_db(mock_db)

            response = client.get("/questions/")

            assert response.status_code == 200
            result = response.json()
            assert result[0]["createdAt"] is None

            app.dependency_overrides.clear()

    def test_get_all_questions_table_not_found(self, mock_db):
        """Test error when base_question table doesn't exist"""
        with patch('endpoints.questions_api.inspect') as mock_inspect:
            mock_inspector = Mock()
            # Return table names that don't include base_question or basequestion
            mock_inspector.get_table_names.return_value = ["users", "competition"]
            mock_inspect.return_value = mock_inspector

            app.dependency_overrides[questions_api.get_db] = override_get_db(mock_db)

            response = client.get("/questions/")

            assert response.status_code == 500
            assert "Table for BaseQuestion not found" in response.json()["detail"]

            app.dependency_overrides.clear()

    def test_get_all_questions_database_error(self, mock_db):
        """Test handling of database errors"""
        # Make the query raise an exception
        mock_db.query.side_effect = Exception("Database connection failed")

        with patch('endpoints.questions_api.inspect') as mock_inspect:
            mock_inspector = Mock()
            mock_inspector.get_table_names.return_value = ["base_question"]
            mock_inspect.return_value = mock_inspector

            app.dependency_overrides[questions_api.get_db] = override_get_db(mock_db)

            response = client.get("/questions/")

            assert response.status_code == 500
            assert "error" in response.json()["detail"].lower()

            app.dependency_overrides.clear()

    def test_get_all_questions_with_alternative_id_field(self, mock_db):
        """Test questions using 'id' instead of 'question_id'"""
        fake_questions = [
            SimpleNamespace(
                id=99,  # Using 'id' instead of 'question_id'
                title="Alternative ID Question",
                description="Test with id field",
                difficulty="Hard",
                solution="Test solution",
                media=None,
                created_at=datetime(2025, 11, 3)
            )
        ]

        mock_db.query.return_value.all.return_value = fake_questions

        with patch('endpoints.questions_api.inspect') as mock_inspect:
            mock_inspector = Mock()
            mock_inspector.get_table_names.return_value = ["base_question"]
            mock_inspect.return_value = mock_inspector

            app.dependency_overrides[questions_api.get_db] = override_get_db(mock_db)

            response = client.get("/questions/")

            assert response.status_code == 200
            result = response.json()
            assert result[0]["id"] == "99"

            app.dependency_overrides.clear()