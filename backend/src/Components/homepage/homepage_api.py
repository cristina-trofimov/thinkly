from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from DB_Methods.crudOperations import (
    SessionLocal,
)
from models.schema import User, Competition, Scoreboard, UserResult

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/homepage")
def get_all_questions(db: Session = Depends(get_db)):
    questions = db.query(BaseQuestion).all()
    result = []
    for user in users:
        result.append({
            "id": q.question_id,
            "questionTitle": q.title,
            "date": q.created_at,
            "difficulty": q.difficulty,
        })
    return result