import pytest
from unittest.mock import Mock, patch, MagicMock, call
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
    get_algotime_leaderboard,          # renamed: was get_all_algotime_leaderboard_entries
    get_all_algotime_entries_export,    # new export endpoint
    get_all_competition_entries,
)


# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_db():
    return Mock(spec=Session)


def make_entry(user_id: int, total_score: int, **kwargs):
    """Factory for a minimal leaderboard mock entry."""
    entry = Mock()
    entry.user_id = user_id
    entry.total_score = total_score
    entry.calculated_rank = None
    entry.name = kwargs.get("name", f"User {user_id}")
    entry.problems_solved = kwargs.get("problems_solved", 5)
    entry.total_time = kwargs.get("total_time", 3600)
    entry.competition_leaderboard_entry_id = kwargs.get("entry_id", user_id)
    entry.user_account = kwargs.get("user_account", None)
    return entry


def make_user_account(first_name: str, last_name: str):
    ua = Mock()
    ua.first_name = first_name
    ua.last_name = last_name
    return ua


def setup_leaderboards_mock(mock_db, competitions: list):
    """
    Configure mock_db for the new get_leaderboards chain:
      db.query().join().filter().filter()*.order_by().count()  →  len(competitions)
      db.query().join().filter().filter()*.order_by().offset().limit().all()  →  competitions

    The first .filter() is the exists() check that excludes empty competitions.
    Optional extra .filter() calls may follow for search. order_by() is always last
    before count/offset, so we anchor the mock there.
    """
    # Chain: query -> join -> filter (exists) -> filter (search, optional, same mock)
    # -> order_by -> count / offset -> limit -> all
    filter_chain = mock_db.query.return_value.join.return_value.filter.return_value
    # A second .filter() (for search) returns the same mock so both paths work.
    filter_chain.filter.return_value = filter_chain
    chain = filter_chain.order_by.return_value
    chain.count.return_value = len(competitions)
    chain.offset.return_value.limit.return_value.all.return_value = competitions


# FastAPI's Query() descriptor objects become the default parameter value when a
# route function is called directly (outside the HTTP stack). Every direct call
# must supply plain Python values for all Query-annotated parameters so that
# arithmetic / string operations inside the function body succeed.
_LEADERBOARDS_DEFAULTS = dict(search=None, sort="desc", page=1, page_size=20)
_ALGOTIME_DEFAULTS     = dict(search=None, page=1, page_size=15)


# ---------------------------------------------------------------------------
# TestCalculateRank — extended
# ---------------------------------------------------------------------------

class TestCalculateRankExtended:

    def test_all_entries_have_same_score(self):
        """All tied → everyone gets rank 1."""
        entries = [make_entry(i, 100) for i in range(1, 6)]
        result = calculate_rank(entries)
        assert all(e.calculated_rank == 1 for e in result)

    def test_ties_in_the_middle(self):
        """Rank 1 unique, ranks 2-3 tied, rank 4 is 4."""
        entries = [
            make_entry(1, 200),
            make_entry(2, 150),
            make_entry(3, 150),
            make_entry(4, 100),
        ]
        result = calculate_rank(entries)
        assert result[0].calculated_rank == 1
        assert result[1].calculated_rank == 2
        assert result[2].calculated_rank == 2
        assert result[3].calculated_rank == 4   # skips 3 due to tie

    def test_zero_scores_get_ranked(self):
        """Zero is a valid score and must be ranked correctly."""
        entries = [make_entry(1, 0), make_entry(2, 0), make_entry(3, 10)]
        result = calculate_rank(entries)
        assert result[0].total_score == 10
        assert result[0].calculated_rank == 1
        assert result[1].calculated_rank == 2
        assert result[2].calculated_rank == 2

    def test_large_dataset_ordering(self):
        """100 entries are returned in descending score order."""
        entries = [make_entry(i, i * 3) for i in range(1, 101)]
        result = calculate_rank(entries)
        assert result[0].total_score == 300           # user 100
        assert result[0].calculated_rank == 1
        assert result[-1].total_score == 3            # user 1
        assert result[-1].calculated_rank == 100

    def test_two_entries_different_scores(self):
        entries = [make_entry(1, 50), make_entry(2, 100)]
        result = calculate_rank(entries)
        assert result[0].calculated_rank == 1
        assert result[1].calculated_rank == 2

    def test_returns_same_list_length(self):
        entries = [make_entry(i, 100 - i) for i in range(10)]
        result = calculate_rank(entries)
        assert len(result) == 10

    def test_rank_assigned_in_place(self):
        """calculate_rank modifies and returns the same objects."""
        entry = make_entry(1, 42)
        result = calculate_rank([entry])
        assert result[0] is entry


