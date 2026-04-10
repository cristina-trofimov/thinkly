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

from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from database_operations.database import get_db
from models.schema import (
    AlgoTimeSession,
    BaseEvent,
    LongTermStatistics,
    Question,
    QuestionInstance,
    UserQuestionInstance,
)

logger = logging.getLogger(__name__)


def _upsert_algotime_long_term_stats(db: Session, session_id: int) -> int:
    """Upsert per-difficulty solved counts and average solve time for one AlgoTime session."""
    stats_rows = (
        db.query(
            Question.difficulty.label("difficulty"),
            func.count(UserQuestionInstance.user_question_instance_id).label("num_solves"),
            func.avg(UserQuestionInstance.lapse_time).label("avg_solve_time"),
        )
        .join(QuestionInstance, Question.question_id == QuestionInstance.question_id)
        .join(
            UserQuestionInstance,
            QuestionInstance.question_instance_id == UserQuestionInstance.question_instance_id,
        )
        .filter(
            QuestionInstance.event_id == session_id,
            UserQuestionInstance.points.is_not(None),
            UserQuestionInstance.points > 0,
            UserQuestionInstance.lapse_time.is_not(None),
        )
        .group_by(Question.difficulty)
        .all()
    )

    upserted = 0
    for row in stats_rows:
        difficulty = getattr(row, "difficulty", None)
        num_solves = getattr(row, "num_solves", None)
        avg_solve_time = getattr(row, "avg_solve_time", None)

        if difficulty is None or num_solves is None or avg_solve_time is None:
            continue

        existing = (
            db.query(LongTermStatistics)
            .filter(
                LongTermStatistics.event_id == session_id,
                LongTermStatistics.difficulty == difficulty,
            )
            .one_or_none()
        )

        if existing is None:
            db.add(
                LongTermStatistics(
                    event_id=session_id,
                    difficulty=difficulty,
                    average_question_solve_time=float(avg_solve_time),
                    number_solves=int(num_solves),
                )
            )
        else:
            existing.average_question_solve_time = float(avg_solve_time)
            existing.number_solves = int(num_solves)

        upserted += 1

    return upserted


def _populate_long_term_stats_for_algotime_sessions(db: Session, session_ids: list[int]) -> int:
    total_upserts = 0
    for session_id in session_ids:
        total_upserts += _upsert_algotime_long_term_stats(db, session_id)
    return total_upserts


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

        upserted_stats = _populate_long_term_stats_for_algotime_sessions(db, ended_event_ids)

        instances_to_delete = (
            db.query(QuestionInstance)
            .filter(QuestionInstance.event_id.in_(ended_event_ids))
            .count()
        )

        if instances_to_delete == 0:
            if upserted_stats > 0:
                db.commit()
            logger.debug(
                "AlgoTime cleanup: ended sessions found %s, "
                "but QuestionInstances already cleaned up. Upserted %d long-term stat row(s).",
                ended_event_ids,
                upserted_stats,
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
            "Submission, MostRecentSubmission) removed by DB. Upserted %d "
            "long-term stat row(s).",
            deleted,
            ended_event_ids,
            upserted_stats,
        )

    except SQLAlchemyError as e:
        db.rollback()
        logger.error("AlgoTime cleanup: database error during cleanup: %s", e)
    except Exception as e:
        db.rollback()
        logger.error("AlgoTime cleanup: unexpected error: %s", e)
    finally:
        db.close()