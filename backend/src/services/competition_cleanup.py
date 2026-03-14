"""
competition_cleanup.py

Background service that automatically purges QuestionInstance rows (and their
cascaded children: UserQuestionInstance, Submission, MostRecentSubmission) for
competitions whose event_end_date has passed.

Leaderboard entries (CompetitionLeaderboardEntry) are intentionally left intact
because they link directly to competition.event_id, not through QuestionInstance.

Scheduled to run every hour from main.py.
"""

import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from database_operations.database import get_db
from models.schema import BaseEvent, Competition, QuestionInstance

logger = logging.getLogger(__name__)


def cleanup_ended_competitions() -> None:
    """
    Finds all competitions that have ended and deletes their QuestionInstance rows.

    Cascade chain (defined in schema.py ForeignKeys):
        QuestionInstance (deleted here)
            └── UserQuestionInstance     ON DELETE CASCADE
                    ├── Submission            ON DELETE CASCADE
                    └── MostRecentSubmission  ON DELETE CASCADE

    Safe to run repeatedly — if a competition was already cleaned up, the query
    returns no rows and nothing happens.
    """
    db: Session = next(get_db())

    try:
        now = datetime.now(timezone.utc)

        # Find event_ids for competitions (not AlgoTime) that have ended
        ended_event_ids: list[int] = (
            db.query(BaseEvent.event_id)
            .join(Competition, Competition.event_id == BaseEvent.event_id)
            .filter(BaseEvent.event_end_date < now)
            .all()
        )

        if not ended_event_ids:
            logger.debug("Competition cleanup: no ended competitions found.")
            return

        ended_event_ids = [row.event_id for row in ended_event_ids]

        # Count before deletion for logging
        instances_to_delete = (
            db.query(QuestionInstance)
            .filter(QuestionInstance.event_id.in_(ended_event_ids))
            .count()
        )

        if instances_to_delete == 0:
            logger.debug(
                "Competition cleanup: ended competitions found %s, "
                "but QuestionInstances already cleaned up.",
                ended_event_ids,
            )
            return

        # Bulk delete — cascade handles UserQuestionInstance / Submission /
        # MostRecentSubmission automatically at the DB level.
        deleted = (
            db.query(QuestionInstance)
            .filter(QuestionInstance.event_id.in_(ended_event_ids))
            .delete(synchronize_session=False)
        )

        db.commit()

        logger.info(
            "Competition cleanup: deleted %d QuestionInstance row(s) "
            "across event_ids %s. Cascaded children (UserQuestionInstance, "
            "Submission, MostRecentSubmission) removed by DB.",
            deleted,
            ended_event_ids,
        )

    except SQLAlchemyError as e:
        db.rollback()
        logger.error("Competition cleanup: database error during cleanup: %s", e)
    except Exception as e:
        db.rollback()
        logger.error("Competition cleanup: unexpected error: %s", e)
    finally:
        db.close()