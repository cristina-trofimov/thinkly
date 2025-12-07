from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from models.schema import *
from DB_Methods.database import get_db
import logging

logger = logging.getLogger(__name__)
questions_router = APIRouter(tags=["Questions"])

@questions_router.get("/")
def get_all_questions(db: Session = Depends(get_db)):
    questions = db.query(Question).all()
    logger.info(f"Fetched {len(questions)} questions from the database.")
    return questions