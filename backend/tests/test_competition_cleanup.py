from unittest.mock import MagicMock, patch
from sqlalchemy.exc import SQLAlchemyError
import sys
import os

current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)


class TestCompetitionCleanup:
    """
    Unit tests for services/competition_cleanup.py → cleanup_ended_competitions().

    The function:
      1. Opens its own DB session via next(get_db())
      2. Queries BaseEvent ⋈ Competition where event_end_date < now
      3. If none found  → returns early
      4. Counts matching QuestionInstances
      5. If count == 0  → returns early (already cleaned)
      6. Bulk-deletes them (DB cascade removes UQI / Submission / MostRecentSub)
      7. Commits and logs
      On any error → rollback + log, never re-raises
    """

    # ── helpers ───────────────────────────────────────────────────────────────

    @staticmethod
    def _make_event_row(event_id: int):
        row = MagicMock()
        row.event_id = event_id
        return row

    @staticmethod
    def _setup_db(mock_db, ended_rows, qi_count, deleted=None):
        """Wire up the mock DB query chain for a standard test."""
        # ended_event_ids query: .join().filter().all()
        mock_db.query.return_value.join.return_value \
               .filter.return_value.all.return_value = ended_rows

        # QI count query: .filter().count()
        mock_db.query.return_value.filter.return_value \
               .count.return_value = qi_count

        # QI delete query: .filter().delete()
        mock_db.query.return_value.filter.return_value \
               .delete.return_value = deleted if deleted is not None else qi_count

    # ── tests ─────────────────────────────────────────────────────────────────

    @patch("src.services.competition_cleanup.get_db")
    def test_no_ended_competitions_returns_early(self, mock_get_db):
        """When no competitions have ended, nothing is queried further."""
        mock_db = MagicMock()
        mock_get_db.return_value = iter([mock_db])

        mock_db.query.return_value.join.return_value \
               .filter.return_value.all.return_value = []

        from src.services.competition_cleanup import cleanup_ended_competitions
        cleanup_ended_competitions()

        mock_db.commit.assert_not_called()
        mock_db.rollback.assert_not_called()
        mock_db.close.assert_called_once()

    @patch("src.services.competition_cleanup.get_db")
    def test_already_cleaned_skips_delete(self, mock_get_db):
        """Ended competitions found but QuestionInstances already deleted → no-op."""
        mock_db = MagicMock()
        mock_get_db.return_value = iter([mock_db])

        ended_rows = [self._make_event_row(42)]
        self._setup_db(mock_db, ended_rows, qi_count=0)

        from src.services.competition_cleanup import cleanup_ended_competitions
        cleanup_ended_competitions()

        mock_db.commit.assert_not_called()
        mock_db.close.assert_called_once()

    @patch("src.services.competition_cleanup.get_db")
    def test_deletes_question_instances_single_competition(self, mock_get_db):
        """Happy path: deletes QIs and commits for a single ended competition."""
        mock_db = MagicMock()
        mock_get_db.return_value = iter([mock_db])

        ended_rows = [self._make_event_row(7)]
        self._setup_db(mock_db, ended_rows, qi_count=3, deleted=3)

        from src.services.competition_cleanup import cleanup_ended_competitions
        cleanup_ended_competitions()

        mock_db.commit.assert_called_once()
        mock_db.rollback.assert_not_called()
        mock_db.close.assert_called_once()

    @patch("src.services.competition_cleanup.get_db")
    def test_deletes_across_multiple_ended_competitions(self, mock_get_db):
        """Happy path: multiple ended competitions, all QIs deleted in one pass."""
        mock_db = MagicMock()
        mock_get_db.return_value = iter([mock_db])

        ended_rows = [self._make_event_row(1), self._make_event_row(2), self._make_event_row(3)]
        self._setup_db(mock_db, ended_rows, qi_count=9, deleted=9)

        from src.services.competition_cleanup import cleanup_ended_competitions
        cleanup_ended_competitions()

        mock_db.commit.assert_called_once()
        mock_db.close.assert_called_once()

    @patch("src.services.competition_cleanup.get_db")
    def test_sqlalchemy_error_triggers_rollback(self, mock_get_db):
        """A SQLAlchemyError during delete must rollback and not re-raise."""
        mock_db = MagicMock()
        mock_get_db.return_value = iter([mock_db])

        ended_rows = [self._make_event_row(5)]
        mock_db.query.return_value.join.return_value \
               .filter.return_value.all.return_value = ended_rows
        mock_db.query.return_value.filter.return_value \
               .count.return_value = 2
        mock_db.query.return_value.filter.return_value \
               .delete.side_effect = SQLAlchemyError("connection lost")

        from src.services.competition_cleanup import cleanup_ended_competitions
        cleanup_ended_competitions()  # must NOT raise

        mock_db.rollback.assert_called_once()
        mock_db.commit.assert_not_called()
        mock_db.close.assert_called_once()

    @patch("src.services.competition_cleanup.get_db")
    def test_unexpected_error_triggers_rollback(self, mock_get_db):
        """Any unexpected exception must rollback and not propagate."""
        mock_db = MagicMock()
        mock_get_db.return_value = iter([mock_db])

        mock_db.query.return_value.join.return_value \
               .filter.return_value.all.side_effect = RuntimeError("unexpected")

        from src.services.competition_cleanup import cleanup_ended_competitions
        cleanup_ended_competitions()  # must NOT raise

        mock_db.rollback.assert_called_once()
        mock_db.commit.assert_not_called()
        mock_db.close.assert_called_once()

    @patch("src.services.competition_cleanup.get_db")
    def test_db_always_closed_on_success(self, mock_get_db):
        """Session is closed in the finally block even on the happy path."""
        mock_db = MagicMock()
        mock_get_db.return_value = iter([mock_db])

        ended_rows = [self._make_event_row(99)]
        self._setup_db(mock_db, ended_rows, qi_count=1, deleted=1)

        from src.services.competition_cleanup import cleanup_ended_competitions
        cleanup_ended_competitions()

        mock_db.close.assert_called_once()

    @patch("src.services.competition_cleanup.get_db")
    def test_db_always_closed_on_error(self, mock_get_db):
        """Session is closed in the finally block even after an error."""
        mock_db = MagicMock()
        mock_get_db.return_value = iter([mock_db])

        mock_db.query.side_effect = Exception("fatal")

        from src.services.competition_cleanup import cleanup_ended_competitions
        cleanup_ended_competitions()

        mock_db.close.assert_called_once()