from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from models.schema import UserAccount, UserPreferences
from database_operations.database import get_db
from pydantic import BaseModel, Field
from typing import Annotated, Literal, Optional
import logging
from services.posthog_analytics import track_custom_event

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

    query = query.order_by(UserAccount.created_at.desc(), UserAccount.user_id.desc())

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
    responses={
        400: {"description": "No fields to update."},
        404: {"description": "Account not found."}
    }
)
def update_account(user_id: int, updated_fields: UpdateAccountRequest, db: Annotated[Session, Depends(get_db)]):
    account = db.query(UserAccount).filter(UserAccount.user_id == user_id).first()
    if not account:
        logger.warning(f"Account with ID {user_id} not found.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")

    update_data = updated_fields.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update.")

    for key, value in update_data.items():
        setattr(account, key, value)

    db.commit()
    db.refresh(account)
    logger.info(f"Updated account with ID {user_id}.")

    # Track account update
    track_custom_event(
        user_id=str(user_id),
        event_name="account_updated",
        properties={
            "updated_fields": list(update_data.keys()),
            "field_count": len(update_data),
        }
    )

    return account

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
