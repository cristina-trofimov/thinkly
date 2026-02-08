import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy.orm import Session

from src.endpoints.leaderboards_api import (
    get_all_competitions,
    get_scoreboard_for_competition,
    calculate_rank,
    get_filtered_leaderboard_entries,
    get_leaderboards,
    get_current_competition_leaderboard,
    get_all_algotime_leaderboard_entries
)


# Test fixtures
@pytest.fixture
def mock_db():
    """Mock database session"""
    return Mock(spec=Session)


@pytest.fixture
def sample_base_event():
    """Sample base event"""
    event = Mock()
    event.event_name = "Test Competition"
    event.event_start_date = datetime(2025, 1, 1, tzinfo=timezone.utc)
    event.event_end_date = datetime(2025, 1, 31, tzinfo=timezone.utc)
    return event


@pytest.fixture
def sample_competition(sample_base_event):
    """Sample competition with base event"""
    comp = Mock()
    comp.event_id = 1
    comp.base_event = sample_base_event
    comp.competition_leaderboard_entries = []
    return comp


@pytest.fixture
def sample_leaderboard_entry():
    """Sample leaderboard entry"""
    entry = Mock()
    entry.competition_leaderboard_entry_id = 1
    entry.competition_id = 1
    entry.user_id = 1
    entry.name = "John Doe"
    entry.total_score = 100
    entry.problems_solved = 5
    entry.total_time = 3600
    entry.calculated_rank = None  # Will be set by calculate_rank
    entry.user_account = Mock()
    entry.user_account.first_name = "John"
    entry.user_account.last_name = "Doe"
    return entry


@pytest.fixture
def sample_algotime_entry():
    """Sample AlgoTime leaderboard entry"""
    entry = Mock()
    entry.algotime_leaderboard_entry_id = 1
    entry.algotime_series_id = 1
    entry.user_id = 1
    entry.name = "Jane Smith"
    entry.total_score = 150
    entry.problems_solved = 7
    entry.total_time = 4200
    entry.calculated_rank = None  # Will be set by calculate_rank
    entry.last_updated = datetime(2025, 1, 15, tzinfo=timezone.utc)
    entry.user_account = Mock()
    entry.user_account.first_name = "Jane"
    entry.user_account.last_name = "Smith"
    return entry


class TestGetAllCompetitions:
    """Tests for get_all_competitions helper function"""

    def test_get_all_competitions_success(self, mock_db):
        """Test successful retrieval of all competitions"""
        mock_competitions = [Mock(), Mock(), Mock()]
        mock_db.query.return_value.all.return_value = mock_competitions

        result = get_all_competitions(mock_db)

        assert result == mock_competitions
        assert len(result) == 3

    def test_get_all_competitions_empty(self, mock_db):
        """Test retrieval when no competitions exist"""
        mock_db.query.return_value.all.return_value = []

        result = get_all_competitions(mock_db)

        assert result == []

    def test_get_all_competitions_database_error(self, mock_db):
        """Test database error handling"""
        mock_db.query.side_effect = Exception("Database connection failed")

        with pytest.raises(Exception, match="Database connection failed"):
            get_all_competitions(mock_db)


class TestGetScoreboardForCompetition:
    """Tests for get_scoreboard_for_competition helper function"""

    def test_get_scoreboard_success(self, mock_db):
        """Test successful scoreboard retrieval"""
        mock_entries = [Mock(total_score=100), Mock(total_score=90), Mock(total_score=80)]
        mock_query = mock_db.query.return_value
        mock_query.filter.return_value.all.return_value = mock_entries

        result = get_scoreboard_for_competition(mock_db, 1)

        assert result == mock_entries
        assert len(result) == 3

    def test_get_scoreboard_empty(self, mock_db):
        """Test when competition has no entries"""
        mock_query = mock_db.query.return_value
        mock_query.filter.return_value.all.return_value = []

        result = get_scoreboard_for_competition(mock_db, 1)

        assert result == []

    def test_get_scoreboard_database_error(self, mock_db):
        """Test database error handling"""
        mock_db.query.side_effect = Exception("Query failed")

        with pytest.raises(Exception, match="Query failed"):
            get_scoreboard_for_competition(mock_db, 1)