# ---------------------------------------------------------------------------
# TestGetFilteredLeaderboardEntries — extended
# ---------------------------------------------------------------------------

class TestGetFilteredLeaderboardEntriesExtended:

    def _entries(self, n: int):
        """n entries with scores 200, 199, …, 200-n+1 (user_id == rank)."""
        return [make_entry(i, 200 - i) for i in range(1, n + 1)]

    def test_user_at_rank_10_boundary(self):
        """User is exactly the 10th entry → top 10, no separator."""
        entries = self._entries(20)
        result, show_separator = get_filtered_leaderboard_entries(entries, user_id := 10)
        assert len(result) == 10
        assert show_separator is False
        assert any(e.user_id == user_id for e in result)

    def test_user_at_rank_11_only_11_total(self):
        """Only 11 entries, user at rank 11 → 11 entries returned (no 12th exists)."""
        entries = self._entries(11)
        result, show_separator = get_filtered_leaderboard_entries(entries, 11)
        assert len(result) == 11
        assert show_separator is False

    def test_user_at_rank_12_only_12_total(self):
        """Only 12 entries, user at rank 12 → 12 entries, no separator."""
        entries = self._entries(12)
        result, show_separator = get_filtered_leaderboard_entries(entries, 12)
        assert len(result) == 12
        assert show_separator is False

    def test_user_at_rank_13_only_13_total(self):
        """Only 13 entries, user at rank 13 → top 10 + entry 12 + 13, separator.
        No entry after user since user is last."""
        entries = self._entries(13)
        result, show_separator = get_filtered_leaderboard_entries(entries, 13)
        assert len(result) == 12
        assert show_separator is True
        user_ids = {e.user_id for e in result}
        assert 13 in user_ids
        assert 12 in user_ids

    def test_user_at_rank_13_has_no_one_before(self):
        entries = self._entries(20)
        result, show_separator = get_filtered_leaderboard_entries(entries, 14)
        user_ids = {e.user_id for e in result}
        assert 13 in user_ids   # user - 1
        assert 14 in user_ids   # user
        assert 15 in user_ids   # user + 1
        assert show_separator is True

    def test_separator_not_present_for_rank_12_case(self):
        entries = self._entries(20)
        result, show_separator = get_filtered_leaderboard_entries(entries, 12)
        assert show_separator is False

    def test_top_10_exact(self):
        entries = self._entries(10)
        result, show_separator = get_filtered_leaderboard_entries(entries, None)
        assert len(result) == 10
        assert show_separator is False

    def test_fewer_than_10_entries_no_user(self):
        entries = self._entries(5)
        result, show_separator = get_filtered_leaderboard_entries(entries, None)
        assert len(result) == 5
        assert show_separator is False

    def test_single_entry_is_user(self):
        entries = [make_entry(42, 500)]
        result, show_separator = get_filtered_leaderboard_entries(entries, 42)
        assert len(result) == 1
        assert result[0].user_id == 42
        assert show_separator is False

    def test_tied_scores_user_outside_top10(self):
        entries = [make_entry(i, 100) for i in range(1, 16)]
        result, show_separator = get_filtered_leaderboard_entries(entries, 15)
        user_ids = {e.user_id for e in result}
        assert 15 in user_ids

    def test_result_entries_have_calculated_rank(self):
        entries = self._entries(15)
        result, _ = get_filtered_leaderboard_entries(entries, 13)
        for entry in result:
            assert entry.calculated_rank is not None


# ---------------------------------------------------------------------------
# TestGetAllCompetitionEntries
# ---------------------------------------------------------------------------

