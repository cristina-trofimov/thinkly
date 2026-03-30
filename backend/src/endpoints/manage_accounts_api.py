from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from models.schema import UserAccount, UserPreferences
from database_operations.database import get_db
from pydantic import BaseModel, Field
from typing import Annotated, Literal, Optional
import logging
from services.posthog_analytics import track_custom_event
from endpoints.authentification_api import get_current_user
logger = logging.getLogger(__name__)
accounts_router = APIRouter(tags=["Accounts"])
DEFAULT_PAGE_SIZE = 25
MAX_PAGE_SIZE = 100


class DeleteAccountsRequest(BaseModel):
    user_ids: list[int] = Field(..., min_items=1)


class UpdateAccountRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    user_type: Optional[str] = None


class UpdatePreferencesRequest(BaseModel):
    theme: Optional[str] = None
    notifications_enabled: Optional[bool] = None


class AccountItemResponse(BaseModel):
    user_id: int
    first_name: str
    last_name: str
    email: str
    user_type: str


class PaginatedAccountsResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[AccountItemResponse]


@accounts_router.get("/users", response_model=PaginatedAccountsResponse)
def get_all_accounts(
    db: Annotated[Session, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = DEFAULT_PAGE_SIZE,
    search: Annotated[Optional[str], Query(max_length=200)] = None,
    user_type: Annotated[Optional[Literal["owner", "admin", "participant"]], Query()] = None,
    sort: Annotated[
        Optional[Literal[
            "name_asc",
            "name_desc",
            "email_asc",
            "email_desc",
        ]],
        Query(),
    ] = None,
):
    query = db.query(UserAccount)

    if search and search.strip():
        needle = f"%{search.strip()}%"
        query = query.filter(
            or_(
                UserAccount.email.ilike(needle),
                UserAccount.first_name.ilike(needle),
                UserAccount.last_name.ilike(needle),
            )
        )

    if user_type:
        query = query.filter(UserAccount.user_type == user_type)

    if sort == "name_asc":
        query = query.order_by(UserAccount.first_name.asc(), UserAccount.last_name.asc(), UserAccount.user_id.asc())
    elif sort == "name_desc":
        query = query.order_by(UserAccount.first_name.desc(), UserAccount.last_name.desc(), UserAccount.user_id.desc())
    elif sort == "email_asc":
        query = query.order_by(UserAccount.email.asc(), UserAccount.user_id.asc())
    elif sort == "email_desc":
        query = query.order_by(UserAccount.email.desc(), UserAccount.user_id.desc())
    else:
        query = query.order_by(UserAccount.user_id.asc())

    total = query.count()
    offset = (page - 1) * page_size
    accounts = query.offset(offset).limit(page_size).all()

    logger.info(
        "Fetched %s account(s) for page=%s, page_size=%s (total=%s).",
        len(accounts),
        page,
        page_size,
        total,
    )

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [
            {
                "user_id": account.user_id,
                "first_name": account.first_name,
                "last_name": account.last_name,
                "email": account.email,
                "user_type": account.user_type,
            }
            for account in accounts
        ],
    }


@accounts_router.delete(
    "/users/batch-delete",
    responses={500: {"description": "Error deleting accounts."}}
)
def delete_multiple_accounts(payload: DeleteAccountsRequest, db: Annotated[Session, Depends(get_db)]):
    try:
        requested_ids = list(dict.fromkeys(payload.user_ids))
        existing_ids = [
            row.user_id
            for row in db.query(UserAccount.user_id)
            .filter(UserAccount.user_id.in_(requested_ids))
            .all()
        ]
        if existing_ids:
            deleted_count = (
                db.query(UserAccount)
                .filter(UserAccount.user_id.in_(existing_ids))
                .delete(synchronize_session=False)
            )
        else:
            deleted_count = 0
        db.commit()
        logger.info(f"Deleted {deleted_count} accounts from the database.")

        existing_set = set(existing_ids)
        missing_ids = [user_id for user_id in requested_ids if user_id not in existing_set]
        errors = [{"user_id": user_id, "error": "User not found."} for user_id in missing_ids]
        # Track user deletion
        track_custom_event(
            user_id="admin",  # This endpoint is typically admin-only
            event_name="users_batch_deleted",
            properties={
                "deleted_count": deleted_count,
                "requested_count": len(requested_ids),
                "failed_count": len(missing_ids),
            }
        )
        return {
            "deleted_count": deleted_count,
            "deleted_users": [{"user_id": user_id} for user_id in existing_ids],
            "total_requested": len(requested_ids),
            "errors": errors,
        }
    except Exception as e:
        logger.error(f"Error deleting accounts: {e}")
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error deleting accounts.")


