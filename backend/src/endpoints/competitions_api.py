from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from models.schema import Competition, BaseEvent, QuestionInstance, CompetitionEmail
from DB_Methods.database import get_db, _commit_or_rollback
from endpoints.authentification_api import get_current_user, role_required
import logging
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, validator
from typing import List, Optional

logger = logging.getLogger(__name__)
competitions_router = APIRouter(tags=["Competitions"])


# ---------------- Models ----------------
class EmailNotificationRequest(BaseModel):
    to: str  # Can be "all participants" or comma-separated emails
    subject: str
    text: str
    sendInOneMinute: bool = False
    sendAtLocal: Optional[str] = None

    @validator('sendAtLocal')
    def validate_send_at_local(cls, v):
        if v:
            try:
                datetime.fromisoformat(v.replace('Z', '+00:00'))
            except ValueError:
                raise ValueError('sendAtLocal must be a valid ISO format datetime')
        return v


class CreateCompetitionRequest(BaseModel):
    name: str
    date: str  # YYYY-MM-DD
    startTime: str  # HH:MM
    endTime: str  # HH:MM
    location: Optional[str] = None
    questionCooldownTime: int = 300
    riddleCooldownTime: int = 60
    selectedQuestions: List[int]
    selectedRiddles: List[int]
    emailEnabled: bool = False
    emailNotification: Optional[EmailNotificationRequest] = None

    @validator('name')
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Competition name cannot be empty')
        return v.strip()

    @validator('selectedQuestions')
    def validate_questions(cls, v):
        if not v or len(v) == 0:
            raise ValueError('At least one question must be selected')
        return v

    @validator('selectedRiddles')
    def validate_riddles(cls, v):
        if not v or len(v) == 0:
            raise ValueError('At least one riddle must be selected')
        return v

    @validator('questionCooldownTime', 'riddleCooldownTime')
    def validate_cooldown(cls, v):
        if v < 0:
            raise ValueError('Cooldown time cannot be negative')
        return v

    @validator('selectedRiddles')
    def validate_equal_length(cls, v, values):
        questions = values.get('selectedQuestions')
        if questions and len(v) != len(questions):
            raise ValueError(
                "selectedQuestions and selectedRiddles must have the same length"
            )
        return v


class CompetitionResponse(BaseModel):
    event_id: int
    event_name: str
    event_location: Optional[str]
    event_start_date: datetime
    event_end_date: datetime
    question_cooldown: int
    riddle_cooldown: int
    question_count: int
    riddle_count: int
    created_at: datetime

    class Config:
        from_attributes = True


# ---------------- Helper Functions ----------------
def parse_datetime_from_request(date_str: str, time_str: str) -> datetime:
    """
    Combines date and time strings into a timezone-aware datetime object.
    """
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
    """Validates that competition times are logical and in the future."""
    now = datetime.now(timezone.utc)

    if start_dt <= now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Competition start time must be in the future"
        )

    if end_dt <= start_dt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Competition end time must be after start time"
        )


def check_competition_name_exists(db: Session, name: str) -> bool:
    """Check if a competition with this name already exists."""
    existing = db.query(BaseEvent).filter(BaseEvent.event_name == name).first()
    return existing is not None


def create_competition_emails(
        db: Session,
        competition: Competition,
        email_data: EmailNotificationRequest,
        competition_start: datetime,
        competition_end: datetime,
        competition_name: str,
        date_str: str,
        start_time_str: str,
        end_time_str: str,
        location: Optional[str]
):
    """
    Creates scheduled email record for the competition.
    Stores reminder times: 24 hours before, 5 minutes before, and optional custom time.
    """
    try:
        # Calculate reminder times
        time_24h = competition_start - timedelta(hours=24)
        time_5min = competition_start - timedelta(minutes=5)

        # Optional custom time
        other_time = None
        if email_data.sendInOneMinute:
            other_time = datetime.now(timezone.utc) + timedelta(minutes=1)
        elif email_data.sendAtLocal:
            other_time = datetime.fromisoformat(
                email_data.sendAtLocal.replace('Z', '+00:00')
            )

        # Create single email record with all reminder times
        competition_email = CompetitionEmail(
            competition_id=competition.event_id,
            name=competition_name,
            date=date_str,
            start_time=start_time_str,
            end_time=end_time_str,
            location=location,
            time_24h_before=time_24h,
            time_5min_before=time_5min,
            other_time=other_time
        )

        db.add(competition_email)
        _commit_or_rollback(db)

        logger.info(f"Competition email record created for competition ID: {competition.event_id}")
        logger.info(f"  - 24h reminder: {time_24h}")
        logger.info(f"  - 5min reminder: {time_5min}")
        if other_time:
            logger.info(f"  - Custom time: {other_time}")

    except Exception as e:
        logger.error(f"Failed to create competition email record: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to schedule email notifications"
        )


