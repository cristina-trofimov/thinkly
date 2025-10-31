import pytest
from datetime import datetime
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient
from types import SimpleNamespace


# Import from src structure (pytest.ini has pythonpath = src)
from src.Components.leaderboards.leaderboards_api import app, get_db

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
def mock_scoreboard():
    """Fixture for mock scoreboard data"""
    scoreboard = Mock()
    scoreboard.user_id = 1
    scoreboard.competition_id = 1
    scoreboard.total_score = 95
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
        with patch('src.Components.leaderboards.leaderboards_api.get_all_competitions', return_value=[]):
            with patch('src.Components.leaderboards.leaderboards_api.get_db', return_value=mock_db):
                response = client.get("/leaderboards")

                assert response.status_code == 200
                assert response.json() == []

    def test_get_leaderboards_single_competition_no_participants(
            self, mock_db, mock_competition
    ):
        """Test leaderboards with one competition but no participants"""
        with patch('src.Components.leaderboards.leaderboards_api.get_all_competitions', return_value=[mock_competition]):
            with patch('src.Components.leaderboards.leaderboards_api.get_scoreboard_for_competition', return_value=[]):
                with patch('src.Components.leaderboards.leaderboards_api.get_db', return_value=mock_db):
                    response = client.get("/leaderboards")

                    assert response.status_code == 200
                    data = response.json()
                    assert len(data) == 1
                    assert data[0]["id"] == 1
                    assert data[0]["name"] == "Spring Code Challenge 2024"
                    assert data[0]["date"] == "2024-03-15"
                    assert data[0]["participants"] == []

    def test_get_leaderboards_with_participants(
            self, mock_db, mock_competition, mock_scoreboard,
            mock_user, mock_user_result
    ):
        """Test leaderboards with competition and participants"""
        mock_scoreboard.user = mock_user
        mock_scoreboard.total_score = 95
        mock_scoreboard.user_id = 1
        mock_scoreboard.competition_id = 1

        mock_db.query.return_value.get.return_value = mock_user_result

        mock_user.first_name = "John"
        mock_user.last_name = "Doe"

        def override_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = override_get_db

        with patch('src.Components.leaderboards.leaderboards_api.get_all_competitions', return_value=[mock_competition]):
            with patch('src.Components.leaderboards.leaderboards_api.get_scoreboard_for_competition', return_value=[mock_scoreboard]):
                response = client.get("/leaderboards")

                assert response.status_code == 200
                data = response.json()
                assert len(data) == 1

                competition = data[0]
                assert competition["id"] == 1
                assert competition["name"] == "Spring Code Challenge 2024"
                assert competition["date"] == "2024-03-15"
                assert len(competition["participants"]) == 1

                participant = competition["participants"][0]
                assert participant["name"] == "John Doe"
                assert participant["points"] == 95
                assert participant["problemsSolved"] == 8
                assert participant["totalTime"] == "45.5 min"

    def test_get_leaderboards_participant_no_user_result(
            self, mock_db, mock_competition, mock_scoreboard, mock_user
    ):
        """Test participant without user result data"""
        mock_scoreboard.user = mock_user
        mock_db.query.return_value.get.return_value = None

        with patch('src.Components.leaderboards.leaderboards_api.get_all_competitions', return_value=[mock_competition]):
            with patch('src.Components.leaderboards.leaderboards_api.get_scoreboard_for_competition',
                       return_value=[mock_scoreboard]):
                with patch('src.Components.leaderboards.leaderboards_api.get_db', return_value=mock_db):
                    response = client.get("/leaderboards")

                    assert response.status_code == 200
                    data = response.json()
                    participant = data[0]["participants"][0]
                    assert participant["problemsSolved"] == 0
                    assert participant["totalTime"] == "0.0 min"

    def test_get_leaderboards_scoreboard_no_user(
            self, mock_db, mock_competition
    ):
        """Test scoreboard entry without associated user"""
        mock_scoreboard = Mock()
        mock_scoreboard.user = None

        with patch('src.Components.leaderboards.leaderboards_api.get_all_competitions', return_value=[mock_competition]):
            with patch('src.Components.leaderboards.leaderboards_api.get_scoreboard_for_competition',
                       return_value=[mock_scoreboard]):
                with patch('src.Components.leaderboards.leaderboards_api.get_db', return_value=mock_db):
                    response = client.get("/leaderboards")

                    assert response.status_code == 200
                    data = response.json()
                    assert len(data[0]["participants"]) == 0

    def test_get_leaderboards_participant_no_user_result(
            self, mock_db, mock_competition, mock_scoreboard, mock_user
    ):
        """Test participant without user result data"""
        mock_scoreboard.user = mock_user
        mock_scoreboard.total_score = 95
        mock_scoreboard.user_id = 1
        mock_scoreboard.competition_id = 1

        mock_db.query.return_value.get.return_value = None  # simulate no UserResult

        mock_user.first_name = "John"
        mock_user.last_name = "Doe"

        def override_get_db():
            yield mock_db

        app.dependency_overrides[get_db] = override_get_db

        with patch('src.Components.leaderboards.leaderboards_api.get_all_competitions',
                   return_value=[mock_competition]):
            with patch('src.Components.leaderboards.leaderboards_api.get_scoreboard_for_competition',
                       return_value=[mock_scoreboard]):
                response = client.get("/leaderboards")

                assert response.status_code == 200
                data = response.json()
                participant = data[0]["participants"][0]
                assert participant["problemsSolved"] == 0
                assert participant["totalTime"] == "0.0 min"

    def test_get_leaderboards_multiple_competitions(
            self, mock_db, mock_user, mock_user_result
    ):
        """Test multiple competitions with different participants"""
        comp1 = Mock()
        comp1.competition_id = 1
        comp1.name = "Spring Challenge"
        comp1.date = datetime(2024, 3, 15)

        comp2 = Mock()
        comp2.competition_id = 2
        comp2.name = "Fall Challenge"
        comp2.date = datetime(2024, 9, 20)

        scoreboard1 = Mock()
        scoreboard1.user = mock_user
        scoreboard1.user_id = 1
        scoreboard1.competition_id = 1
        scoreboard1.total_score = 85

        user2 = Mock()
        user2.first_name = "Jane"
        user2.last_name = "Smith"

        scoreboard2 = Mock()
        scoreboard2.user = user2
        scoreboard2.user_id = 2
        scoreboard2.competition_id = 2
        scoreboard2.total_score = 92

        mock_db.query.return_value.get.return_value = mock_user_result

        def get_scoreboard_side_effect(db, comp_id):
            if comp_id == 1:
                return [scoreboard1]
            return [scoreboard2]

        with patch('src.Components.leaderboards.leaderboards_api.get_all_competitions', return_value=[comp1, comp2]):
            with patch('src.Components.leaderboards.leaderboards_api.get_scoreboard_for_competition',
                       side_effect=get_scoreboard_side_effect):
                with patch('src.Components.leaderboards.leaderboards_api.get_db', return_value=mock_db):
                    response = client.get("/leaderboards")

                    assert response.status_code == 200
                    data = response.json()
                    assert len(data) == 2

                    assert data[0]["name"] == "Spring Challenge"
                    assert data[0]["participants"][0]["name"] == "John Doe"
                    assert data[0]["participants"][0]["points"] == 85

                    assert data[1]["name"] == "Fall Challenge"
                    assert data[1]["participants"][0]["name"] == "Jane Smith"
                    assert data[1]["participants"][0]["points"] == 92

    def test_get_leaderboards_multiple_participants(
            self, mock_db, mock_competition, mock_user_result
    ):
        """Test competition with multiple participants"""
        user1 = Mock()
        user1.first_name = "Alice"
        user1.last_name = "Johnson"

        user2 = Mock()
        user2.first_name = "Bob"
        user2.last_name = "Williams"

        scoreboard1 = Mock()
        scoreboard1.user = user1
        scoreboard1.user_id = 1
        scoreboard1.competition_id = 1
        scoreboard1.total_score = 100

        scoreboard2 = Mock()
        scoreboard2.user = user2
        scoreboard2.user_id = 2
        scoreboard2.competition_id = 1
        scoreboard2.total_score = 85

        mock_db.query.return_value.get.return_value = mock_user_result

        with patch('src.Components.leaderboards.leaderboards_api.get_all_competitions', return_value=[mock_competition]):
            with patch('src.Components.leaderboards.leaderboards_api.get_scoreboard_for_competition',
                       return_value=[scoreboard1, scoreboard2]):
                with patch('src.Components.leaderboards.leaderboards_api.get_db', return_value=mock_db):
                    response = client.get("/leaderboards")

                    assert response.status_code == 200
                    data = response.json()
                    assert len(data[0]["participants"]) == 2
                    assert data[0]["participants"][0]["name"] == "Alice Johnson"
                    assert data[0]["participants"][1]["name"] == "Bob Williams"


class TestDatabaseDependency:
    """Test database dependency injection"""

    def test_get_db_yields_session(self):
        """Test that get_db yields a database session"""
        with patch('src.Components.leaderboards.leaderboards_api.SessionLocal') as mock_session_local:
            mock_db = Mock()
            mock_session_local.return_value = mock_db

            db_generator = get_db()
            db = next(db_generator)

            assert db == mock_db
            mock_session_local.assert_called_once()

    def test_get_db_closes_session(self):
        """Test that get_db closes the session after use"""
        with patch('src.Components.leaderboards.leaderboards_api.SessionLocal') as mock_session_local:
            mock_db = Mock()
            mock_session_local.return_value = mock_db

            db_generator = get_db()
            next(db_generator)

            try:
                next(db_generator)
            except StopIteration:
                pass

            mock_db.close.assert_called_once()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])