class TestCalculateRank:
    """Tests for calculate_rank helper function"""

    def create_mock_entry(self, user_id, total_score):
        """Helper to create mock leaderboard entry"""
        entry = Mock()
        entry.user_id = user_id
        entry.total_score = total_score
        entry.calculated_rank = None
        return entry

    def test_calculate_rank_empty_list(self):
        """Test with empty entries list"""
        result = calculate_rank([])
        assert result == []

    def test_calculate_rank_single_entry(self):
        """Test with single entry"""
        entries = [self.create_mock_entry(1, 100)]
        result = calculate_rank(entries)

        assert len(result) == 1
        assert result[0].calculated_rank == 1

    def test_calculate_rank_different_scores(self):
        """Test ranking with different scores"""
        entries = [
            self.create_mock_entry(1, 50),
            self.create_mock_entry(2, 100),
            self.create_mock_entry(3, 75)
        ]
        result = calculate_rank(entries)

        assert result[0].total_score == 100
        assert result[0].calculated_rank == 1
        assert result[1].total_score == 75
        assert result[1].calculated_rank == 2
        assert result[2].total_score == 50
        assert result[2].calculated_rank == 3

    def test_calculate_rank_tied_scores(self):
        """Test ranking with tied scores"""
        entries = [
            self.create_mock_entry(1, 100),
            self.create_mock_entry(2, 100),
            self.create_mock_entry(3, 75)
        ]
        result = calculate_rank(entries)

        assert result[0].calculated_rank == 1
        assert result[1].calculated_rank == 1
        assert result[2].calculated_rank == 3


class TestGetFilteredLeaderboardEntries:
    """Tests for get_filtered_leaderboard_entries helper function"""

    def create_mock_entry(self, user_id, total_score):
        """Helper to create mock leaderboard entry"""
        entry = Mock()
        entry.user_id = user_id
        entry.total_score = total_score
        entry.calculated_rank = None
        return entry

    def test_empty_entries_list(self):
        """Test with empty entries list"""
        result, show_separator = get_filtered_leaderboard_entries([], None)

        assert result == []
        assert show_separator is False

    def test_no_user_logged_in(self):
        """Test with no user logged in - returns top 10"""
        # Create 20 entries with decreasing scores
        entries = [self.create_mock_entry(i, 200 - i) for i in range(1, 21)]

        result, show_separator = get_filtered_leaderboard_entries(entries, None)

        assert len(result) == 10
        assert show_separator is False
        # Verify top 10 are returned in order
        assert result[0].total_score == 199

    def test_user_not_in_leaderboard(self):
        """Test when user is not in leaderboard - returns top 10"""
        entries = [self.create_mock_entry(i, 200 - i) for i in range(1, 21)]

        result, show_separator = get_filtered_leaderboard_entries(entries, 999)

        assert len(result) == 10
        assert show_separator is False

    def test_user_in_top_10(self):
        """Test when user is in top 10 - returns top 10"""
        entries = [self.create_mock_entry(i, 200 - i) for i in range(1, 21)]

        result, show_separator = get_filtered_leaderboard_entries(entries, 5)

        assert len(result) == 10
        assert show_separator is False

    def test_user_at_rank_11(self):
        """Test when user is at rank 11 (index 10) - returns top 12, no separator"""
        entries = [self.create_mock_entry(i, 200 - i) for i in range(1, 21)]

        result, show_separator = get_filtered_leaderboard_entries(entries, 11)

        assert len(result) == 12
        assert show_separator is False

    def test_user_at_rank_12(self):
        """Test when user is at rank 12 (index 11) - returns top 13, no separator"""
        entries = [self.create_mock_entry(i, 200 - i) for i in range(1, 21)]

        result, show_separator = get_filtered_leaderboard_entries(entries, 12)

        assert len(result) == 13
        assert show_separator is False

    def test_user_at_rank_13_or_higher(self):
        """Test when user is at rank 13+ (index 12+) - returns top 10 + user ±1 with separator"""
        entries = [self.create_mock_entry(i, 200 - i) for i in range(1, 21)]

        result, show_separator = get_filtered_leaderboard_entries(entries, 15)

        # Should be top 10 + entry at positions 13, 14, 15 = 13 entries
        assert len(result) == 13
        assert show_separator is True
        # Verify user is in results
        user_ids = [e.user_id for e in result]
        assert 15 in user_ids
        assert 14 in user_ids  # user - 1
        assert 16 in user_ids  # user + 1

    def test_user_at_last_position(self):
        """Test when user is at last position - no entry after user"""
        entries = [self.create_mock_entry(i, 200 - i) for i in range(1, 21)]

        result, show_separator = get_filtered_leaderboard_entries(entries, 20)

        # Should be top 10 + entries at positions 18, 19, 20 = 13 entries (no 21st entry)
        assert len(result) == 12
        assert show_separator is True
        # Verify user is in results
        user_ids = [e.user_id for e in result]
        assert 20 in user_ids
        assert 19 in user_ids  # user - 1

    def test_less_than_10_entries(self):
        """Test when there are less than 10 entries total"""
        entries = [self.create_mock_entry(i, 200 - i) for i in range(1, 6)]

        result, show_separator = get_filtered_leaderboard_entries(entries, 3)

        assert len(result) == 5
        assert show_separator is False