# ---------------- Routes ----------------
@competitions_router.get("/")
def get_all_competitions(db: Session = Depends(get_db)):
    """Get all competitions (existing endpoint kept for compatibility)"""
    try:
        competitions = db.query(Competition).join(BaseEvent).all()
        logger.info(f"Fetched {len(competitions)} competitions from the database.")

        # Manually construct the response with base_event data
        return [
            {
                "id": comp.event_id,
                "competition_title": comp.base_event.event_name,
                "competition_location": comp.base_event.event_location,
                "date": comp.base_event.event_start_date,
            }
            for comp in competitions
        ]
    except Exception as e:
        logger.error(f"Error fetching competitions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve competitions. Exception: {str(e)}"
        )


@competitions_router.get("/list", response_model=List[CompetitionResponse])
async def list_competitions(
        db: Session = Depends(get_db),
        current_user: dict = Depends(get_current_user)
):
    """
    List all competitions with detailed information.
    Accessible by any authenticated user.
    """
    user_email = current_user.get("sub")
    logger.info(f"User '{user_email}' requesting competitions list")

    try:
        competitions = (
            db.query(BaseEvent, Competition)
            .join(Competition, BaseEvent.event_id == Competition.event_id)
            .order_by(BaseEvent.event_start_date.desc())
            .all()
        )

        result = []
        for base_event, competition in competitions:
            question_count = db.query(QuestionInstance).filter(
                QuestionInstance.event_id == base_event.event_id,
                ~QuestionInstance.is_riddle
            ).count()

            riddle_count = db.query(QuestionInstance).filter(
                QuestionInstance.event_id == base_event.event_id,
                QuestionInstance.is_riddle
            ).count()

            result.append(CompetitionResponse(
                event_id=base_event.event_id,
                event_name=base_event.event_name,
                event_location=base_event.event_location,
                event_start_date=base_event.event_start_date,
                event_end_date=base_event.event_end_date,
                question_cooldown=base_event.question_cooldown,
                riddle_cooldown=competition.riddle_cooldown,
                question_count=question_count,
                riddle_count=riddle_count,
                created_at=base_event.created_at
            ))

        logger.info(f"Retrieved {len(result)} competitions for user '{user_email}'")
        return result

    except Exception as e:
        logger.exception(f"Error retrieving competitions list: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve competitions"
        )


