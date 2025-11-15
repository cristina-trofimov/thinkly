from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from DB_Methods.database import get_db, _commit_or_rollback
from typing import Optional
from models.schema import BaseQuestion, Competition, User, UserPreferences

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

def get_all_users(db: Session) -> List[User]:
    """Retrieve all users."""
    return db.query(User).all()

def delete_user_full(db: Session, user_id: int) -> bool:
    """
    Delete a user and all related data (sessions, cooldowns, results, preferences, etc.)
    while keeping historical scoreboard entries and nullifying ownerships.
    """

    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise ValueError("User not found")

    # Set user_id = NULL for competitions and questions they created
    db.query(Competition).filter(Competition.user_id == user_id).update({"user_id": None})
    db.query(BaseQuestion).filter(BaseQuestion.user_id == user_id).update({"user_id": None})

    # Delete user preferences explicitly (not handled via relationship)
    db.query(UserPreferences).filter(UserPreferences.user_id == user_id).delete()

    # Delete the user (cascades handle: sessions, results, cooldowns, stats, answers, participations)
    db.delete(user)
    _commit_or_rollback(db)
    return True

def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    """Retrieve a user by ID."""
    return db.query(User).filter(User.user_id == user_id).first()

def update_user_in_db(db: Session, user_id: int, username: Optional[str] = None, email: Optional[str] = None, first_name: Optional[str] = None, last_name: Optional[str] = None, password_hash: Optional[str] = None, type: Optional[str] = None) -> User:
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise ValueError("User not found")

    # Prevent creating multiple owners
    if type == 'owner' and user.type != 'owner':
        existing_owner = db.query(User).filter(User.type == 'owner').first()
        if existing_owner:
            raise ValueError("An owner already exists. Only one owner is allowed.")

    if username is not None:
        user.username = username
    if email is not None:
        user.email = email
    if first_name is not None:
        user.first_name = first_name
    if last_name is not None:
        user.last_name = last_name
    if password_hash is not None:
        user.salt = password_hash
    if type is not None:
        user.type = type

    _commit_or_rollback(db)
    db.refresh(user)
    return user

@manage_accounts_router.get("/users")
def get_users(db: Session = Depends(get_db)):
    users = get_all_users(db)
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
        updated_user = update_user_in_db(db, user_id=user_id, **fields_to_update)
        return JSONResponse(
            status_code=200,
            content={
                "user_id": updated_user.user_id,
                "email": updated_user.email,
                "first_name": updated_user.first_name,
                "last_name": updated_user.last_name,
                "type": updated_user.type,
            },
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
