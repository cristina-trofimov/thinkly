import pytest
from datetime import datetime
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient
from types import SimpleNamespace

import sys
import os

# 1. Boilerplate to make Python see the 'backend' folder
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

from src.endpoints.standings_api import get_db
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
def mock_competition(mock_event):
    """Fixture for mock competition data"""
    comp = Mock()
    comp.event_id = mock_event.event_id
    comp.base_event = mock_event
    return comp

@pytest.fixture
def mock_event():
    """Fixture for mock event data"""
    event = Mock()
    event.event_id = 1
    event.event_name = "Spring Code Challenge 2024"
    event.event_date = datetime(2024, 3, 15)
    return event


@pytest.fixture
def mock_scoreboard(mock_user):
    """Fixture for mock scoreboard data"""
    scoreboard = Mock()
    scoreboard.user_account = mock_user
    scoreboard.user_id = mock_user.user_id
    scoreboard.name = f"{mock_user.first_name} {mock_user.last_name}"
    scoreboard.competition_id = 1
    scoreboard.total_score = 95
    scoreboard.total_time = 45.5  # in minutes
    scoreboard.problems_solved = 8
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
        mock_db.query.return_value.join.return_value.all.return_value = []

        with patch('endpoints.standings_api.get_all_leaderboards', return_value=[]):
            response = client.get("/standings/leaderboards")
            assert response.status_code == 200
            assert response.json() == []

        app.dependency_overrides.clear()

    def test_get_leaderboards_single_competition_no_participants(self, mock_db, mock_competition):
        """Test leaderboards with one competition but no participants"""
        def override_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = override_get_db
        mock_competition.competition_leaderboard_entries = []
        mock_db.query.return_value.filter.return_value.first.return_value = mock_competition

        response = client.get(f"/standings/{mock_competition.event_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["competition_id"] == 1
        assert data["competition_name"] == "Spring Code Challenge 2024"
        assert data["participants"] == []

        app.dependency_overrides.clear()

    def test_get_leaderboards_with_participants(
            self, mock_db, mock_competition, mock_scoreboard):
        """Test leaderboards with competition and participants"""
        def override_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = override_get_db

        mock_participant_stats = SimpleNamespace(
            name="John Doe",
            total_score=95,
            total_time=45.5,
            problems_solved=8,
            user_id=mock_scoreboard.user_id,
            rank=1
        )

        mock_competition.competition_leaderboard_entries = [mock_participant_stats]
        mock_db.query.return_value.filter.return_value.first.return_value = mock_competition

        response = client.get(f"/standings/{mock_competition.event_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["competition_id"] == 1
        assert data["competition_name"] == "Spring Code Challenge 2024"
        assert data["participants"] == [mock_participant_stats]

        app.dependency_overrides.clear()

    def test_get_leaderboards_participant_no_user_result(
            self, mock_db, mock_competition, mock_scoreboard):
        """Test participant without user result data"""
        def override_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = override_get_db

        # Patch to return None for user result
        mock_db.query.return_value.filter.return_value.first.return_value = None

        with patch('endpoints.standings_api.get_all_leaderboards', return_value=[mock_competition]):
            with patch('endpoints.standings_api.get_leaderboard_by_competition',
                       return_value=[mock_scoreboard]):
                response = client.get("/standings/leaderboards")
                participant = response.json()[0]["participants"][0]
                assert participant["problemsSolved"] == 0
                assert participant["totalTime"] == "0.0 min"

        app.dependency_overrides.clear()