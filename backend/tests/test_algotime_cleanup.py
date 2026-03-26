import pytest
from unittest.mock import MagicMock, patch
from sqlalchemy.exc import SQLAlchemyError
import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)


class TestAlgoTimeCleanup:

    @staticmethod
    def _make_event_row(event_id: int):
        row = MagicMock()
        row.event_id = event_id
        return row

    @staticmethod
    def _setup_db(mock_db, ended_rows, qi_count, deleted=None):
        mock_db.query.return_value.join.return_value \
               .filter.return_value.all.return_value = ended_rows

        mock_db.query.return_value.filter.return_value \
               .count.return_value = qi_count

        mock_db.query.return_value.filter.return_value \
               .delete.return_value = deleted if deleted is not None else qi_count

    @patch("src.services.algotime_cleanup.get_db")
    def test_no_ended_sessions_returns_early(self, mock_get_db):
        mock_db = MagicMock()
        mock_get_db.return_value = iter([mock_db])

        mock_db.query.return_value.join.return_value \
               .filter.return_value.all.return_value = []

        from src.services.algotime_cleanup import cleanup_ended_algotime_sessions
        cleanup_ended_algotime_sessions()

        mock_db.commit.assert_not_called()
        mock_db.close.assert_called_once()

    @patch("src.services.algotime_cleanup.get_db")
    def test_already_cleaned_skips_delete(self, mock_get_db):
        mock_db = MagicMock()
        mock_get_db.return_value = iter([mock_db])

        ended_rows = [self._make_event_row(1)]
        self._setup_db(mock_db, ended_rows, qi_count=0)

        from src.services.algotime_cleanup import cleanup_ended_algotime_sessions
        cleanup_ended_algotime_sessions()

        mock_db.commit.assert_not_called()
        mock_db.close.assert_called_once()

    @patch("src.services.algotime_cleanup.get_db")
    def test_deletes_question_instances_and_commits(self, mock_get_db):
        mock_db = MagicMock()
        mock_get_db.return_value = iter([mock_db])

        ended_rows = [self._make_event_row(1)]
        self._setup_db(mock_db, ended_rows, qi_count=3, deleted=3)

        from src.services.algotime_cleanup import cleanup_ended_algotime_sessions
        cleanup_ended_algotime_sessions()

        mock_db.commit.assert_called_once()
        mock_db.rollback.assert_not_called()
        mock_db.close.assert_called_once()

    @patch("src.services.algotime_cleanup.get_db")
    def test_sqlalchemy_error_triggers_rollback(self, mock_get_db):
        mock_db = MagicMock()
        mock_get_db.return_value = iter([mock_db])

        ended_rows = [self._make_event_row(1)]
        mock_db.query.return_value.join.return_value \
               .filter.return_value.all.return_value = ended_rows
        mock_db.query.return_value.filter.return_value \
               .count.return_value = 2
        mock_db.query.return_value.filter.return_value \
               .delete.side_effect = SQLAlchemyError("connection lost")

        from src.services.algotime_cleanup import cleanup_ended_algotime_sessions
        cleanup_ended_algotime_sessions()

        mock_db.rollback.assert_called_once()
        mock_db.commit.assert_not_called()
        mock_db.close.assert_called_once()

    @patch("src.services.algotime_cleanup.get_db")
    def test_db_always_closed_on_error(self, mock_get_db):
        mock_db = MagicMock()
        mock_get_db.return_value = iter([mock_db])

        mock_db.query.side_effect = Exception("fatal")

        from src.services.algotime_cleanup import cleanup_ended_algotime_sessions
        cleanup_ended_algotime_sessions()

        mock_db.close.assert_called_once()