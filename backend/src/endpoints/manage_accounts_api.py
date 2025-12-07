from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from models.schema import *
from DB_Methods.database import get_db
import logging

logger = logging.getLogger(__name__)
accounts_router = APIRouter(tags=["Accounts"])

@accounts_router.get("/users")
def get_all_accounts(db: Session = Depends(get_db)):
    accounts = db.query(UserAccount).all()
    logger.info(f"Fetched {len(accounts)} accounts from the database.")
    return accounts

@accounts_router.delete("/users/batch-delete")
def delete_multiple_accounts(user_ids: list[int], db: Session = Depends(get_db)):
    try:
        deleted_count = db.query(UserAccount).filter(UserAccount.user_id.in_(user_ids)).delete(synchronize_session=False)
        db.commit()
        logger.info(f"Deleted {deleted_count} accounts from the database.")
        return {"deleted_count": deleted_count}
    except Exception as e:
        logger.error(f"Error deleting accounts: {e}")
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error deleting accounts.")
    
@accounts_router.patch("/users/{user_id}")
def update_account(user_id: int, updated_fields: dict, db: Session = Depends(get_db)):
    account = db.query(UserAccount).filter(UserAccount.user_id == user_id).first()
    if not account:
        logger.warning(f"Account with ID {user_id} not found.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")
    
    for key, value in updated_fields.items():
        setattr(account, key, value)
    
    db.commit()
    db.refresh(account)
    logger.info(f"Updated account with ID {user_id}.")
    return account