from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from DB_Methods.crudOperations import (
    SessionLocal,
    delete_user_full,
    get_user_by_id,
    update_user as crud_update_user,
)
from models.schema import User, Competition, Scoreboard, UserResult
from typing import Optional

manage_accounts_router = APIRouter(tags=["Manage Accounts"])

class BatchDeleteRequest(BaseModel):
    user_ids: List[int]

class UserUpdateSchema(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    password_hash: Optional[str] = None
    type: Optional[str] = None

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@manage_accounts_router.get("/users")
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

@manage_accounts_router.delete("/users/batch-delete")
def delete_users(request: BatchDeleteRequest, db: Session = Depends(get_db)):
    if not request.user_ids:
        raise HTTPException(status_code=400, detail="No user IDs provided")

    status_code = 200
    deleted_count = 0
    deleted_users = []
    errors = []

    for uid in request.user_ids:
        try:
            with db.begin():
                user = get_user_by_id(db, uid)
                delete_user_full(db, uid)
            deleted_count += 1
            deleted_users.append({
                "user_id": user.user_id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "type": user.type,
            })
        except ValueError as e:
            db.rollback()
            errors.append({"user_id": uid, "error": str(e)})
        except Exception as e:
            db.rollback()
            errors.append({"user_id": uid, "error": f"Unexpected error: {str(e)}"})

    if deleted_count == 0:
        raise HTTPException(status_code=500, detail="Failed to delete any users.")

    if (errors):
        status_code = 207
    return JSONResponse(
        status_code=status_code,
        content={
            "message": f"Deleted {deleted_count} users successfully",
            "deleted_count": deleted_count,
            "deleted_users": deleted_users,
            "total_requested": len(request.user_ids),
            "errors": errors if errors else None,
        },
    )

@manage_accounts_router.patch("/users/{user_id}")
def update_user(user_id: int, user: UserUpdateSchema, db: Session = Depends(get_db)):
    fields_to_update = user.model_dump(exclude_unset=True)

    try:
        updated_user = crud_update_user(db, user_id=user_id, **fields_to_update)
        return JSONResponse(
            status_code=200,
            content={
                "message": "User updated successfully",
                "user": {
                    "user_id": updated_user.user_id,
                    "email": updated_user.email,
                    "first_name": updated_user.first_name,
                    "last_name": updated_user.last_name,
                    "type": updated_user.type,
                },
            },
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
