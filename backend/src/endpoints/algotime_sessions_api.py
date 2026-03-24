from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from models.schema import AlgoTimeSession, AlgoTimeSeries, BaseEvent, QuestionInstance, Question
from database_operations.database import get_db
from datetime import datetime, timezone
from pydantic import BaseModel, validator
from typing import Annotated, List, Optional
import logging
from services.posthog_analytics import track_custom_event
from endpoints.authentification_api import get_current_user
from zoneinfo import ZoneInfo
logger = logging.getLogger(__name__)
algotime_router = APIRouter(tags=["Algotime"])
LOCAL_TZ = ZoneInfo("America/Toronto") 
SESSION_NOT_FOUND = "AlgoTime session not found"


# ---------------- Models ----------------
class CreateAlgotimeSessionRequest(BaseModel):
    name: str
    date: str  # YYYY-MM-DD
    startTime: str  # HH:MM
    endTime: str  # HH:MM
    selectedQuestions: List[int]
    location: Optional[str] = None

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


class AlgoTimeQuestionResponse(BaseModel):
    questionId: int
    questionName: str
    questionDescription: str
    difficulty: str
    tags: List[str]


class AlgoTimeSessionResponse(BaseModel):
    id: int
    eventID: int
    eventName: str
    startTime: str
    endTime: str
    questionCooldown: int
    location: Optional[str] = None
    seriesId: Optional[int] = None
    seriesName: Optional[str] = None
    questions: List[AlgoTimeQuestionResponse]

class DetailedAlgoTimeSessionResponse(BaseModel):
    """Response model for editing algotime sessions - includes all necessary details"""
    id: int
    sessionName: str
    date: str
    startTime: str
    endTime: str
    questionCooldown: int
    selectedQuestions: List[int]
    seriesId: Optional[int] = None
    seriesName: Optional[str] = None

    class Config:
        from_attributes = True

# ------Functions to help
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
        dt_naive = datetime.fromisoformat(f"{date_str}T{time_str}:00")
        dt_local = dt_naive.replace(tzinfo=LOCAL_TZ)
        dt_utc = dt_local.astimezone(timezone.utc)
        return dt_utc
    except ValueError :
        logger.error(f"Invalid date/time format: {date_str} {time_str}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date or time format."
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
        db: Annotated[Session, Depends(get_db)],
        current_user: Annotated[dict, Depends(get_current_user)]
):
    logger.info("Creating AlgoTime series")

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

            event_name = session.name

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
                event_name=session.name,
                event_location=session.location if hasattr(session, 'location') else None,
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
                )
                db.add(qi)

        db.commit()

        logger.info(
            f"AlgoTime '{series.algotime_series_name}' created "
            f"with {len(request.sessions)} session(s)"
        )

        # Track AlgoTime series creation
        track_custom_event(
            user_id=str(current_user.get("id")),
            event_name="algotime_series_created",
            properties={
                "series_id": series.algotime_series_id,
                "series_name": series.algotime_series_name,
                "session_count": len(request.sessions),
                "question_cooldown": request.questionCooldown,
                "total_questions": sum(len(s.selectedQuestions) for s in request.sessions),
                "user_email": current_user.get("sub"),
            }
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


@algotime_router.get("/", response_model=List[AlgoTimeSessionResponse])
def get_all_algotime_sessions(db: Annotated[Session, Depends(get_db)]):
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
                    "questionId": qi.question.question_id,
                    "questionName": qi.question.question_name,
                    "questionDescription": qi.question.question_description,
                    "difficulty": qi.question.difficulty,
                    "tags": [tag.tag_name for tag in qi.question.tags],
                }
                for qi in question_instances
            ]

            response.append({
                "id": s.event_id,
                "eventID": event.event_id,
                "eventName": event.event_name,
                "startTime": str(event.event_start_date),
                "endTime": str(event.event_end_date),
                "questionCooldown": event.question_cooldown,
                "seriesId": s.algotime_series.algotime_series_id
                if s.algotime_series else None,
                "seriesName": s.algotime_series.algotime_series_name
                if s.algotime_series else None,
                "questions": questions,
            })
        return response

    except Exception as e:
        logger.error(f"Error fetching AlgoTime sessions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve AlgoTime sessions."
        )

