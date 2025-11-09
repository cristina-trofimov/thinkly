from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, logger
from sqlalchemy import inspect
from sqlalchemy.orm import Session
from DB_Methods.crudOperations import (
    SessionLocal,
    get_all_competitions,
    get_scoreboard_for_competition
)
from models.schema import BaseQuestion, UserResult
router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/leaderboards")
def get_leaderboards(db: Session = Depends(get_db)):
    competitions = get_all_competitions(db)
    result = []
    for comp in competitions:
        scoreboards = get_scoreboard_for_competition(db, comp.competition_id)
        participants = []
        for s in scoreboards:
            if s.user:
                ur = db.query(UserResult).get((s.user_id, s.competition_id))
                participants.append({
                    "name": f"{s.user.first_name} {s.user.last_name}",
                    "points": s.total_score or 0,
                    "problemsSolved": ur.problems_solved if ur else 0,
                    "totalTime": f"{ur.total_time:.1f} min" if ur else "0.0 min",
                })
        result.append({
            "id": str(comp.competition_id),
            "name": comp.name,
            "date": comp.date.strftime("%Y-%m-%d"),
            "participants": participants
        })
    return result

@router.get("/questions")
def get_all_questions(db: Session = Depends(get_db)):
    try:
        
        insp = inspect(db.bind)
        if "base_question" not in insp.get_table_names() and "basequestion" not in insp.get_table_names():
            raise RuntimeError("Table for BaseQuestion not found. Did you run the seeder & use the same DB URL?")

        rows = db.query(BaseQuestion).all()

        
        def to_dict(q: BaseQuestion):
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

        return [to_dict(q) for q in rows]

    except Exception as e:
        # Log full error to server console; return 500 with short message
        logger.exception("Failed to fetch /questions")
        raise HTTPException(status_code=500, detail=f"/questions error: {type(e).__name__}: {e}")
