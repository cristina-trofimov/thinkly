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

from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from database_operations.database import get_db
from models.schema import BaseEvent, Competition, LongTermStatistics, Question, QuestionInstance, UserQuestionInstance

logger = logging.getLogger(__name__)


def _upsert_competition_long_term_stats(db: Session, competition_id: int) -> int:
    """Upsert per-difficulty solved counts and average solve time for one competition."""
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
            QuestionInstance.event_id == competition_id,
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
                LongTermStatistics.event_id == competition_id,
                LongTermStatistics.difficulty == difficulty,
            )
            .one_or_none()
        )

        if existing is None:
            db.add(
                LongTermStatistics(
                    event_id=competition_id,
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


def _populate_long_term_stats_for_competitions(db: Session, competition_ids: list[int]) -> int:
    total_upserts = 0
    for competition_id in competition_ids:
        total_upserts += _upsert_competition_long_term_stats(db, competition_id)
    return total_upserts


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

        upserted_stats = _populate_long_term_stats_for_competitions(db, ended_event_ids)

        # Count before deletion for logging
        instances_to_delete = (
            db.query(QuestionInstance)
            .filter(QuestionInstance.event_id.in_(ended_event_ids))
            .count()
        )

        if instances_to_delete == 0:
            if upserted_stats > 0:
                db.commit()
            logger.debug(
                "Competition cleanup: ended competitions found %s, "
                "but QuestionInstances already cleaned up. Upserted %d long-term stat row(s).",
                ended_event_ids,
                upserted_stats,
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
            "Submission, MostRecentSubmission) removed by DB. Upserted %d "
            "long-term stat row(s).",
            deleted,
            ended_event_ids,
            upserted_stats,
        )

    except SQLAlchemyError as e:
        db.rollback()
        logger.error("Competition cleanup: database error during cleanup: %s", e)
    except Exception as e:
        db.rollback()
        logger.error("Competition cleanup: unexpected error: %s", e)
    finally:
        db.close()