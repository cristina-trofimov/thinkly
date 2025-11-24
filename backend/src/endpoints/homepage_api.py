from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from models.schema import Competition, BaseQuestion
from DB_Methods.database import get_db
import logging

logger = logging.getLogger(__name__)
homepage_router = APIRouter(tags=["Homepage"])

@homepage_router.get("/get-questions")
def get_all_questions(db: Session = Depends(get_db)):
    # Log when the API endpoint is hit
    logger.info("Accessing /homepage/get-questions endpoint.")
    
    try:
        questions = db.query(BaseQuestion).all()
        
        # Log the number of records retrieved
        num_questions = len(questions)
        logger.info(f"Successfully retrieved {num_questions} questions from the database.")
        
        result = []
        for q in questions:
            result.append({
                "id": q.question_id,
                "questionTitle": q.title,
                "date": q.created_at,
                "difficulty": q.difficulty,
            })
        
        # Log successful completion
        logger.debug("Successfully formatted question results.")
        return result
        
    except Exception as e:
        # Log the exception with stack trace (essential for ELK)
        logger.exception("An error occurred while fetching questions.")
        # Raise an HTTPException to communicate the error back to the client
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve questions: {type(e).__name__}"
        )

@homepage_router.get("/get-competitions")
def get_all_competitions(db: Session = Depends(get_db)):
    # Log when the API endpoint is hit
    logger.info("Accessing /homepage/get-competitions endpoint.")
    
    try:
        competitions = db.query(Competition).all()
        
        # Log the number of records retrieved
        num_competitions = len(competitions)
        logger.info(f"Successfully retrieved {num_competitions} competitions from the database.")
        
        result = []
        for c in competitions:
            # Handle date formatting robustly
            competition_date = c.date.isoformat() if c.date else None
            
            result.append({
                "id": c.competition_id,
                "competitionTitle": c.name,
                "date": competition_date,
                "user_id": c.user_id,
            })
        
        # Log successful completion
        logger.debug("Successfully formatted competition results.")
        return result

    except Exception as e:
        # Log the exception with stack trace
        logger.exception("An error occurred while fetching competitions.")
        # Raise an HTTPException
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve competitions: {type(e).__name__}"
        )