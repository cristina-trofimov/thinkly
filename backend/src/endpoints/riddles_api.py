from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from models.schema import Riddle 
from DB_Methods.database import get_db, _commit_or_rollback
# from endpoints.authentification_api import get_current_user, role_required  <-- No longer needed
import logging
from pydantic import BaseModel, validator
from typing import List, Optional

logger = logging.getLogger(__name__)
riddles_router = APIRouter(tags=["Riddles"])

# ---------------- Models ----------------
class CreateRiddleRequest(BaseModel):
    question: str
    answer: str
    file: Optional[str] = None

    @validator('question')
    def validate_question(cls, v):
        if not v or not v.strip():
            raise ValueError('Riddle question cannot be empty')
        return v.strip()

    @validator('answer')
    def validate_answer(cls, v):
        if not v or not v.strip():
            raise ValueError('Riddle answer cannot be empty')
        return v.strip()

class RiddleResponse(BaseModel):
    riddle_id: int
    riddle_question: str
    riddle_answer: str
    riddle_file: Optional[str]

    class Config:
        from_attributes = True

# ---------------- Helper Functions ----------------
def check_riddle_exists(db: Session, question: str) -> bool:
    existing = db.query(Riddle).filter(Riddle.riddle_question == question).first()
    return existing is not None

# ---------------- Routes ----------------

@riddles_router.get("/", response_model=List[RiddleResponse])
async def list_riddles(
        db: Session = Depends(get_db)  
):
    logger.info("Public user requesting full riddles list")
    try:
        riddles = db.query(Riddle).all()
        return riddles
    except Exception as e:
        logger.exception(f"Error retrieving riddles list: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve riddles")


@riddles_router.get("/{riddle_id}", response_model=RiddleResponse)
async def get_riddle(
        riddle_id: int,
        db: Session = Depends(get_db)  
):
    try:
        riddle = db.query(Riddle).filter(Riddle.riddle_id == riddle_id).first()
        if not riddle:
            raise HTTPException(status_code=404, detail="Riddle not found")
        return riddle
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error retrieving riddle {riddle_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve riddle")


@riddles_router.post("/create", response_model=RiddleResponse, status_code=status.HTTP_201_CREATED)
async def create_riddle(
        request: CreateRiddleRequest,
        db: Session = Depends(get_db)  
):
    
    logger.info("Anonymous user attempting to create new riddle")

    if check_riddle_exists(db, request.question):
        raise HTTPException(status_code=400, detail="A riddle with this question already exists")

    try:
        new_riddle = Riddle(
            riddle_question=request.question,
            riddle_answer=request.answer,
            riddle_file=request.file
        )
        
        db.add(new_riddle)
        _commit_or_rollback(db)
        db.refresh(new_riddle)

        logger.info(f"Riddle created successfully with ID: {new_riddle.riddle_id}")
        return new_riddle

    except Exception as e:
        logger.exception(f"FATAL error during riddle creation: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@riddles_router.delete("/{riddle_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_riddle(
        riddle_id: int,
        db: Session = Depends(get_db)  # <--- MUST HAVE THIS
):
    # WARNING: This endpoint is now public. Anyone can delete riddles.
    logger.info(f"Anonymous user attempting to delete riddle ID: {riddle_id}")

    try:
        riddle = db.query(Riddle).filter(Riddle.riddle_id == riddle_id).first()
        if not riddle:
            raise HTTPException(status_code=404, detail="Riddle not found")

        db.delete(riddle)
        _commit_or_rollback(db)

        # Removed 'user_email' from this log because it doesn't exist anymore
        logger.info(f"SUCCESSFUL DELETION: Riddle ID {riddle_id} deleted") 

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error deleting riddle {riddle_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete riddle")