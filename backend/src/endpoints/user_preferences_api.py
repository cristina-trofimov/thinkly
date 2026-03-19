import logging
from typing import Annotated
from sqlalchemy.orm import Session
from database_operations.database import get_db
from models.schema import UserPreferences
from sqlalchemy.exc import SQLAlchemyError
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

logger = logging.getLogger(__name__)

user_preferences_router = APIRouter(tags=["Preferences"])

USER_NOT_FOUND = "User preferences not found"

class UserPref(BaseModel):
    pref_id: int
    user_id: int
    theme: str
    notifications_enabled: bool
    last_used_programming_language: int | None

def query_get_prefs(
    db: Session, user_id: int
):  
    try:
        query = db.query(UserPreferences).filter_by(user_id = user_id).first()

        logger.info("Database: Fetched user preferences.")
        
        return query
    except SQLAlchemyError as e:
        logger.error(f"Database: getting user preferences query error: {e}")
        raise HTTPException(status_code=500, detail="Failed to query user preferences.")


@user_preferences_router.get("/all", response_model = dict,
    responses={
        500: {"description": "Error retrieving user preferences."},
        404: {"description": USER_NOT_FOUND}
    }
)
def get_all_prefs(
    db: Annotated[Session, Depends(get_db)],
    user_id: int
):
    try:
        pref = query_get_prefs(db, user_id)
        
        if not pref:
            return {"status_code": 404, "error": USER_NOT_FOUND}

        return {"status_code": 200, 'data': UserPref(
            pref_id= pref.pref_id,
            user_id = pref.user_id,
            theme = pref.theme,
            notifications_enabled = pref.notifications_enabled,
            last_used_programming_language = pref.last_used_programming_language,
            ).model_dump()
        }
    except Exception as e:
        logger.error(f"Error fetching user preferences: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve user preferences.")

@user_preferences_router.patch("/theme", status_code=201,
    responses={
        500: {"description": "Failed to update user themes."},
        404: {"description": USER_NOT_FOUND}
    }
)
def update_user_theme(
    db: Annotated[Session, Depends(get_db)],
    request: dict,
):
    try:
        pref = query_get_prefs(db, request['user_id'])
        
        if not pref:
            return {"status_code": 404, "error": USER_NOT_FOUND}

        pref.theme = request['theme']

        db.commit()
        db.refresh(pref)

        logger.info("Updated user's prefered theme.")

        return {"status_code": 200, 'data': UserPref(
            pref_id= pref.pref_id,
            user_id = pref.user_id,
            theme = pref.theme,
            notifications_enabled = pref.notifications_enabled,
            last_used_programming_language = pref.last_used_programming_language,
            ).model_dump()
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating user's prefered theme: {e}")
        raise HTTPException(status_code=500, detail="Failed to update user's preferred theme.")


@user_preferences_router.patch("/notif", status_code=201,
    responses={
        500: {"description": "Failed to update user notifications_enabled."},
        404: {"description": USER_NOT_FOUND}
    }
)
def update_notifications(
    db: Annotated[Session, Depends(get_db)],
    request: dict,
):
    try:
        pref = query_get_prefs(db, request['user_id'])
        
        if not pref:
            return {"status_code": 404, "error": USER_NOT_FOUND}

        pref.notifications_enabled = request['notifications_enabled']

        db.commit()
        db.refresh(pref)

        logger.info("Updated user's notification settings.")

        return {"status_code": 200, 'data': UserPref(
            pref_id= pref.pref_id,
            user_id = pref.user_id,
            theme = pref.theme,
            notifications_enabled = pref.notifications_enabled,
            last_used_programming_language = pref.last_used_programming_language,
            ).model_dump()
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating user's notification settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to update user's notification settings.")


@user_preferences_router.patch("/prog", status_code=201,
    responses={
        500: {"description": "Failed to update user last_used_programming_language."},
        404: {"description": USER_NOT_FOUND}
    }
)
def update_last_prog(
    db: Annotated[Session, Depends(get_db)],
    request: dict,
):
    try:
        pref = query_get_prefs(db, request['user_id'])
        
        if not pref:
            return {"status_code": 404, "error": USER_NOT_FOUND}

        pref.last_used_programming_language = request['last_used_programming_language']

        db.commit()
        db.refresh(pref)

        logger.info("Updated user's last programming language.")

        return {"status_code": 200, 'data': UserPref(
            pref_id= pref.pref_id,
            user_id = pref.user_id,
            theme = pref.theme,
            notifications_enabled = pref.notifications_enabled,
            last_used_programming_language = pref.last_used_programming_language,
            ).model_dump()
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating user's last programming language: {e}")
        raise HTTPException(status_code=500, detail="Failed to update user's last programming language.")


@user_preferences_router.post("/add", status_code=201,
    responses={
        500: {"description": "Failed to add/update all user preferences."},
        404: {"description": USER_NOT_FOUND}
    }
)
def add_new_prefs(
    db: Annotated[Session, Depends(get_db)],
    request: dict,
):
    try:
        pref = query_get_prefs(db, request['user_id'])

        if not pref:
            return {"status_code": 404, "error": USER_NOT_FOUND}
        
        pref.theme = request['theme']
        pref.notifications_enabled = request['notifications_enabled']
        pref.last_used_programming_language = request['last_used_programming_language']

        db.commit()
        db.refresh(pref)

        logger.info("Added/Updated all user preferences.")

        return {"status_code": 200, 'data': UserPref(
            pref_id= pref.pref_id,
            user_id = pref.user_id,
            theme = pref.theme,
            notifications_enabled = pref.notifications_enabled,
            last_used_programming_language = pref.last_used_programming_language,
            ).model_dump()
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error adding/updating all user preferences: {e}")
        raise HTTPException(status_code=500, detail="Failed to update user preferences.")
