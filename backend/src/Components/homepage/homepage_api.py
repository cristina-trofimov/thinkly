from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from DB_Methods.crudOperations import (
    SessionLocal,
)
from models.schema import Competition, BaseQuestion

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/get-questions")
def get_all_questions(db: Session = Depends(get_db)):
    questions = db.query(BaseQuestion).all()
    result = []
    for q in questions:
        result.append({
            "id": q.question_id,
            "questionTitle": q.title,
            "date": q.created_at,
            "difficulty": q.difficulty,
        })
    return result

@router.get("/get-competitions")
def get_all_competitions(db: Session = Depends(get_db)):
    competitions = db.query(Competition).all()
    result = []
    for c in competitions:
        result.append({
            "id": c.competition_id,
            "competitionTitle": c.name,
            "date": c.date.isoformat() if c.date else None,
            "user_id": c.user_id,
        })
    return result