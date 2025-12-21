from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from models.schema import Question
from DB_Methods.database import get_db
import logging

logger = logging.getLogger(__name__)
questions_router = APIRouter(tags=["Questions"])

@questions_router.get("/get-all-questions")
def get_all_questions(db: Session = Depends(get_db)):
    try:
        questions = db.query(Question).all()
        logger.info(f"Fetched {len(questions)} questions from the database.")
        return questions
    except Exception as e:
        logger.error(f"Error fetching questions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve questions. Exception: {str(e)}")