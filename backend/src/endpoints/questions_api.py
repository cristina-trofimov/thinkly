from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from models.schema import Question, Riddle, TestCase
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



@questions_router.get("/get-all-riddles")
def get_all_riddles(db: Session = Depends(get_db)):
    try:
        riddles = db.query(Riddle).all()
        logger.info(f"Fetched {len(riddles)} riddles from the database.")
        return riddles
    except Exception as e:
        logger.error(f"Error fetching questions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve questions. Exception: {str(e)}")


@questions_router.get("/get-all-testcases/{question_id}")
def get_all_testcases(question_id: int, db: Session = Depends(get_db)):
    try:
        testcases = db.query(TestCase).filter_by(question_id = question_id).all()
        logger.info(f"Fetched {len(testcases)} test cases from the database.")
        return testcases
    except Exception as e:
        logger.error(f"Error fetching test cases: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve test cases. Exception: {str(e)}")