@accounts_router.patch(
    "/users/{user_id}",
    response_model=AccountItemResponse,
    responses={
        400: {"description": "No fields to update."},
        403: {"description": "Not authorized to transfer ownership."},
        404: {"description": "Account or Requester not found."}
    }
)
def update_account(
    user_id: int, 
    updated_fields: UpdateAccountRequest, 
    db: Annotated[Session, Depends(get_db)],
    claims: Annotated[dict, Depends(get_current_user)] # This returns the JWT dict
):
    # 1. Fetch the actual DB object for the logged-in user (the requester)
    # Using 'sub' or 'user_id' depending on your JWT payload structure
    requester_identifier = claims.get("sub") or claims.get("user_id")
    
    if "@" in str(requester_identifier):
        # Query by email if it looks like an email address
        current_user_obj = db.query(UserAccount).filter(UserAccount.email == requester_identifier).first()
    else:
        # Query by ID if it's a number
        current_user_obj = db.query(UserAccount).filter(UserAccount.user_id == int(requester_identifier)).first()
    
    if not current_user_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Logged-in user record not found.")

    # 2. Fetch the target account being edited
    target_account = db.query(UserAccount).filter(UserAccount.user_id == user_id).first()
    if not target_account:
        logger.warning(f"Account with ID {user_id} not found.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target account not found.")

    update_data = updated_fields.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update.")

    # 3. Handle Ownership Transfer Logic
    if update_data.get("user_type") == "owner":
        # Check if the person making the request is actually the current owner
        if current_user_obj.user_type != "owner":
            logger.error(f"User {current_user_obj.user_id} attempted unauthorized ownership transfer.")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="Only the current Owner can transfer ownership."
            )
        
        # Check if they are trying to promote themselves (redundant but safe)
        if current_user_obj.user_id == user_id:
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You are already the owner.")

        # ATOMIC SWAP: Downgrade current owner to admin
        current_user_obj.user_type = "admin"
        db.add(current_user_obj) # Explicitly add to session to track the change
        logger.info(f"User {current_user_obj.user_id} is being downgraded to admin due to transfer.")

    # 4. Apply other field updates to the target account
    for key, value in update_data.items():
        setattr(target_account, key, value)

    try:
        db.commit() # Atomic: Both requester -> admin AND target -> owner save here
        db.refresh(target_account)
        # We don't necessarily need to refresh current_user_obj unless returning it
        logger.info(f"Ownership successfully transferred from {current_user_obj.user_id} to {user_id}.")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to commit ownership transfer: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database update failed.")

    # 5. Track account update
    track_custom_event(
        user_id=str(user_id),
        event_name="account_updated",
        properties={
            "updated_fields": list(update_data.keys()),
            "ownership_transferred": update_data.get("user_type") == "owner",
        }
    )

    return {
        "user_id": target_account.user_id,
        "first_name": target_account.first_name,
        "last_name": target_account.last_name,
        "email": target_account.email,
        "user_type": target_account.user_type,
    }
    
    
@accounts_router.get(
    "/users/{user_id}/preferences",
    responses={404: {"description": "Preferences not found."}}
)
def get_user_preferences(user_id: int, db: Annotated[Session, Depends(get_db)]):
    prefs = db.query(UserPreferences).filter(UserPreferences.user_id == user_id).first()
    if not prefs:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Preferences not found.")
    logger.info(f"Fetched preferences for user ID {user_id}.")
    return {
        "theme": prefs.theme,
        "notifications_enabled": prefs.notifications_enabled,
    }


@accounts_router.patch(
    "/users/{user_id}/preferences",
    responses={
        400: {"description": "No fields to update."},
        404: {"description": "Preferences not found."},
    }
)
def update_user_preferences(
    user_id: int,
    updated_fields: UpdatePreferencesRequest,
    db: Annotated[Session, Depends(get_db)],
):
    prefs = db.query(UserPreferences).filter(UserPreferences.user_id == user_id).first()
    if not prefs:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Preferences not found.")

    update_data = updated_fields.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update.")

    for key, value in update_data.items():
        setattr(prefs, key, value)

    db.commit()
    db.refresh(prefs)
    logger.info(f"Updated preferences for user ID {user_id}.")

    track_custom_event(
        user_id=str(user_id),
        event_name="preferences_updated",
        properties={
            "updated_fields": list(update_data.keys()),
        }
    )

    return {
        "theme": prefs.theme,
        "notifications_enabled": prefs.notifications_enabled,
    }