class TestGetLeaderboards:
    """Tests for get_leaderboards endpoint"""

    def test_get_leaderboards_no_competitions(self, mock_db):
        """Test when no competitions exist"""
        mock_query = mock_db.query.return_value
        mock_query.join.return_value.all.return_value = []

        result = get_leaderboards(mock_db, None)

        assert result == []

    def test_get_leaderboards_with_competitions(self, mock_db, sample_competition, sample_leaderboard_entry):
        """Test successful leaderboard retrieval"""
        sample_competition.competition_leaderboard_entries = [sample_leaderboard_entry]
        mock_query = mock_db.query.return_value
        mock_query.join.return_value.all.return_value = [sample_competition]

        result = get_leaderboards(mock_db, None)

        assert len(result) == 1
        assert result[0]["id"] == "1"
        assert result[0]["name"] == "Test Competition"
        assert len(result[0]["participants"]) == 1
        assert result[0]["participants"][0]["name"] == "John Doe"
        assert result[0]["participants"][0]["points"] == 100

    def test_get_leaderboards_with_user_fallback_name(self, mock_db, sample_competition, sample_leaderboard_entry):
        """Test leaderboard with fallback name when user_account is None"""
        sample_leaderboard_entry.user_account = None
        sample_leaderboard_entry.name = "Fallback Name"
        sample_competition.competition_leaderboard_entries = [sample_leaderboard_entry]
        mock_query = mock_db.query.return_value
        mock_query.join.return_value.all.return_value = [sample_competition]

        result = get_leaderboards(mock_db, None)

        assert result[0]["participants"][0]["name"] == "Fallback Name"

    def test_get_leaderboards_database_error(self, mock_db):
        """Test database error handling"""
        mock_db.query.side_effect = Exception("Database error")

        with pytest.raises(HTTPException) as exc_info:
            get_leaderboards(mock_db, None)

        assert exc_info.value.status_code == 500
        assert exc_info.value.detail == "Failed to retrieve leaderboards."


class TestGetCurrentCompetitionLeaderboard:
    """Tests for get_current_competition_leaderboard endpoint"""

    def test_no_current_competition(self, mock_db):
        competition_query = Mock()

        # ✅ ONLY ONE filter()
        competition_query.join.return_value.filter.return_value.first.return_value = None

        mock_db.query.return_value = competition_query

        result = get_current_competition_leaderboard(mock_db, None)

        assert result["message"] == "No competition is currently active."
        assert result["competition"] is None
        assert result["entries"] == []

    @patch("src.endpoints.leaderboards_api.datetime")
    def test_current_competition_found(
            self,
            mock_datetime,
            mock_db,
            sample_leaderboard_entry
    ):
        mock_now = datetime(2025, 1, 15, tzinfo=timezone.utc)
        mock_datetime.now.return_value = mock_now

        mock_competition = Mock()
        mock_competition.event_id = 1
        mock_competition.base_event = Mock()
        mock_competition.base_event.event_name = "Test Competition"
        mock_competition.base_event.event_start_date = datetime(2025, 1, 1, tzinfo=timezone.utc)
        mock_competition.base_event.event_end_date = datetime(2025, 1, 31, tzinfo=timezone.utc)

        competition_query = Mock()
        competition_query.join.return_value.filter.return_value.first.return_value = mock_competition

        entries_query = Mock()
        entries_query.filter.return_value.all.return_value = [sample_leaderboard_entry]

        mock_db.query.side_effect = [competition_query, entries_query]

        result = get_current_competition_leaderboard(mock_db, None)

        assert result["competition"]["id"] == 1
        assert result["competition"]["name"] == "Test Competition"
        assert len(result["entries"]) == 1


    def test_current_competition_database_error(self, mock_db):
        """Test database error handling"""
        mock_db.query.side_effect = Exception("Database error")

        with pytest.raises(HTTPException) as exc_info:
            get_current_competition_leaderboard(None, mock_db)

        assert exc_info.value.status_code == 500
        assert exc_info.value.detail == "Failed to retrieve current competition leaderboard."