@algotime_router.get("/{session_id}", response_model=AlgoTimeSessionResponse)
def get_algotime_session(
    session_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)]
):
    logger.info(f"User {current_user.get('sub')} requested AlgoTime session {session_id}")

    session = db.query(AlgoTimeSession).filter(
        AlgoTimeSession.event_id == session_id
    ).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=SESSION_NOT_FOUND
        )

    event = session.base_event

    question_instances = db.query(QuestionInstance).filter(
        QuestionInstance.event_id == session_id
    ).all()

    questions = [
        AlgoTimeQuestionResponse(
            questionId=qi.question.question_id,
            questionName=qi.question.question_name,
            questionDescription=qi.question.question_description,
            difficulty=qi.question.difficulty,
            tags=[tag.tag_name for tag in qi.question.tags]
        )
        for qi in question_instances
    ]

    logger.info(f"AlgoTime session {session_id} fetched successfully")

    return AlgoTimeSessionResponse(
        id=session_id,
        eventID=event.event_id,
        eventName=event.event_name,
        startTime=str(event.event_start_date),
        endTime=str(event.event_end_date),
        questionCooldown=event.question_cooldown,
        location=event.event_location,
        seriesId=session.algotime_series_id,
        seriesName=(
            session.algotime_series.algotime_series_name
            if session.algotime_series else None
        ),
        questions=questions
    )

@algotime_router.put("/{session_id}", response_model=AlgoTimeSessionResponse)
def update_algotime_session(
    session_id: int,
    request: CreateAlgotimeSessionRequest,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)]
):
    logger.info(f"User {current_user.get('sub')} updating AlgoTime session {session_id}")

    session = db.query(AlgoTimeSession).filter(
        AlgoTimeSession.event_id == session_id
    ).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=SESSION_NOT_FOUND
        )

    event = session.base_event

    start_dt = parse_datetime_from_request(request.date, request.startTime)
    end_dt = parse_datetime_from_request(request.date, request.endTime)
    validate_competition_times(start_dt, end_dt)

    event.event_name = request.name
    event.event_location = request.location
    event.event_start_date = start_dt
    event.event_end_date = end_dt

    db.query(QuestionInstance).filter(
        QuestionInstance.event_id == session_id
    ).delete(synchronize_session=False)

    for question_id in request.selectedQuestions:
        qi = QuestionInstance(
            event_id=session_id,
            question_id=question_id
        )
        db.add(qi)

    db.commit()
    db.refresh(event)

    question_instances = db.query(QuestionInstance).filter(
        QuestionInstance.event_id == session_id
    ).all()

    questions = [
        AlgoTimeQuestionResponse(
            questionId=qi.question.question_id,
            questionName=qi.question.question_name,
            questionDescription=qi.question.question_description,
            difficulty=qi.question.difficulty,
            tags=[tag.tag_name for tag in qi.question.tags],
        )
        for qi in question_instances
    ]

    logger.info(f"AlgoTime session {session_id} updated successfully")

    return AlgoTimeSessionResponse(
        id=session_id,
        eventID=event.event_id,
        eventName=event.event_name,
        startTime=str(event.event_start_date),
        endTime=str(event.event_end_date),
        questionCooldown=event.question_cooldown,
        seriesId=session.algotime_series_id,
        seriesName=(
            session.algotime_series.algotime_series_name
            if session.algotime_series else None
        ),
        questions=questions
    )

@algotime_router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_algotime_session(
    session_id: int,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[dict, Depends(get_current_user)]
):
    user_email = current_user.get("sub") or "unknown"
    logger.info(f"User '{user_email}' attempting to delete AlgoTime session {session_id}")

    try:
        # Fetch the AlgoTimeSession first (not BaseEvent) so we have series info
        algotime_session = db.query(AlgoTimeSession).filter(
            AlgoTimeSession.event_id == session_id
        ).first()

        if not algotime_session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=SESSION_NOT_FOUND
            )

        base_event = db.query(BaseEvent).filter(
            BaseEvent.event_id == session_id
        ).first()

        if not base_event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="AlgoTime session event not found"
            )

        session_name = base_event.event_name
        series_id = algotime_session.algotime_series_id

        # 1. Delete question instances
        db.query(QuestionInstance).filter(
            QuestionInstance.event_id == session_id
        ).delete(synchronize_session=False)

        # 2. Delete AlgoTimeSession first, flush before touching BaseEvent
        db.delete(algotime_session)
        db.flush()

        # 3. Delete BaseEvent
        db.delete(base_event)
        db.flush()

        # 4. Check if series is now empty and clean it up if so
        if series_id:
            remaining = db.query(AlgoTimeSession).filter(
                AlgoTimeSession.algotime_series_id == series_id
            ).count()

            if remaining == 0:
                db.query(AlgoTimeSeries).filter(
                    AlgoTimeSeries.algotime_series_id == series_id
                ).delete(synchronize_session=False)
                logger.info(f"Series {series_id} had no remaining sessions, deleted it too")

        db.commit()

        logger.info(f"SUCCESSFUL DELETION: AlgoTime session '{session_name}' (ID: {session_id}) deleted by '{user_email}'")

        track_custom_event(
            user_id=str(current_user.get("id", "unknown")),
            event_name="algotime_session_deleted",
            properties={
                "session_id": session_id,
                "session_name": session_name,
                "user_email": user_email,
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error deleting AlgoTime session {session_id}: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete AlgoTime session: {str(e)}"
        )

