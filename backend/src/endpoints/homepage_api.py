from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from models.schema import Competition, Question
from DB_Methods.database import get_db

homepage_router = APIRouter(tags=["Homepage"])

@homepage_router.get("/get-competitions")
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