class TestGetAllAlgoTimeLeaderboardEntries:
    """Tests for get_all_algotime_leaderboard_entries endpoint"""

    def test_get_algotime_entries_success(self, mock_db, sample_algotime_entry):
        """Test successful retrieval of AlgoTime entries"""
        mock_query = mock_db.query.return_value
        mock_query.all.return_value = [sample_algotime_entry]

        result = get_all_algotime_leaderboard_entries(mock_db)

        assert len(result) == 1
        assert result[0]["name"] == "Jane Smith"
        assert result[0]["totalScore"] == 150
        assert result[0]["rank"] == 1

    def test_get_algotime_entries_with_fallback_name(self, mock_db, sample_algotime_entry):
        """Test AlgoTime entries with fallback name"""
        sample_algotime_entry.user_account = None
        sample_algotime_entry.name = "Anonymous User"
        mock_query = mock_db.query.return_value
        mock_query.all.return_value = [sample_algotime_entry]

        result = get_all_algotime_leaderboard_entries(mock_db)

        assert result[0]["name"] == "Anonymous User"

    def test_get_algotime_entries_empty(self, mock_db):
        """Test when no AlgoTime entries exist"""
        mock_query = mock_db.query.return_value
        mock_query.all.return_value = []

        result = get_all_algotime_leaderboard_entries(mock_db)

        assert result == []

    def test_get_algotime_entries_multiple(self, mock_db):
        """Test with multiple AlgoTime entries"""
        entry1 = Mock()
        entry1.algotime_leaderboard_entry_id = 1
        entry1.algotime_series_id = 1
        entry1.user_id = 1
        entry1.name = "User One"
        entry1.total_score = 150
        entry1.problems_solved = 7
        entry1.total_time = 4200
        entry1.calculated_rank = None
        entry1.last_updated = datetime(2025, 1, 15, tzinfo=timezone.utc)
        entry1.user_account = Mock()
        entry1.user_account.first_name = "User"
        entry1.user_account.last_name = "One"

        entry2 = Mock()
        entry2.algotime_leaderboard_entry_id = 2
        entry2.algotime_series_id = 1
        entry2.user_id = 2
        entry2.name = "User Two"
        entry2.total_score = 100
        entry2.problems_solved = 5
        entry2.total_time = 3600
        entry2.calculated_rank = None
        entry2.last_updated = datetime(2025, 1, 15, tzinfo=timezone.utc)
        entry2.user_account = Mock()
        entry2.user_account.first_name = "User"
        entry2.user_account.last_name = "Two"

        mock_query = mock_db.query.return_value
        mock_query.all.return_value = [entry1, entry2]

        result = get_all_algotime_leaderboard_entries(mock_db)

        assert len(result) == 2
        # Should be sorted by score (highest first)
        assert result[0]["totalScore"] == 150
        assert result[0]["rank"] == 1
        assert result[1]["totalScore"] == 100
        assert result[1]["rank"] == 2

    def test_get_algotime_entries_database_error(self, mock_db):
        """Test database error handling"""
        mock_db.query.side_effect = Exception("Database error")

        with pytest.raises(HTTPException) as exc_info:
            get_all_algotime_leaderboard_entries(mock_db)

        assert exc_info.value.status_code == 500
        assert exc_info.value.detail == "Failed to retrieve AlgoTime leaderboard entries."