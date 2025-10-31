from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from src.DB_Methods.crudOperations import SessionLocal, get_all_competitions, get_scoreboard_for_competition
from src.models.schema import User, Competition, Scoreboard, UserResult

app = FastAPI()

# Allow your frontend to access the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/leaderboards")
def get_leaderboards(db: Session = Depends(get_db)):
    competitions = get_all_competitions(db)
    result = []
    for comp in competitions:
        scoreboards = get_scoreboard_for_competition(db, comp.competition_id)
        participants = []
        for s in scoreboards:
            if s.user:
                # Fetch UserResult for more details
                ur = db.query(UserResult).get((s.user_id, s.competition_id))
                participants.append({
                    "name": f"{s.user.first_name} {s.user.last_name}",
                    "points": s.total_score or 0,
                    "problemsSolved": ur.problems_solved if ur else 0,
                    "totalTime": f"{ur.total_time:.1f} min" if ur else "0.0 min",
                })
        result.append({
            "id": comp.competition_id,
            "name": comp.name,
            "date": comp.date.strftime("%Y-%m-%d"),
            "participants": participants
        })
    return result
