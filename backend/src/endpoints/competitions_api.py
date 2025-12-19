from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from models.schema import Competition, BaseEvent
from DB_Methods.database import get_db
import logging
from dotenv import load_dotenv
from DB_Methods.database import get_db, _commit_or_rollback
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import Optional


load_dotenv()
logger = logging.getLogger(__name__)
competitions_router = APIRouter(tags=["Competitions"])

# ---------------- Models ----------------
class CompetitionCreate(BaseModel):
    title: str
    location: Optional[str] = None
    question_cooldown: int = 300
    riddle_cooldown: int = 60
    riddleCooldownTime: int = 60
    event_start_date: datetime
    event_end_date: datetime

# ---------------- DB helpers ----------------
def create_competition(db: Session, data: CompetitionCreate) -> Competition:
    # 1️⃣ Create BaseEvent
    base_event = BaseEvent(
        event_name=data.title,
        event_location=data.location,
        question_cooldown=data.question_cooldown,
        event_start_date=data.event_start_date,
        event_end_date=data.event_end_date,
        riddleCooldownTime= data.riddleCooldownTime,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    db.add(base_event)
    _commit_or_rollback(db)
    db.refresh(base_event)

    # 2️⃣ Create Competition (1–1 with BaseEvent)
    competition = Competition(
        event_id=base_event.event_id,
        riddle_cooldown=data.riddle_cooldown,
    )

    db.add(competition)
    _commit_or_rollback(db)
    db.refresh(competition)

    return competition

# ---------------- Routes ----------------
@competitions_router.get("/")
def get_all_competitions(db: Session = Depends(get_db)):
    try:
        competitions = db.query(Competition).join(BaseEvent).all()
        logger.info(f"Fetched {len(competitions)} competitions from the database.")
        return competitions
    except Exception as e:
        logger.error(f"Error fetching competitions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve competitions. Exception: {str(e)}")

    @competitions_router.post("/create", response_model=CompetitionCreate)
    def create_competition_endpoint(
            payload: CompetitionCreate,
            db: Session = Depends(get_db)
    ):
        return create_competition(db, payload)