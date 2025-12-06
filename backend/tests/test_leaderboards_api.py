import pytest
from datetime import datetime
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient
from types import SimpleNamespace

from endpoints.leaderboards_api import  get_db
from main import app

client = TestClient(app)


@pytest.fixture
def mock_db():
    """Fixture to create a mock database session"""
    db = Mock()
    return db


@pytest.fixture
def mock_user():
    """Fixture for mock user data"""
    user = Mock()
    user.first_name = "John"
    user.last_name = "Doe"
    return user


@pytest.fixture
def mock_competition():
    """Fixture for mock competition data"""
    comp = Mock()
    comp.competition_id = 1
    comp.name = "Spring Code Challenge 2024"
    comp.date = datetime(2024, 3, 15)
    return comp


@pytest.fixture
def mock_scoreboard(mock_user):
    """Fixture for mock scoreboard data"""
    scoreboard = Mock()
    scoreboard.user = mock_user
    scoreboard.user_id = 1
    scoreboard.competition_id = 1
    scoreboard.total_score = 95
    scoreboard.rank = 1
    return scoreboard


@pytest.fixture
def mock_user_result():
    return SimpleNamespace(
        problems_solved=8,
        total_time=45.5
    )


class TestGetLeaderboards:
    """Test suite for the /leaderboards endpoint"""

    def test_get_leaderboards_empty(self, mock_db):
        """Test leaderboards endpoint with no competitions"""
        def override_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = override_get_db

        with patch('endpoints.leaderboards_api.get_all_competitions', return_value=[]):
            response = client.get("/leaderboards")
            assert response.status_code == 200
            assert response.json() == []

        app.dependency_overrides.clear()

    def test_get_leaderboards_single_competition_no_participants(self, mock_db, mock_competition):
        """Test leaderboards with one competition but no participants"""
        def override_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = override_get_db

        with patch('endpoints.leaderboards_api.get_all_competitions', return_value=[mock_competition]):
            with patch('endpoints.leaderboards_api.get_scoreboard_for_competition', return_value=[]):
                response = client.get("/leaderboards")
                assert response.status_code == 200
                data = response.json()
                assert len(data) == 1
                assert data[0]["id"] == "1"
                assert data[0]["name"] == "Spring Code Challenge 2024"
                assert data[0]["date"] == "2024-03-15"
                assert data[0]["participants"] == []

        app.dependency_overrides.clear()

    def test_get_leaderboards_with_participants(
            self, mock_db, mock_competition, mock_scoreboard, mock_user_result):
        """Test leaderboards with competition and participants"""
        def override_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = override_get_db

        # Patch the db.query(...).filter(...).first() call to return mock_user_result
        mock_db.query.return_value.filter.return_value.first.return_value = mock_user_result

        with patch('endpoints.leaderboards_api.get_all_competitions', return_value=[mock_competition]):
            with patch('endpoints.leaderboards_api.get_scoreboard_for_competition',
                       return_value=[mock_scoreboard]):
                response = client.get("/leaderboards")
                assert response.status_code == 200
                data = response.json()
                assert len(data) == 1

                participant = data[0]["participants"][0]
                assert participant["name"] == "John Doe"
                assert participant["points"] == 95
                assert participant["problemsSolved"] == 8
                assert participant["totalTime"] == "45.5 min"

        app.dependency_overrides.clear()

    def test_get_leaderboards_participant_no_user_result(
            self, mock_db, mock_competition, mock_scoreboard):
        """Test participant without user result data"""
        def override_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = override_get_db

        # Patch to return None for user result
        mock_db.query.return_value.filter.return_value.first.return_value = None

        with patch('endpoints.leaderboards_api.get_all_competitions', return_value=[mock_competition]):
            with patch('endpoints.leaderboards_api.get_scoreboard_for_competition',
                       return_value=[mock_scoreboard]):
                response = client.get("/leaderboards")
                participant = response.json()[0]["participants"][0]
                assert participant["problemsSolved"] == 0
                assert participant["totalTime"] == "0.0 min"

        app.dependency_overrides.clear()
