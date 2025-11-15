from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from DB_Methods.database import get_db
from models.schema import UserResult, Competition, Scoreboard

leaderboards_router = APIRouter(tags=["Leaderboards"])

def get_all_competitions(db: Session) -> List[Competition]:
    return db.query(Competition).all()

def get_scoreboard_for_competition(db: Session, competition_id: int) -> List[Scoreboard]:
    return (
        db.query(Scoreboard)
        .filter(Scoreboard.competition_id == competition_id)
        .order_by(Scoreboard.rank.asc())
        .all()
    )

@leaderboards_router.get("/")
def get_leaderboards(db: Session = Depends(get_db)):
    competitions = get_all_competitions(db)
    result = []

    for comp in competitions:
        scoreboards = get_scoreboard_for_competition(db, comp.competition_id)
        participants = []

        for s in scoreboards:
            ur = (
                db.query(UserResult)
                .filter(
                    UserResult.user_id == s.user_id,
                    UserResult.competition_id == s.competition_id,
                )
                .first()
            )

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
            "participants": participants,
        })

    return result
