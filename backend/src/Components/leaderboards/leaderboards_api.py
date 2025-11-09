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


