import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch
from types import SimpleNamespace

from main import app
from endpoints import questions_api
from endpoints.questions_api import questions_router

client = TestClient(app)

@pytest.fixture
def mock_db():
    db = Mock()
    return db

def override_get_db(mock_db):
    def _override():
        yield mock_db
    return _override

class TestQuestionsAPI:
    
    def test_get_all_questions(self, mock_db):
        sample_questions = [
            SimpleNamespace(id=1, questionTitle="What is 2+2?", created_at="2024-01-01", difficulty="Easy"),
            SimpleNamespace(id=2, questionTitle="What is the capital of France?", created_at="2024-01-02", difficulty="Medium"),
        ]
        mock_db.query.return_value.all.return_value = sample_questions

        app.dependency_overrides[questions_api.get_db] = override_get_db(mock_db)

        response = client.get("/questions/")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["questionTitle"] == "What is 2+2?"
        assert data[1]["difficulty"] == "Medium"