class TestGetAllCompetitionEntries:

    def _make_competition(self, event_id: int, entries):
        comp = Mock()
        comp.event_id = event_id
        comp.base_event = Mock()
        comp.base_event.event_name = "Spring Comp"
        comp.competition_leaderboard_entries = entries
        return comp

    def test_returns_all_ranked_entries(self, mock_db):
        e1 = make_entry(1, 300, name="Alice", user_account=make_user_account("Alice", "A"), entry_id=10)
        e2 = make_entry(2, 100, name="Bob", user_account=make_user_account("Bob", "B"), entry_id=11)
        comp = self._make_competition(5, [e2, e1])

        mock_db.query.return_value.join.return_value.filter.return_value.first.return_value = comp

        result = get_all_competition_entries(5, mock_db)

        assert len(result) == 2
        assert result[0]["name"] == "Alice A"
        assert result[0]["rank"] == 1
        assert result[1]["name"] == "Bob B"
        assert result[1]["rank"] == 2

    def test_uses_fallback_name_when_no_user_account(self, mock_db):
        entry = make_entry(1, 50, name="Ghost User", user_account=None, entry_id=99)
        comp = self._make_competition(1, [entry])
        mock_db.query.return_value.join.return_value.filter.return_value.first.return_value = comp

        result = get_all_competition_entries(1, mock_db)

        assert result[0]["name"] == "Ghost User"

    def test_response_shape(self, mock_db):
        entry = make_entry(1, 200, problems_solved=7, total_time=1234, entry_id=5,
                           user_account=make_user_account("X", "Y"))
        comp = self._make_competition(3, [entry])
        mock_db.query.return_value.join.return_value.filter.return_value.first.return_value = comp

        result = get_all_competition_entries(3, mock_db)
        row = result[0]

        assert set(row.keys()) == {"name", "userId", "points", "problemsSolved", "totalTime", "rank"}
        assert row["userId"] == 1
        assert row["points"] == 200
        assert row["problemsSolved"] == 7
        assert row["totalTime"] == 1234

    def test_competition_not_found_raises_404(self, mock_db):
        mock_db.query.return_value.join.return_value.filter.return_value.first.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            get_all_competition_entries(999, mock_db)

        assert exc_info.value.status_code == 404
        assert "999" in exc_info.value.detail

    def test_empty_entries_returns_empty_list(self, mock_db):
        comp = self._make_competition(2, [])
        mock_db.query.return_value.join.return_value.filter.return_value.first.return_value = comp

        result = get_all_competition_entries(2, mock_db)

        assert result == []

    def test_database_error_raises_500(self, mock_db):
        mock_db.query.side_effect = Exception("DB is down")

        with pytest.raises(HTTPException) as exc_info:
            get_all_competition_entries(1, mock_db)

        assert exc_info.value.status_code == 500
        assert "Failed to retrieve competition entries" in exc_info.value.detail

    def test_http_exception_propagated_not_wrapped(self, mock_db):
        mock_db.query.return_value.join.return_value.filter.return_value.first.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            get_all_competition_entries(7, mock_db)

        assert exc_info.value.status_code == 404


# ---------------------------------------------------------------------------
# TestGetLeaderboards — updated for paginated response shape
# ---------------------------------------------------------------------------

