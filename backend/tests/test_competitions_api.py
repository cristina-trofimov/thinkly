import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch
from types import SimpleNamespace

from main import app
from endpoints import competitions_api
from endpoints.competitions_api import competitions_router

client = TestClient(app)

@pytest.fixture
def mock_db():
    db = Mock()
    return db

def override_get_db(mock_db):
    def _override():
        yield mock_db
    return _override

class TestCompetitionsAPI:
    
    def test_get_all_competitions(self, mock_db):
        sample_competitions = [
            SimpleNamespace(id=1, name="Hello World", date="2024-05-01"),
            SimpleNamespace(id=2, name="Code Blooded", date="2024-06-15"),
        ]
        mock_db.query.return_value.join.return_value.all.return_value = sample_competitions

        app.dependency_overrides[competitions_api.get_db] = override_get_db(mock_db)

        response = client.get("/competitions/")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["name"] == "Hello World"
        assert data[1]["date"] == "2024-06-15"
