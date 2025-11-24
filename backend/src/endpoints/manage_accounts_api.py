from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from DB_Methods.database import get_db, _commit_or_rollback
from typing import Optional
from models.schema import Question, Competition, UserAccount, UserPreferences
import logging

manage_accounts_router = APIRouter(tags=["Manage Accounts"])
logger = logging.getLogger(__name__)

class BatchDeleteRequest(BaseModel):
    user_ids: List[int]

class UserUpdateSchema(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    password_hash: Optional[str] = None
    type: Optional[str] = None

def get_all_users(db: Session) -> List[UserAccount]:
    """Retrieve all users."""
    logger.debug("Retrieving all users from database.")
    try:
        users = db.query(UserAccount).all()
        logger.debug(f"Found {len(users)} users.")
        return users
    except Exception as e:
        logger.exception("Database error while fetching all users.")
        raise e

def delete_user_full(db: Session, user_id: int) -> bool:
    """
    Delete a user and all related data (sessions, cooldowns, results, preferences, etc.)
    while keeping historical scoreboard entries and nullifying ownerships.
    """
    logger.info(f"Starting hard delete for user ID: {user_id}")

    user = db.query(UserAccount).filter(UserAccount.user_id == user_id).first()
    if not user:
        logger.warning(f"Deletion failed: User ID {user_id} not found.")
        raise ValueError("User not found")

    # Set user_id = NULL for competitions and questions they created
    db.query(Competition).filter(Competition.user_id == user_id).update({"user_id": None})
    logger.debug(f"Nullified Competition ownership for user ID {user_id}.")
    db.query(Question).filter(Question.user_id == user_id).update({"user_id": None})
    logger.debug(f"Nullified Question ownership for user ID {user_id}.")

    # Delete the user (cascades handle other relationships)
    db.delete(user)
    _commit_or_rollback(db)
    logger.warning(f"AUDIT: User account (ID: {user_id}, Email: {user.email}) successfully deleted.")
    return True

def get_user_by_id(db: Session, user_id: int) -> Optional[UserAccount]:
    """Retrieve a user by ID."""
    return db.query(UserAccount).filter(UserAccount.user_id == user_id).first()

def update_user_in_db(db: Session, user_id: int, username: Optional[str] = None, email: Optional[str] = None, first_name: Optional[str] = None, last_name: Optional[str] = None, password_hash: Optional[str] = None, type: Optional[str] = None) -> UserAccount:
    logger.info(f"Attempting update for user ID: {user_id}")
    user = db.query(UserAccount).filter(UserAccount.user_id == user_id).first()
    if not user:
        logger.error(f"Update failed: User ID {user_id} not found.")
        raise ValueError("User not found")

    # Prevent creating multiple owners
    if type == 'owner' and user.type != 'owner':
        existing_owner = db.query(UserAccount).filter(UserAccount.type == 'owner').first()
        if existing_owner:
            logger.error(f"Update failed: Attempted to set user ID {user_id} to 'owner', but owner already exists.")
            raise ValueError("An owner already exists. Only one owner is allowed.")
    
    # Track changed fields
    changed_fields = []
    
    if username is not None:
        user.username = username
        changed_fields.append("username")
    if email is not None:
        user.email = email
        changed_fields.append("email")
    if first_name is not None:
        user.first_name = first_name
        changed_fields.append("first_name")
    if last_name is not None:
        user.last_name = last_name
        changed_fields.append("last_name")
    if password_hash is not None:
        # Note: Password hashes should not be logged
        user.salt = password_hash
        changed_fields.append("password_hash(MASKED)") 
    if type is not None:
        user.type = type
        changed_fields.append("type")

    _commit_or_rollback(db)
    db.refresh(user)
    logger.warning(f"AUDIT: User ID {user_id} updated successfully. Fields changed: {', '.join(changed_fields)}")
    return user

@manage_accounts_router.get("/users")
def get_users(db: Session = Depends(get_db)):
    logger.info("Accessing /manageAccounts/users endpoint to fetch all users.")
    try:
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
        logger.info(f"Successfully returned {len(users)} user records.")
        return result
    except Exception:
        logger.exception("Failed to fetch all users.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve users.")

@manage_accounts_router.delete("/users/batch-delete")
def delete_users(request: BatchDeleteRequest, db: Session = Depends(get_db)):
    logger.info(f"ATTEMPTING BATCH DELETE for {len(request.user_ids)} users: {request.user_ids}")
    
    if not request.user_ids:
        logger.warning("Batch delete failed: No user IDs provided.")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No user IDs provided")

    status_code = status.HTTP_200_OK
    deleted_count = 0
    deleted_users = []
    errors = []

    for uid in request.user_ids:
        try:
            # We use db.begin() here to ensure the helper function commit is isolated
            with db.begin(): 
                # Retrieve user info BEFORE deletion for the log audit trail
                user_info = get_user_by_id(db, uid)
                if user_info is None:
                    # Reraise as ValueError to be caught below and added to errors list
                    raise ValueError("User not found in batch list") 

                delete_user_full(db, uid)
                deleted_count += 1
                deleted_users.append({
                    "user_id": user_info.user_id,
                    "email": user_info.email,
                    "first_name": user_info.first_name,
                    "last_name": user_info.last_name,
                    "type": user_info.type,
                })
        except ValueError as e:
            # Rollback is automatically handled by db.begin() on exception
            errors.append({"user_id": uid, "error": str(e)})
            logger.warning(f"Batch delete partial failure for user ID {uid}: {str(e)}")
        except Exception as e:
            # Rollback is automatically handled by db.begin() on exception
            errors.append({"user_id": uid, "error": f"Unexpected error: {str(e)}"})
            logger.exception(f"Batch delete unexpected failure for user ID {uid}.")

    if deleted_count == 0:
        logger.error(f"BATCH DELETE FAILED: Zero users were deleted. Total requested: {len(request.user_ids)}. Errors: {len(errors)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete any users.")

    if errors:
        status_code = status.HTTP_207_MULTI_STATUS # HTTP 207 Multi-Status for partial success/failure
        logger.info(f"BATCH DELETE PARTIAL SUCCESS: {deleted_count} deleted, {len(errors)} failed.")
        
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
    
    if not fields_to_update:
        logger.info(f"Update request for user ID {user_id} contained no fields to update.")
        return JSONResponse(status_code=status.HTTP_200_OK, content={"message": "No fields provided for update."})

    try:
        updated_user = update_user_in_db(db, user_id=user_id, **fields_to_update)
        
        # Log the success of the route logic
        logger.info(f"User ID {user_id} update endpoint completed successfully.")
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "user_id": updated_user.user_id,
                "email": updated_user.email,
                "first_name": updated_user.first_name,
                "last_name": updated_user.last_name,
                "type": updated_user.type,
            },
        )
    except ValueError as e:
        logger.warning(f"User update failed for ID {user_id}: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception:
        logger.exception(f"Unexpected error during user update for ID {user_id}.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error during update.")
