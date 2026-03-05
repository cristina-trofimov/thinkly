import logging
from typing import Annotated
from sqlalchemy.orm import Session
from database_operations.database import get_db
from models.schema import UserPreferences
from sqlalchemy.exc import SQLAlchemyError
from fastapi import APIRouter, HTTPException, Depends

logger = logging.getLogger(__name__)

user_preferences_router = APIRouter(tags=["Preferences"])

def query_get_prefs(
    db: Session, user_id: int
):  
    try:
        query = db.query(UserPreferences).filter_by(user_id = user_id).first()

        logger.info("Database: Fetched user preferences.")
        
        return query
    except SQLAlchemyError as e:
        logger.error(f"Database: getting user preferences query error: {e}")
        raise HTTPException(status_code=500, detail=f"Database: getting user preferences query error: {str(e)}")


@user_preferences_router.get("/all", response_model = dict,
    responses={500: {"description": "Error retrieving user preferences."}}
)
def get_all_prefs(
    db: Annotated[Session, Depends(get_db)],
    user_id: int
):
    try:
        query = query_get_prefs(db, user_id)

        return {"status_code": 200, 'data': query}
    except Exception as e:
        logger.error(f"Error fetching user preferences: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve user preferences. Exception: {str(e)}")
        
    

@user_preferences_router.post("/theme", status_code=201,
    responses={500: {"description": "Failed to update user themes."}}
)
def update_user_theme(
    db: Annotated[Session, Depends(get_db)],
    request: dict,
):
    try:
        pref = query_get_prefs(db, request['user_id'])

        pref.theme = request['theme']

        db.commit()
        db.refresh(pref)

        logger.info("Updated user's prefered theme.")

        return {"status_code": 200, 'data': pref}
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating user's prefered theme: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update user's prefered theme. Exception: {str(e)}")


@user_preferences_router.post("/notif", status_code=201,
    responses={500: {"description": "Failed to update user notifications_enabled."}}
)
def update_notifications(
    db: Annotated[Session, Depends(get_db)],
    request: dict,
):
    try:
        pref = query_get_prefs(db, request['user_id'])

        pref.notifications_enabled = request['notifications_enabled']

        db.commit()
        db.refresh(pref)

        logger.info("Updated user's notification settings.")

        return {"status_code": 200, 'data': pref}
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating user's notification settings: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update user's notification settings. Exception: {str(e)}")


@user_preferences_router.post("/prog", status_code=201,
    responses={500: {"description": "Failed to update user last_used_programming_language."}}
)
def update_last_prog(
    db: Annotated[Session, Depends(get_db)],
    request: dict,
):
    try:
        pref = query_get_prefs(db, request['user_id'])

        pref.last_used_programming_language = request['last_used_programming_language'],

        db.commit()
        db.refresh(pref)

        logger.info("Updated user's last programming language.")

        return {"status_code": 200, 'data': pref}
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating user's last programming language: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update user's last programming language. Exception: {str(e)}")


@user_preferences_router.post("/update", status_code=201,
    responses={500: {"description": "Failed to add/update all user preferences."}}
)
def update_all_prefs(
    db: Annotated[Session, Depends(get_db)],
    request: dict,
):
    try:
        pref = query_get_prefs(db, request['user_id'])

        if pref is None:
            pref = UserPreferences(
                user_id = request['user_id'],
                theme = request['theme'],
                notifications_enabled = request['notifications_enabled'],
                last_used_programming_language = request['last_used_programming_language']
            )
            db.add(pref)
        else:
            pref.theme = request['theme']
            pref.notifications_enabled = request['notifications_enabled']
            pref.last_used_programming_language = request['last_used_programming_language']

        db.commit()
        db.refresh(pref)

        logger.info("Added/Updated all user preferences.")

        return {"status_code": 200, 'data': pref}
    except Exception as e:
        db.rollback()
        logger.error(f"Error adding/updating all user preferences: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to add/update all user preferences. Exception: {str(e)}")