@competitions_router.post("/create", response_model=CompetitionResponse, status_code=status.HTTP_201_CREATED)
async def create_competition(
        request: CreateCompetitionRequest,
        db: Session = Depends(get_db),
        current_user: dict = Depends(role_required("admin"))
):
    """
    Create a new competition event.
    Only accessible by users with 'owner' role.
    """
    user_email = current_user.get("sub")
    logger.info(f"User '{user_email}' attempting to create competition: {request.name}")

    # Check if competition name already exists
    if check_competition_name_exists(db, request.name):
        logger.warning(f"Competition creation failed: Name '{request.name}' already exists")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Competition with name '{request.name}' already exists"
        )

    # Parse and validate datetime
    start_dt = parse_datetime_from_request(request.date, request.startTime)
    end_dt = parse_datetime_from_request(request.date, request.endTime)
    validate_competition_times(start_dt, end_dt)

    try:
        # Create BaseEvent
        base_event = BaseEvent(
            event_name=request.name,
            event_location=request.location,
            question_cooldown=request.questionCooldownTime,
            event_start_date=start_dt,
            event_end_date=end_dt,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        db.add(base_event)
        _commit_or_rollback(db)
        db.refresh(base_event)

        logger.info(f"BaseEvent created with ID: {base_event.event_id}")

        # Create Competition
        competition = Competition(
            event_id=base_event.event_id,
            riddle_cooldown=request.riddleCooldownTime
        )
        db.add(competition)
        _commit_or_rollback(db)
        db.refresh(competition)

        logger.info(f"Competition created with event_id: {competition.event_id}")

        # Create QuestionInstances pairing question[i] with riddle[i]
        for index, (question_id, riddle_id) in enumerate(
                zip(request.selectedQuestions, request.selectedRiddles)
        ):
            question_instance = QuestionInstance(
                event_id=base_event.event_id,
                question_id=question_id,
                riddle_id=riddle_id,
                points=0,
                is_riddle_completed=False
            )
            db.add(question_instance)

        _commit_or_rollback(db)

        logger.info(
            f"Added {len(request.selectedQuestions)} question+riddle pairs"
        )

        _commit_or_rollback(db)
        logger.info(f"Added {len(request.selectedQuestions)} questions and {len(request.selectedRiddles)} riddles")

        # Handle email notifications
        if request.emailEnabled and request.emailNotification:
            create_competition_emails(
                db,
                competition,
                request.emailNotification,
                start_dt,
                end_dt,
                request.name,
                request.date,
                request.startTime,
                request.endTime,
                request.location
            )

        logger.info(f"SUCCESSFUL COMPETITION CREATION: '{request.name}' by user '{user_email}'")

        return CompetitionResponse(
            event_id=base_event.event_id,
            event_name=base_event.event_name,
            event_location=base_event.event_location,
            event_start_date=base_event.event_start_date,
            event_end_date=base_event.event_end_date,
            question_cooldown=base_event.question_cooldown,
            riddle_cooldown=competition.riddle_cooldown,
            question_count=len(request.selectedQuestions),
            riddle_count=len(request.selectedRiddles),
            created_at=base_event.created_at
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"FATAL error during competition creation: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during competition creation"
        )


@competitions_router.get("/{competition_id}", response_model=CompetitionResponse)
async def get_competition(
        competition_id: int,
        db: Session = Depends(get_db),
        current_user: dict = Depends(get_current_user)
):
    """
    Get details of a specific competition.
    Accessible by any authenticated user.
    """
    user_email = current_user.get("sub")
    logger.info(f"User '{user_email}' requesting competition ID: {competition_id}")

    try:
        base_event = db.query(BaseEvent).filter(BaseEvent.event_id == competition_id).first()
        if not base_event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Competition not found"
            )

        competition = db.query(Competition).filter(Competition.event_id == competition_id).first()
        if not competition:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Competition details not found"
            )

        question_count = db.query(QuestionInstance).filter(
            QuestionInstance.event_id == competition_id,
            ~QuestionInstance.is_riddle
        ).count()

        riddle_count = db.query(QuestionInstance).filter(
            QuestionInstance.event_id == competition_id,
            QuestionInstance.is_riddle
        ).count()

        return CompetitionResponse(
            event_id=base_event.event_id,
            event_name=base_event.event_name,
            event_location=base_event.event_location,
            event_start_date=base_event.event_start_date,
            event_end_date=base_event.event_end_date,
            question_cooldown=base_event.question_cooldown,
            riddle_cooldown=competition.riddle_cooldown,
            question_count=question_count,
            riddle_count=riddle_count,
            created_at=base_event.created_at
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error retrieving competition {competition_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve competition"
        )


@competitions_router.delete("/{competition_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_competition(
        competition_id: int,
        db: Session = Depends(get_db),
        current_user: dict = Depends(role_required("owner"))
):
    """
    Delete a competition.
    Only accessible by users with 'owner' role.
    Cascade delete handles related records.
    """
    user_email = current_user.get("sub")
    logger.info(f"User '{user_email}' attempting to delete competition ID: {competition_id}")

    try:
        base_event = db.query(BaseEvent).filter(BaseEvent.event_id == competition_id).first()
        if not base_event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Competition not found"
            )

        competition_name = base_event.event_name
        db.delete(base_event)
        _commit_or_rollback(db)

        logger.info(
            f"SUCCESSFUL DELETION: Competition '{competition_name}' (ID: {competition_id}) deleted by '{user_email}'")

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error deleting competition {competition_id}: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete competition"
        )