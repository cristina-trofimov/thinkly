from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from models.schema import AlgoTimeSession,AlgoTimeSeries,BaseEvent, QuestionInstance, Question
from DB_Methods.database import get_db
from endpoints.authentification_api import role_required
from datetime import datetime, timezone
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
        logger.error("Selected question does not exist")
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

def generate_unique_series_name(name: str) -> str:
    timestamp = datetime.now(timezone.utc).strftime("%H%M%S")
    return f"{name} · #{timestamp}"

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
        # To make it unique
        series_name = generate_unique_series_name(request.seriesName)

        existing_series = db.query(AlgoTimeSeries).filter(
            AlgoTimeSeries.algotime_series_name == series_name
        ).first()
        
        if existing_series:
            logger.warning(f"Series name '{series_name}' already exists")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A series with the name '{series_name}' already exists"
            )

        series = AlgoTimeSeries(
            algotime_series_name=series_name
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

            event_name = f"{request.seriesName} - {session.name}"
            
            # Check if event name already exists - throw 409
            existing_event = db.query(BaseEvent).filter(
                BaseEvent.event_name == event_name
            ).first()
            
            if existing_event:
                logger.warning(f"Event name '{event_name}' already exists")
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"A session with the name '{event_name}' already exists"
                )


            base_event = BaseEvent(
                event_name=f"{request.seriesName} - {session.name}",
                question_cooldown=request.questionCooldown,
                event_start_date=start_dt,
                event_end_date=end_dt,
            )
            db.add(base_event)
            db.flush()  # get event_id

            algotime_session = AlgoTimeSession(
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
    except Exception:
        db.rollback()
        logger.exception("Failed to create AlgoTime")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create AlgoTime"
        )

@algotime_router.get("/")
def get_all_algotime_sessions(db: Session = Depends(get_db)):
    try:
        sessions = db.query(AlgoTimeSession).all()
        logger.info(f"Fetched {len(sessions)} AlgoTime sessions.")

        response = []

        for s in sessions:
            event = s.base_event

            question_instances = (
                db.query(QuestionInstance)
                .filter(QuestionInstance.event_id == event.event_id)
                .all()
            )

            questions = [
                {
                    "question_id": qi.question.question_id,
                    "question_name": qi.question.question_name,
                    "question_description": qi.question.question_description,
                    "difficulty": qi.question.difficulty,
                    "tags": [tag.tag_name for tag in qi.question.tags],
                    "points": qi.points,
                }
                for qi in question_instances
            ]

            response.append({
                "id": s.event_id,
                "event_name": event.event_name,
                "start_date": event.event_start_date,
                "end_date": event.event_end_date,
                "question_cooldown": event.question_cooldown,
                "series_id": s.algotime_series.algotime_series_id
                    if s.algotime_series else None,
                "series_name": s.algotime_series.algotime_series_name
                    if s.algotime_series else None,
                "questions": questions,
            })
        return response
        
    except Exception as e:
        logger.error(f"Error fetching AlgoTime sessions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve AlgoTime sessions. Exception: {str(e)}"
        )