class TestGetLeaderboardsExtended:

    def _make_comp(self, event_id, event_name, entries):
        event = Mock()
        event.event_name = event_name
        event.event_start_date = datetime(2025, 3, 1, tzinfo=timezone.utc)
        comp = Mock()
        comp.event_id = event_id
        comp.base_event = event
        comp.competition_leaderboard_entries = entries
        return comp

    def test_response_shape_with_entry(self, mock_db):
        """Verify full shape of a returned competition dict including pagination envelope."""
        entry = make_entry(1, 100, problems_solved=3, total_time=900,
                           user_account=make_user_account("Jane", "Doe"))
        comp = self._make_comp(1, "Spring Cup", [entry])
        setup_leaderboards_mock(mock_db, [comp])

        result = get_leaderboards(mock_db, None, **_LEADERBOARDS_DEFAULTS)

        assert result["total"] == 1
        assert result["page"] == 1
        assert result["page_size"] == 20
        assert len(result["competitions"]) == 1

        c = result["competitions"][0]
        assert c["id"] == "1"
        assert c["name"] == "Spring Cup"
        assert "date" in c
        assert "showSeparator" in c

        p = c["participants"][0]
        assert p["name"] == "Jane Doe"
        assert p["points"] == 100
        assert p["problemsSolved"] == 3
        assert p["totalTime"] == 900
        assert p["rank"] == 1

    def test_empty_competitions_returns_paginated_envelope(self, mock_db):
        """No competitions → pagination envelope with empty competitions list."""
        setup_leaderboards_mock(mock_db, [])

        result = get_leaderboards(mock_db, None, **_LEADERBOARDS_DEFAULTS)

        assert result["total"] == 0
        assert result["competitions"] == []

    def test_with_current_user_in_top_10(self, mock_db):
        entries = [make_entry(i, 200 - i, user_account=make_user_account(f"U{i}", "X"))
                   for i in range(1, 15)]
        comp = self._make_comp(1, "Comp", entries)
        setup_leaderboards_mock(mock_db, [comp])

        result = get_leaderboards(mock_db, current_user_id=5, **_LEADERBOARDS_DEFAULTS)

        assert len(result["competitions"][0]["participants"]) == 10
        assert result["competitions"][0]["showSeparator"] is False

    def test_with_current_user_outside_top_10(self, mock_db):
        entries = [make_entry(i, 200 - i, user_account=make_user_account(f"U{i}", "X"))
                   for i in range(1, 21)]
        comp = self._make_comp(1, "Comp", entries)
        setup_leaderboards_mock(mock_db, [comp])

        result = get_leaderboards(mock_db, current_user_id=15, **_LEADERBOARDS_DEFAULTS)

        assert result["competitions"][0]["showSeparator"] is True
        participant_ids = [p["userId"] for p in result["competitions"][0]["participants"]]
        assert 15 in participant_ids

    def test_multiple_competitions_returned(self, mock_db):
        comp1 = self._make_comp(1, "Alpha", [make_entry(1, 100, user_account=make_user_account("A", "B"))])
        comp2 = self._make_comp(2, "Beta", [make_entry(2, 200, user_account=make_user_account("C", "D"))])
        setup_leaderboards_mock(mock_db, [comp1, comp2])

        result = get_leaderboards(mock_db, None, **_LEADERBOARDS_DEFAULTS)

        assert len(result["competitions"]) == 2
        names = {r["name"] for r in result["competitions"]}
        assert names == {"Alpha", "Beta"}

    def test_participant_rank_field_present(self, mock_db):
        entry = make_entry(1, 50, user_account=make_user_account("A", "B"))
        comp = self._make_comp(1, "C", [entry])
        setup_leaderboards_mock(mock_db, [comp])

        result = get_leaderboards(mock_db, None, **_LEADERBOARDS_DEFAULTS)

        assert "rank" in result["competitions"][0]["participants"][0]

    def test_total_reflects_count_query(self, mock_db):
        """total in the response comes from query.count(), not len(competitions)."""
        # Simulate DB having 50 total but only returning page 1 (20 items)
        comps = [self._make_comp(i, f"Comp {i}",
                                  [make_entry(1, 100, user_account=make_user_account("A", "B"))])
                 for i in range(1, 21)]
        filter_chain = mock_db.query.return_value.join.return_value.filter.return_value
        filter_chain.filter.return_value = filter_chain
        chain = filter_chain.order_by.return_value
        chain.count.return_value = 50
        chain.offset.return_value.limit.return_value.all.return_value = comps

        result = get_leaderboards(mock_db, None, **_LEADERBOARDS_DEFAULTS)

        assert result["total"] == 50
        assert len(result["competitions"]) == 20

    def test_page_and_page_size_reflected_in_response(self, mock_db):
        entry = make_entry(1, 100, user_account=make_user_account("A", "B"))
        comp = self._make_comp(1, "Comp", [entry])
        setup_leaderboards_mock(mock_db, [comp])

        result = get_leaderboards(mock_db, None, search=None, sort='desc', page=2, page_size=10)

        assert result["page"] == 2
        assert result["page_size"] == 10

    def test_database_error_raises_500(self, mock_db):
        mock_db.query.side_effect = Exception("DB exploded")

        with pytest.raises(HTTPException) as exc_info:
            get_leaderboards(mock_db, None, **_LEADERBOARDS_DEFAULTS)

        assert exc_info.value.status_code == 500


# ---------------------------------------------------------------------------
# TestGetCurrentCompetitionLeaderboard — extended
# ---------------------------------------------------------------------------

