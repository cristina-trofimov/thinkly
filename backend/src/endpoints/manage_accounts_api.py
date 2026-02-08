from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from models.schema import UserAccount
from DB_Methods.database import get_db
from pydantic import BaseModel, Field
from typing import Annotated, Optional
import logging

logger = logging.getLogger(__name__)
accounts_router = APIRouter(tags=["Accounts"])

class DeleteAccountsRequest(BaseModel):
    user_ids: list[int] = Field(..., min_items=1)

class UpdateAccountRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    user_type: Optional[str] = None

@accounts_router.get("/users")
def get_all_accounts(db: Annotated[Session, Depends(get_db)]):
    accounts = db.query(UserAccount).all()
    logger.info(f"Fetched {len(accounts)} accounts from the database.")
    return accounts

@accounts_router.delete(
    "/users/batch-delete",
    responses={ 500: { "description": "Error deleting accounts." } }
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
               400: { "description": "No fields to update." },
               404: { "description": "Account not found." }
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
    return account
