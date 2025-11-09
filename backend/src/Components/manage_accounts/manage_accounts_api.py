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

@router.get("/users")
def get_all_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    result = []
    for user in users:
        result.append({
            "user_id": user.user_id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "type": user.type
        })
    return result