class TestGetCurrentCompetitionLeaderboardExtended:

    @patch("src.endpoints.leaderboards_api.datetime")
    def test_entry_response_shape(self, mock_dt, mock_db):
        mock_dt.now.return_value = datetime(2025, 6, 15, tzinfo=timezone.utc)

        ua = make_user_account("Sam", "Jones")
        entry = make_entry(7, 250, problems_solved=9, total_time=5000,
                           user_account=ua, entry_id=42)

        mock_comp = Mock()
        mock_comp.event_id = 3
        mock_comp.base_event = Mock()
        mock_comp.base_event.event_name = "Summer Open"
        mock_comp.base_event.event_start_date = datetime(2025, 6, 1, tzinfo=timezone.utc)
        mock_comp.base_event.event_end_date = datetime(2025, 6, 30, tzinfo=timezone.utc)

        comp_query = Mock()
        comp_query.join.return_value.filter.return_value.first.return_value = mock_comp
        entries_query = Mock()
        entries_query.filter.return_value.all.return_value = [entry]
        mock_db.query.side_effect = [comp_query, entries_query]

        result = get_current_competition_leaderboard(mock_db, None)

        assert result["competition"]["id"] == 3
        assert result["competition"]["name"] == "Summer Open"
        assert "startDate" in result["competition"]
        assert "endDate" in result["competition"]
        assert "showSeparator" in result
        e = result["entries"][0]
        assert set(e.keys()) == {"entryId", "name", "userId", "totalScore", "problemsSolved", "totalTime", "rank"}
        assert e["name"] == "Sam Jones"
        assert e["userId"] == 7
        assert e["totalScore"] == 250
        assert e["problemsSolved"] == 9
        assert e["rank"] == 1

    @patch("src.endpoints.leaderboards_api.datetime")
    def test_uses_fallback_name(self, mock_dt, mock_db):
        mock_dt.now.return_value = datetime(2025, 6, 15, tzinfo=timezone.utc)
        entry = make_entry(5, 100, name="Archived User", user_account=None, entry_id=1)

        mock_comp = Mock()
        mock_comp.event_id = 1
        mock_comp.base_event = Mock()
        mock_comp.base_event.event_name = "Comp"
        mock_comp.base_event.event_start_date = datetime(2025, 6, 1, tzinfo=timezone.utc)
        mock_comp.base_event.event_end_date = datetime(2025, 6, 30, tzinfo=timezone.utc)

        comp_query = Mock()
        comp_query.join.return_value.filter.return_value.first.return_value = mock_comp
        entries_query = Mock()
        entries_query.filter.return_value.all.return_value = [entry]
        mock_db.query.side_effect = [comp_query, entries_query]

        result = get_current_competition_leaderboard(mock_db, None)

        assert result["entries"][0]["name"] == "Archived User"

    @patch("src.endpoints.leaderboards_api.datetime")
    def test_show_separator_true_for_user_outside_top10(self, mock_dt, mock_db):
        mock_dt.now.return_value = datetime(2025, 6, 15, tzinfo=timezone.utc)
        entries = [make_entry(i, 200 - i, user_account=make_user_account(f"U{i}", "X"), entry_id=i)
                   for i in range(1, 21)]

        mock_comp = Mock()
        mock_comp.event_id = 1
        mock_comp.base_event = Mock()
        mock_comp.base_event.event_name = "Live Comp"
        mock_comp.base_event.event_start_date = datetime(2025, 6, 1, tzinfo=timezone.utc)
        mock_comp.base_event.event_end_date = datetime(2025, 6, 30, tzinfo=timezone.utc)

        comp_query = Mock()
        comp_query.join.return_value.filter.return_value.first.return_value = mock_comp
        entries_query = Mock()
        entries_query.filter.return_value.all.return_value = entries
        mock_db.query.side_effect = [comp_query, entries_query]

        result = get_current_competition_leaderboard(mock_db, current_user_id=15)

        assert result["showSeparator"] is True
        entry_user_ids = [e["userId"] for e in result["entries"]]
        assert 15 in entry_user_ids

    @patch("src.endpoints.leaderboards_api.datetime")
    def test_empty_competition_returns_empty_entries(self, mock_dt, mock_db):
        mock_dt.now.return_value = datetime(2025, 6, 15, tzinfo=timezone.utc)

        mock_comp = Mock()
        mock_comp.event_id = 2
        mock_comp.base_event = Mock()
        mock_comp.base_event.event_name = "Empty Comp"
        mock_comp.base_event.event_start_date = datetime(2025, 6, 1, tzinfo=timezone.utc)
        mock_comp.base_event.event_end_date = datetime(2025, 6, 30, tzinfo=timezone.utc)

        comp_query = Mock()
        comp_query.join.return_value.filter.return_value.first.return_value = mock_comp
        entries_query = Mock()
        entries_query.filter.return_value.all.return_value = []
        mock_db.query.side_effect = [comp_query, entries_query]

        result = get_current_competition_leaderboard(mock_db, None)

        assert result["entries"] == []
        assert result["competition"]["id"] == 2


