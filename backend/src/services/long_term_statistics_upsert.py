from sqlalchemy import func
from sqlalchemy.orm import Session

from models.schema import LongTermStatistics, Question, QuestionInstance, UserQuestionInstance


def upsert_long_term_stats_for_event(db: Session, event_id: int) -> int:
    """Upsert per-difficulty solved counts and average solve time for one event."""
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
            QuestionInstance.event_id == event_id,
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
                LongTermStatistics.event_id == event_id,
                LongTermStatistics.difficulty == difficulty,
            )
            .one_or_none()
        )

        if existing is None:
            db.add(
                LongTermStatistics(
                    event_id=event_id,
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


def upsert_long_term_stats_for_events(db: Session, event_ids: list[int]) -> int:
    total_upserts = 0
    for event_id in event_ids:
        total_upserts += upsert_long_term_stats_for_event(db, event_id)
    return total_upserts
