from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
import logging
from pydantic import BaseModel
from sqlalchemy import inspect
from sqlalchemy.orm import Session
from models.schema import Question
from DB_Methods.database import get_db

questions_router = APIRouter(tags=["Questions"])
logger = logging.getLogger(__name__)

@questions_router.get("/")
def get_all_questions(db: Session = Depends(get_db)):
    try:
        rows = db.query(Question).all()
        def to_dict(q: Question):
            created = None
            if hasattr(q, "created_at") and isinstance(q.created_at, datetime):
                created = q.created_at.strftime("%Y-%m-%d")

            
            return {
                "id": str(getattr(q, "question_id", getattr(q, "id", None))),
                "title": getattr(q, "title", None),
                "description": getattr(q, "description", None),
                "difficulty": getattr(q, "difficulty", None),
                "solution": getattr(q, "solution", None),
                "media": getattr(q, "media", None),
                "createdAt": created,
            }

        return rows

    except Exception as e:
        logger.exception("Failed to fetch /questions")
        raise HTTPException(status_code=500, detail=f"/questions error: {type(e).__name__}: {e}")
    
class CreateQuestionRequest(BaseModel):
    title: str
    description: str
    media: Optional[str]= None
    difficulty: str
    preset_code: str
    from_string_function: str
    to_string_function: str
    template_solution: str

@questions_router.post("/create-question")
def create_question(payload: CreateQuestionRequest, db: Session = Depends(get_db)):
    question = Question()
    question.question_name=payload.title
    question.question_description=payload.description
    question.media=payload.media
    question.difficulty=payload.difficulty
    question.preset_code=payload.preset_code
    question.from_string_function=payload.from_string_function
    question.to_string_function=payload.to_string_function
    question.template_solution=payload.template_solution

    db.add(question)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.exception("Failed to create question")
        raise HTTPException(status_code=500, detail=f"Create question error: {type(e).__name__}: {e}")
    db.refresh(question)
    return question