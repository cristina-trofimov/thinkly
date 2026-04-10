from types import SimpleNamespace
from unittest.mock import MagicMock, patch
import pytest
import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

from src.services.long_term_statistics_upsert import (
    upsert_long_term_stats_for_event,
    upsert_long_term_stats_for_events,
)


def test_upsert_long_term_stats_for_event_inserts_new_rows():
    db = MagicMock()
    stats_query = MagicMock()
    existing_query = MagicMock()
    db.query.side_effect = [stats_query, existing_query]

    stats_query.join.return_value.join.return_value.filter.return_value.group_by.return_value.all.return_value = [
        SimpleNamespace(difficulty="easy", num_solves=3, avg_solve_time=42.5)
    ]
    existing_query.filter.return_value.one_or_none.return_value = None

    upserted = upsert_long_term_stats_for_event(db, 10)

    assert upserted == 1
    assert db.add.call_count == 1



def test_upsert_long_term_stats_for_event_updates_existing_rows():
    db = MagicMock()
    stats_query = MagicMock()
    existing_query = MagicMock()
    existing_row = SimpleNamespace(average_question_solve_time=0.0, number_solves=0)
    db.query.side_effect = [stats_query, existing_query]

    stats_query.join.return_value.join.return_value.filter.return_value.group_by.return_value.all.return_value = [
        SimpleNamespace(difficulty="hard", num_solves=7, avg_solve_time=15.25)
    ]
    existing_query.filter.return_value.one_or_none.return_value = existing_row

    upserted = upsert_long_term_stats_for_event(db, 11)

    assert upserted == 1
    db.add.assert_not_called()
    assert existing_row.average_question_solve_time == pytest.approx(15.25)
    assert existing_row.number_solves == 7



def test_upsert_long_term_stats_for_event_skips_incomplete_rows():
    db = MagicMock()
    stats_query = MagicMock()
    db.query.return_value = stats_query

    stats_query.join.return_value.join.return_value.filter.return_value.group_by.return_value.all.return_value = [
        SimpleNamespace(difficulty=None, num_solves=1, avg_solve_time=2.0),
        SimpleNamespace(difficulty="medium", num_solves=None, avg_solve_time=2.0),
        SimpleNamespace(difficulty="easy", num_solves=3, avg_solve_time=None),
    ]

    upserted = upsert_long_term_stats_for_event(db, 12)

    assert upserted == 0
    db.add.assert_not_called()



def test_upsert_long_term_stats_for_events_sums_per_event_upserts():
    db = MagicMock()

    with patch("src.services.long_term_statistics_upsert.upsert_long_term_stats_for_event") as mock_upsert:
        mock_upsert.side_effect = [1, 0, 3]
        total = upsert_long_term_stats_for_events(db, [1, 2, 3])

    assert total == 4
    assert mock_upsert.call_count == 3
