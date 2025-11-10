from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from DB_Methods.crudOperations import (
    SessionLocal,
    delete_user_full,
)
from models.schema import User, Competition, Scoreboard, UserResult

router = APIRouter()

class BatchDeleteRequest(BaseModel):
    user_ids: List[int]

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

@router.delete("/users/batch-delete")
def delete_users(request: BatchDeleteRequest, db: Session = Depends(get_db)):
    """
    Delete multiple users by their IDs.
    Expects JSON body: {"user_ids": [1, 2, 3]}
    """
    if not request.user_ids:
        raise HTTPException(status_code=400, detail="No user IDs provided")
    
    deleted_count = 0
    errors = []
    
    for uid in request.user_ids:
        try:
            delete_user_full(db, uid)
            deleted_count += 1
        except ValueError as e:
            errors.append({"user_id": uid, "error": str(e)})
        except Exception as e:
            errors.append({"user_id": uid, "error": f"Unexpected error: {str(e)}"})
    
    response = {
        "message": f"Deleted {deleted_count} users successfully",
        "deleted_count": deleted_count,
        "total_requested": len(request.user_ids)
    }
    
    if errors:
        response["errors"] = errors
    
    return response