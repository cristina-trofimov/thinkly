"""
algotime_cleanup.py

Background service that automatically purges QuestionInstance rows (and their
cascaded children: UserQuestionInstance, Submission, MostRecentSubmission) for
AlgoTime sessions whose event_end_date has passed.

Leaderboard entries (AlgoTimeLeaderboardEntry) are intentionally left intact
as they are cumulative across sessions and are only reset manually via the
DELETE /leaderboards/algotime/reset endpoint at end of semester.

Scheduled to run every hour from main.py.
Similar to competition_cleanup.py
"""
import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from database_operations.database import get_db
from models.schema import BaseEvent, AlgoTimeSession, QuestionInstance

logger = logging.getLogger(__name__)


def cleanup_ended_algotime_sessions() -> None:
    """
    Finds all AlgoTime sessions that have ended and deletes their QuestionInstance rows.

    Cascade chain (defined in schema.py ForeignKeys):
        QuestionInstance (deleted here)
            └── UserQuestionInstance     ON DELETE CASCADE
                    ├── Submission            ON DELETE CASCADE
                    └── MostRecentSubmission  ON DELETE CASCADE

    Safe to run repeatedly — if a session was already cleaned up, the query
    returns no rows and nothing happens.
    """
    db: Session = next(get_db())

    try:
        now = datetime.now(timezone.utc)

        ended_event_ids: list[int] = (
            db.query(BaseEvent.event_id)
            .join(AlgoTimeSession, AlgoTimeSession.event_id == BaseEvent.event_id)
            .filter(BaseEvent.event_end_date < now)
            .all()
        )

        if not ended_event_ids:
            logger.debug("AlgoTime cleanup: no ended sessions found.")
            return

        ended_event_ids = [row.event_id for row in ended_event_ids]

        instances_to_delete = (
            db.query(QuestionInstance)
            .filter(QuestionInstance.event_id.in_(ended_event_ids))
            .count()
        )

        if instances_to_delete == 0:
            logger.debug(
                "AlgoTime cleanup: ended sessions found %s, "
                "but QuestionInstances already cleaned up.",
                ended_event_ids,
            )
            return

        deleted = (
            db.query(QuestionInstance)
            .filter(QuestionInstance.event_id.in_(ended_event_ids))
            .delete(synchronize_session=False)
        )

        db.commit()

        logger.info(
            "AlgoTime cleanup: deleted %d QuestionInstance row(s) "
            "across event_ids %s. Cascaded children (UserQuestionInstance, "
            "Submission, MostRecentSubmission) removed by DB.",
            deleted,
            ended_event_ids,
        )

    except SQLAlchemyError as e:
        db.rollback()
        logger.error("AlgoTime cleanup: database error during cleanup: %s", e)
    except Exception as e:
        db.rollback()
        logger.error("AlgoTime cleanup: unexpected error: %s", e)
    finally:
        db.close()