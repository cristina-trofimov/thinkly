import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock
from datetime import datetime
from types import SimpleNamespace
from main import app
from endpoints import currentLeaderboard_api

client = TestClient(app)


# ---------------- Fixtures ----------------
@pytest.fixture
def mock_db():
    return Mock()


# ---------------- Helper ----------------
def override_get_db(mock_db):
    def _override():
        yield mock_db

    return _override


# ---------------- Tests ----------------
class TestCurrentLeaderboardEndpoints:

    def test_get_current_standings_success(self, mock_db):
        """Test successful retrieval of current competition standings"""
        # Create mock user objects
        mock_user1 = SimpleNamespace(first_name="John", last_name="Doe")
        mock_user2 = SimpleNamespace(first_name="Jane", last_name="Smith")
        mock_user3 = SimpleNamespace(first_name="Bob", last_name="Wilson")

        # Create mock competition
        mock_competition = SimpleNamespace(
            competition_id=1,
            name="Spring Coding Challenge 2025",
            date=datetime(2025, 11, 1)
        )

        # Create mock scoreboard entries
        mock_standings = [
            SimpleNamespace(
                rank=1,
                total_score=100,
                problems_solved=5,
                current_time=45.5,
                user=mock_user1,
                competition_id=1
            ),
            SimpleNamespace(
                rank=2,
                total_score=85,
                problems_solved=4,
                current_time=52.3,
                user=mock_user2,
                competition_id=1
            ),
            SimpleNamespace(
                rank=3,
                total_score=70,
                problems_solved=3,
                current_time=60.0,
                user=mock_user3,
                competition_id=1
            )
        ]

        # Mock the query chain for getting recent competition
        mock_query = Mock()
        mock_query.join.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.first.return_value = mock_competition
        mock_query.filter.return_value = mock_query
        mock_query.all.return_value = mock_standings

        # Set up db.query to return our mock query
        mock_db.query.return_value = mock_query

        app.dependency_overrides[currentLeaderboard_api.get_db] = override_get_db(mock_db)

        response = client.get("/standings/current")

        assert response.status_code == 200
        data = response.json()

        assert data["competitionName"] == "Spring Coding Challenge 2025"
        assert len(data["participants"]) == 3

        # Check first place
        assert data["participants"][0]["name"] == "John Doe"
        assert data["participants"][0]["points"] == 100
        assert data["participants"][0]["problemsSolved"] == 5
        assert data["participants"][0]["totalTime"] == "45.5 min"

        # Check second place
        assert data["participants"][1]["name"] == "Jane Smith"
        assert data["participants"][1]["points"] == 85

        # Check third place
        assert data["participants"][2]["name"] == "Bob Wilson"
        assert data["participants"][2]["points"] == 70

        app.dependency_overrides.clear()

    def test_get_current_standings_no_competition(self, mock_db):
        """Test when no active competition exists"""
        # Mock empty result
        mock_query = Mock()
        mock_query.join.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.first.return_value = None

        mock_db.query.return_value = mock_query

        app.dependency_overrides[currentLeaderboard_api.get_db] = override_get_db(mock_db)

        response = client.get("/standings/current")

        assert response.status_code == 404
        assert "No active competition found" in response.json()["detail"]

        app.dependency_overrides.clear()

    def test_get_current_standings_no_participants(self, mock_db):
        """Test when competition exists but has no participants"""
        mock_competition = SimpleNamespace(
            competition_id=1,
            name="Empty Competition",
            date=datetime(2025, 11, 1)
        )

        # Mock the query chain
        mock_query = Mock()
        mock_query.join.return_value = mock_query
        mock_query.order_by.return_value = mock_query

        # First call returns competition, second call returns empty standings
        mock_query.first.side_effect = [mock_competition]
        mock_query.filter.return_value = mock_query
        mock_query.all.return_value = []

        mock_db.query.return_value = mock_query

        app.dependency_overrides[currentLeaderboard_api.get_db] = override_get_db(mock_db)

        response = client.get("/standings/current")

        assert response.status_code == 404
        assert "No standings found for current competition" in response.json()["detail"]

        app.dependency_overrides.clear()

    def test_get_current_standings_with_null_values(self, mock_db):
        """Test handling of null values in scoreboard"""
        mock_user = SimpleNamespace(first_name="Test", last_name="User")
        mock_competition = SimpleNamespace(
            competition_id=1,
            name="Test Competition",
            date=datetime(2025, 11, 1)
        )

        # Scoreboard entry with null/None values
        mock_standings = [
            SimpleNamespace(
                rank=1,
                total_score=None,  # Null score
                problems_solved=None,  # Null problems
                current_time=None,  # Null time
                user=mock_user,
                competition_id=1
            )
        ]

        mock_query = Mock()
        mock_query.join.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.first.return_value = mock_competition
        mock_query.filter.return_value = mock_query
        mock_query.all.return_value = mock_standings

        mock_db.query.return_value = mock_query

        app.dependency_overrides[currentLeaderboard_api.get_db] = override_get_db(mock_db)

        response = client.get("/standings/current")

        assert response.status_code == 200
        data = response.json()

        # Should handle null values gracefully
        assert data["participants"][0]["points"] == 0
        assert data["participants"][0]["problemsSolved"] == 0
        assert data["participants"][0]["totalTime"] == "0.0 min"

        app.dependency_overrides.clear()

    def test_get_standings_by_competition_success(self, mock_db):
        """Test successful retrieval of standings for specific competition"""
        mock_user1 = SimpleNamespace(first_name="Alice", last_name="Johnson")
        mock_user2 = SimpleNamespace(first_name="Charlie", last_name="Brown")

        mock_competition = SimpleNamespace(
            competition_id=5,
            name="Summer Challenge 2025"
        )

        mock_standings = [
            SimpleNamespace(
                rank=1,
                total_score=95,
                problems_solved=6,
                current_time=38.2,
                user=mock_user1,
                competition_id=5
            ),
            SimpleNamespace(
                rank=2,
                total_score=80,
                problems_solved=5,
                current_time=45.7,
                user=mock_user2,
                competition_id=5
            )
        ]

        mock_query = Mock()
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.first.return_value = mock_competition
        mock_query.all.return_value = mock_standings

        mock_db.query.return_value = mock_query

        app.dependency_overrides[currentLeaderboard_api.get_db] = override_get_db(mock_db)

        response = client.get("/standings/5")

        assert response.status_code == 200
        data = response.json()

        assert data["competitionName"] == "Summer Challenge 2025"
        assert len(data["participants"]) == 2
        assert data["participants"][0]["name"] == "Alice Johnson"
        assert data["participants"][0]["points"] == 95
        assert data["participants"][1]["name"] == "Charlie Brown"

        app.dependency_overrides.clear()

    def test_get_standings_by_competition_not_found(self, mock_db):
        """Test when competition ID doesn't exist"""
        mock_query = Mock()
        mock_query.filter.return_value = mock_query
        mock_query.first.return_value = None

        mock_db.query.return_value = mock_query

        app.dependency_overrides[currentLeaderboard_api.get_db] = override_get_db(mock_db)

        response = client.get("/standings/999")

        assert response.status_code == 404
        assert "Competition not found" in response.json()["detail"]

        app.dependency_overrides.clear()

    def test_get_standings_by_competition_no_standings(self, mock_db):
        """Test when competition exists but has no standings"""
        mock_competition = SimpleNamespace(
            competition_id=10,
            name="New Competition"
        )

        mock_query = Mock()
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.first.return_value = mock_competition
        mock_query.all.return_value = []

        mock_db.query.return_value = mock_query

        app.dependency_overrides[currentLeaderboard_api.get_db] = override_get_db(mock_db)

        response = client.get("/standings/10")

        assert response.status_code == 404
        assert "No standings found for this competition" in response.json()["detail"]

        app.dependency_overrides.clear()

    def test_get_standings_scoreboard_without_user(self, mock_db):
        """Test handling of scoreboard entries without associated user"""
        mock_competition = SimpleNamespace(
            competition_id=1,
            name="Test Competition",
            date=datetime(2025, 11, 1)
        )

        # Scoreboard entry without user
        mock_standings = [
            SimpleNamespace(
                rank=1,
                total_score=100,
                problems_solved=5,
                current_time=45.5,
                user=None,  # No user associated
                competition_id=1
            )
        ]

        mock_query = Mock()
        mock_query.join.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.first.return_value = mock_competition
        mock_query.filter.return_value = mock_query
        mock_query.all.return_value = mock_standings

        mock_db.query.return_value = mock_query

        app.dependency_overrides[currentLeaderboard_api.get_db] = override_get_db(mock_db)

        response = client.get("/standings/current")

        assert response.status_code == 200
        data = response.json()

        # Should skip entries without users
        assert len(data["participants"]) == 0

        app.dependency_overrides.clear()

    def test_get_current_standings_sorted_by_rank(self, mock_db):
        """Test that standings are properly sorted by rank"""
        mock_user1 = SimpleNamespace(first_name="First", last_name="Place")
        mock_user2 = SimpleNamespace(first_name="Second", last_name="Place")
        mock_user3 = SimpleNamespace(first_name="Third", last_name="Place")

        mock_competition = SimpleNamespace(
            competition_id=1,
            name="Ranking Test",
            date=datetime(2025, 11, 1)
        )

        # Create standings in order
        mock_standings = [
            SimpleNamespace(rank=1, total_score=100, problems_solved=5,
                            current_time=30.0, user=mock_user1, competition_id=1),
            SimpleNamespace(rank=2, total_score=90, problems_solved=4,
                            current_time=35.0, user=mock_user2, competition_id=1),
            SimpleNamespace(rank=3, total_score=80, problems_solved=3,
                            current_time=40.0, user=mock_user3, competition_id=1)
        ]

        mock_query = Mock()
        mock_query.join.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.first.return_value = mock_competition
        mock_query.filter.return_value = mock_query
        mock_query.all.return_value = mock_standings

        mock_db.query.return_value = mock_query

        app.dependency_overrides[currentLeaderboard_api.get_db] = override_get_db(mock_db)

        response = client.get("/standings/current")

        assert response.status_code == 200
        data = response.json()

        # Verify order
        assert data["participants"][0]["name"] == "First Place"
        assert data["participants"][0]["points"] == 100
        assert data["participants"][1]["name"] == "Second Place"
        assert data["participants"][1]["points"] == 90
        assert data["participants"][2]["name"] == "Third Place"
        assert data["participants"][2]["points"] == 80

        app.dependency_overrides.clear()

    def test_get_standings_time_formatting(self, mock_db):
        """Test proper formatting of time values"""
        mock_user = SimpleNamespace(first_name="Time", last_name="Test")
        mock_competition = SimpleNamespace(
            competition_id=1,
            name="Time Format Test",
            date=datetime(2025, 11, 1)
        )

        mock_standings = [
            SimpleNamespace(
                rank=1,
                total_score=100,
                problems_solved=5,
                current_time=123.456,  # Should be formatted to 1 decimal
                user=mock_user,
                competition_id=1
            )
        ]

        mock_query = Mock()
        mock_query.join.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.first.return_value = mock_competition
        mock_query.filter.return_value = mock_query
        mock_query.all.return_value = mock_standings

        mock_db.query.return_value = mock_query

        app.dependency_overrides[currentLeaderboard_api.get_db] = override_get_db(mock_db)

        response = client.get("/standings/current")

        assert response.status_code == 200
        data = response.json()

        # Check time is formatted to 1 decimal place
        assert data["participants"][0]["totalTime"] == "123.5 min"

        app.dependency_overrides.clear()