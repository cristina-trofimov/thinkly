from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from models.schema import Competition, BaseEvent
from DB_Methods.database import get_db
import logging

logger = logging.getLogger(__name__)
competitions_router = APIRouter(tags=["Competitions"])

@competitions_router.get("/")
def get_all_competitions(db: Session = Depends(get_db)):
    competitions = db.query(Competition).join(BaseEvent).all()
    logger.info(f"Fetched {len(competitions)} competitions from the database.")
    return competitions