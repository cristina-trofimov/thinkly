from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from models.schema import AlgotimeSession,AlgotimeSeries,BaseEvent, QuestionInstance, Question
from DB_Methods.database import get_db
from endpoints.authentification_api import get_current_user, role_required
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, validator
from typing import List
import logging

logger = logging.getLogger(__name__)
algotime_router = APIRouter(tags=["Algotime"])

# ---------------- Models ----------------
class CreateAlgotimeSessionRequest(BaseModel):
    name: str
    date: str  # YYYY-MM-DD
    startTime: str  # HH:MM
    endTime: str  # HH:MM
    selectedQuestions: List[int]

    @validator('selectedQuestions')
    def validate_questions(cls, v):
        if not v or len(v) == 0:
            raise ValueError('At least one question must be selected')
        return v

class CreateAlgoTimeRequest(BaseModel):
    seriesName: str
    questionCooldown: int = 300
    sessions: List[CreateAlgotimeSessionRequest]

    @validator("sessions")
    def validate_sessions(cls, v):
        if not v:
            raise ValueError("At least one session is required")
        return v

    @validator('questionCooldown')
    def validate_cooldown(cls, v):
        if v < 0:
            raise ValueError('Cooldown time cannot be negative')
        return v

#------Functions to help 
def validate_questions_exist(db: Session, question_ids: List[int]):
    count = (
        db.query(Question)
        .filter(Question.question_id.in_(question_ids))
        .count()
    )
    
    if count != len(set(question_ids)):
        logger.error(f"Selected question does not exist")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more questions do not exist"
        )

def parse_datetime_from_request(date_str: str, time_str: str) -> datetime:

    try:
        dt_str = f"{date_str}T{time_str}:00"
        dt = datetime.fromisoformat(dt_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except ValueError as e:
        logger.error(f"Invalid date/time format: {date_str} {time_str}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid date or time format: {str(e)}"
        )

def validate_competition_times(start_dt: datetime, end_dt: datetime):

    if end_dt <= start_dt:
        logger.error(f"Invalid competition time. Start time:{start_dt} is later than end time: {end_dt}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Competition end time must be after start time"
        )

# ---------------ROUTES----------------
@algotime_router.post("/create", status_code=status.HTTP_201_CREATED)
def create_algotime(
    request: CreateAlgoTimeRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(role_required("admin"))
):
    logger.info(f"Creating AlgoTime series '{request.seriesName}'")

    try:
        # Create AlgoTime series
        series = AlgotimeSeries(
            algotime_series_name=request.seriesName
        )
        db.add(series)
        db.flush()  # get algotime_series_id

        # Create sessions
        for session in request.sessions:
            start_dt = parse_datetime_from_request(
                session.date,
                session.startTime
            )
            end_dt = parse_datetime_from_request(
                session.date,
                session.endTime
            )

            validate_competition_times(start_dt, end_dt)

            base_event = BaseEvent(
                event_name=f"{request.seriesName} - Session {session.name}",
                question_cooldown=request.questionCooldown,
                event_start_date=start_dt,
                event_end_date=end_dt,
            )
            db.add(base_event)
            db.flush()  # get event_id

            algotime_session = AlgotimeSession(
                event_id=base_event.event_id,
                algotime_series_id=series.algotime_series_id
            )
            db.add(algotime_session)

            # Attach questions
            for question_id in session.selectedQuestions:
                qi = QuestionInstance(
                    event_id=base_event.event_id,
                    question_id=question_id,
                    points=0
                )
                db.add(qi)

        db.commit()

        logger.info(
            f"AlgoTime '{series.algotime_series_name}' created "
            f"with {len(request.sessions)} session(s)"
        )

        return {
            "series_id": series.algotime_series_id,
            "series_name": series.algotime_series_name,
            "session_count": len(request.sessions)
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.exception("Failed to create AlgoTime")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create AlgoTime"
        )