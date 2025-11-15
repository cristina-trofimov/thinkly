from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from DB_Methods.database import get_db
from models.schema import Scoreboard, Competition

current_leaderboard_router = APIRouter(tags=["Current Leaderboard"])


@current_leaderboard_router.get("/current")
def get_current_standings(db: Session = Depends(get_db)):
    """
    Get the current/active competition standings.
    Returns the most recent competition that has participants in the scoreboard.
    """

    # Get the most recent competition with scoreboard entries
    recent_competition = (
        db.query(Competition)
        .join(Scoreboard, Competition.competition_id == Scoreboard.competition_id)
        .order_by(desc(Competition.date))
        .first()
    )

    if not recent_competition:
        raise HTTPException(status_code=404, detail="No active competition found")

    # Get all scoreboard entries for this competition, ordered by rank
    standings = (
        db.query(Scoreboard)
        .filter(Scoreboard.competition_id == recent_competition.competition_id)
        .order_by(Scoreboard.rank.asc())
        .all()
    )

    if not standings:
        raise HTTPException(status_code=404, detail="No standings found for current competition")

    # Build participants list
    participants = []
    for s in standings:
        if s.user:
            participants.append({
                "name": f"{s.user.first_name} {s.user.last_name}",
                "points": s.total_score or 0,
                "problemsSolved": s.problems_solved or 0,
                "totalTime": f"{s.current_time:.1f} min" if s.current_time else "0.0 min",
            })

    return {
        "competitionName": recent_competition.name,
        "participants": participants
    }


@current_leaderboard_router.get("/{competition_id}")
def get_standings_by_competition(competition_id: int, db: Session = Depends(get_db)):
    """
    Get standings for a specific competition by ID.
    Useful if you want to display a specific competition's live standings.
    """

    competition = db.query(Competition).filter(Competition.competition_id == competition_id).first()

    if not competition:
        raise HTTPException(status_code=404, detail="Competition not found")

    standings = (
        db.query(Scoreboard)
        .filter(Scoreboard.competition_id == competition_id)
        .order_by(Scoreboard.rank.asc())
        .all()
    )

    if not standings:
        raise HTTPException(status_code=404, detail="No standings found for this competition")

    participants = []
    for s in standings:
        if s.user:
            participants.append({
                "name": f"{s.user.first_name} {s.user.last_name}",
                "points": s.total_score or 0,
                "problemsSolved": s.problems_solved or 0,
                "totalTime": f"{s.current_time:.1f} min" if s.current_time else "0.0 min",
            })

    return {
        "competitionName": competition.name,
        "participants": participants
    }