# ---------------------------------------------------------------------------
# TestGetAlgoTimeEndpoints — covers paginated + export endpoints
# ---------------------------------------------------------------------------

class TestGetAlgoTimeEndpoints:

    def _make_algo_entry(self, user_id: int, score: int, series_id: int = 1, last_updated=None):
        entry = Mock()
        entry.algotime_leaderboard_entry_id = user_id * 10
        entry.algotime_series_id = series_id
        entry.user_id = user_id
        entry.name = f"User {user_id}"
        entry.total_score = score
        entry.problems_solved = score // 20
        entry.total_time = score * 5
        entry.calculated_rank = None
        entry.last_updated = last_updated or datetime(2025, 4, 1, tzinfo=timezone.utc)
        entry.user_account = make_user_account(f"First{user_id}", f"Last{user_id}")
        return entry

    # --- Paginated endpoint: get_algotime_leaderboard ---

    def test_paginated_response_envelope(self, mock_db):
        """get_algotime_leaderboard wraps entries in a pagination envelope."""
        entries = [self._make_algo_entry(i, (5 - i) * 100) for i in range(1, 4)]
        mock_db.query.return_value.all.return_value = entries

        result = get_algotime_leaderboard(mock_db, **_ALGOTIME_DEFAULTS)

        assert "total" in result
        assert "page" in result
        assert "page_size" in result
        assert "entries" in result
        assert result["total"] == 3
        assert result["page"] == 1

    def test_paginated_entry_shape(self, mock_db):
        """All expected fields are present in a paginated entry."""
        entry = self._make_algo_entry(1, 100, series_id=7,
                                       last_updated=datetime(2025, 5, 20, tzinfo=timezone.utc))
        mock_db.query.return_value.all.return_value = [entry]

        result = get_algotime_leaderboard(mock_db, **_ALGOTIME_DEFAULTS)
        row = result["entries"][0]

        assert set(row.keys()) == {
            "entryId", "algoTimeSeriesId", "name", "userId",
            "totalScore", "problemsSolved", "totalTime", "rank", "lastUpdated"
        }
        assert row["entryId"] == 10
        assert row["algoTimeSeriesId"] == 7
        assert row["name"] == "First1 Last1"
        assert row["userId"] == 1
        assert row["totalScore"] == 100

    def test_paginated_entries_sorted_by_score_descending(self, mock_db):
        entries = [self._make_algo_entry(i, i * 50) for i in range(1, 6)]
        mock_db.query.return_value.all.return_value = entries

        result = get_algotime_leaderboard(mock_db, **_ALGOTIME_DEFAULTS)

        scores = [r["totalScore"] for r in result["entries"]]
        assert scores == sorted(scores, reverse=True)

    def test_paginated_rank_values_correct_for_unique_scores(self, mock_db):
        entries = [self._make_algo_entry(i, (5 - i) * 100) for i in range(1, 6)]
        mock_db.query.return_value.all.return_value = entries

        result = get_algotime_leaderboard(mock_db, **_ALGOTIME_DEFAULTS)

        assert [r["rank"] for r in result["entries"]] == [1, 2, 3, 4, 5]

    def test_paginated_search_filters_by_name(self, mock_db):
        """search param filters entries by name before slicing."""
        e1 = self._make_algo_entry(1, 300)
        e1.user_account = make_user_account("Alice", "Smith")
        e2 = self._make_algo_entry(2, 200)
        e2.user_account = make_user_account("Bob", "Jones")
        mock_db.query.return_value.all.return_value = [e1, e2]

        result = get_algotime_leaderboard(mock_db, search="Alice", page=1, page_size=15)

        assert result["total"] == 1
        assert result["entries"][0]["name"] == "Alice Smith"

    def test_paginated_page_slicing(self, mock_db):
        """page and page_size params control which slice is returned."""
        entries = [self._make_algo_entry(i, 100 - i) for i in range(1, 21)]
        mock_db.query.return_value.all.return_value = entries

        # Page 2 with page_size=5 → entries at index 5-9 (ranks 6-10)
        result = get_algotime_leaderboard(mock_db, search=None, page=2, page_size=5)

        assert result["page"] == 2
        assert result["page_size"] == 5
        assert result["total"] == 20
        assert len(result["entries"]) == 5
        assert result["entries"][0]["rank"] == 6

    def test_paginated_last_page_partial(self, mock_db):
        """Last page returns fewer items when total is not a multiple of page_size."""
        entries = [self._make_algo_entry(i, 100 - i) for i in range(1, 13)]
        mock_db.query.return_value.all.return_value = entries

        result = get_algotime_leaderboard(mock_db, search=None, page=2, page_size=10)

        assert len(result["entries"]) == 2

    def test_paginated_algotime_series_id_preserved(self, mock_db):
        entry = self._make_algo_entry(1, 50, series_id=99)
        mock_db.query.return_value.all.return_value = [entry]

        result = get_algotime_leaderboard(mock_db, **_ALGOTIME_DEFAULTS)

        assert result["entries"][0]["algoTimeSeriesId"] == 99

    def test_paginated_last_updated_is_iso_string(self, mock_db):
        ts = datetime(2025, 12, 31, 23, 59, 59, tzinfo=timezone.utc)
        entry = self._make_algo_entry(1, 10, last_updated=ts)
        mock_db.query.return_value.all.return_value = [entry]

        result = get_algotime_leaderboard(mock_db, **_ALGOTIME_DEFAULTS)

        assert result["entries"][0]["lastUpdated"] == ts.isoformat()

    def test_paginated_fallback_name_when_no_user_account(self, mock_db):
        entry = self._make_algo_entry(3, 75)
        entry.user_account = None
        entry.name = "Legacy Player"
        mock_db.query.return_value.all.return_value = [entry]

        result = get_algotime_leaderboard(mock_db, **_ALGOTIME_DEFAULTS)

        assert result["entries"][0]["name"] == "Legacy Player"

    # --- Export endpoint: get_all_algotime_entries_export ---

    def test_export_response_is_flat_list(self, mock_db):
        """get_all_algotime_entries_export returns a flat list, not a paginated envelope."""
        entries = [self._make_algo_entry(i, (5 - i) * 100) for i in range(1, 4)]
        mock_db.query.return_value.all.return_value = entries

        result = get_all_algotime_entries_export(mock_db)

        assert isinstance(result, list)
        assert len(result) == 3

    def test_export_response_shape(self, mock_db):
        """Export entries contain the fields needed for copy/download — no seriesId or lastUpdated."""
        entry = self._make_algo_entry(1, 200, series_id=5)
        mock_db.query.return_value.all.return_value = [entry]

        result = get_all_algotime_entries_export(mock_db)
        row = result[0]

        assert set(row.keys()) == {"entryId", "name", "userId", "totalScore", "problemsSolved", "totalTime", "rank"}

    def test_export_returns_all_entries_sorted_by_rank(self, mock_db):
        """Export must include all entries in rank order."""
        entries = [self._make_algo_entry(i, i * 50) for i in range(1, 6)]
        mock_db.query.return_value.all.return_value = entries

        result = get_all_algotime_entries_export(mock_db)

        scores = [r["totalScore"] for r in result]
        assert scores == sorted(scores, reverse=True)
        assert len(result) == 5

    def test_export_tied_scores_share_rank(self, mock_db):
        e1 = self._make_algo_entry(1, 200)
        e2 = self._make_algo_entry(2, 200)
        e3 = self._make_algo_entry(3, 100)
        mock_db.query.return_value.all.return_value = [e1, e2, e3]

        result = get_all_algotime_entries_export(mock_db)

        ranks = [r["rank"] for r in result]
        assert ranks[0] == 1
        assert ranks[1] == 1
        assert ranks[2] == 3

    def test_export_fallback_name_when_no_user_account(self, mock_db):
        entry = self._make_algo_entry(3, 75)
        entry.user_account = None
        entry.name = "Legacy Player"
        mock_db.query.return_value.all.return_value = [entry]

        result = get_all_algotime_entries_export(mock_db)

        assert result[0]["name"] == "Legacy Player"

    def test_export_database_error_raises_500(self, mock_db):
        mock_db.query.side_effect = Exception("DB down")

        with pytest.raises(HTTPException) as exc_info:
            get_all_algotime_entries_export(mock_db)

        assert exc_info.value.status_code == 500
        assert "Failed to export" in exc_info.value.detail