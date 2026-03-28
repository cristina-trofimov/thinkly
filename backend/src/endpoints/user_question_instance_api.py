import logging
from typing import Annotated
from sqlalchemy.orm import Session
from database_operations.database import get_db
from models.schema import UserQuestionInstance
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

logger = logging.getLogger(__name__)

user_question_instance_router = APIRouter(tags=["User_Question_Instances"])

class UserQuestionInstanceModel(BaseModel):
    user_question_instance_id: int
    user_id: int
    question_instance_id: int
    points: int | None = None
    riddle_complete: bool | None = None
    lapse_time: int | None = None
    attempts: int | None = None

@user_question_instance_router.get("/instance", response_model = dict,
    responses={500: {"description": "Error retrieving question instance for a user."}}
)
def get_user_question_instance(
    db: Annotated[Session, Depends(get_db)],
    user_id: int,
    question_instance_id: int
):
    try:
        query = db.query(UserQuestionInstance).filter_by(
            user_id = user_id, question_instance_id = question_instance_id).first()

        logger.info("Fetched user's question instance from the database.")

        data = None
        if query is not None: 
            data = UserQuestionInstanceModel(
                user_question_instance_id = query.user_question_instance_id,
                user_id = query.user_id,
                question_instance_id = query.question_instance_id,
                points = query.points,
                riddle_complete = query.riddle_complete,
                lapse_time = query.lapse_time,
                attempts = query.attempts
            )

        return {"status_code": 200, 'data': data}
    except Exception as e:
        logger.error(f"Error fetching user's question instance from db: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve user's question instance from db.")


@user_question_instance_router.put("/put", status_code=201,
    responses={500: {"description": "Failed to update user's question instance."}}
)
def add_user_question_instance(
    db: Annotated[Session, Depends(get_db)],
    request: dict,
):
    try:
        query = db.query(UserQuestionInstance).filter_by(
            user_id = request['user_id'],
            question_instance_id = request['question_instance_id']).first()

        if query is None:
            print("adding")
            query = UserQuestionInstance(
                user_id = request['user_id'],
                question_instance_id = request['question_instance_id'],
                points = request['points'],
                riddle_complete = request['riddle_complete'],
                lapse_time = request['lapse_time'],
                attempts = request['attempts']
            )
            db.add(query)
        else:
            print("updating")
            # update if it exists — never overwrite a non-null points value with null
            # (prevents accidental score reset when the UQI is re-initialised on re-join)
            query.user_id = request['user_id']
            query.question_instance_id = request['question_instance_id']
            if request['points'] is not None:
                query.points = request['points']
            query.riddle_complete = request['riddle_complete']
            query.lapse_time = request['lapse_time']
            query.attempts = request['attempts']

        db.commit()
        db.refresh(query)

        logger.info("Uploaded user's question instance.")

        return {"status_code": 200, 'data': UserQuestionInstanceModel(
            user_question_instance_id = query.user_question_instance_id,
            user_id = query.user_id,
            question_instance_id = query.question_instance_id,
            points = query.points,
            riddle_complete = query.riddle_complete,
            lapse_time = query.lapse_time,
            attempts = query.attempts
        )}
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating user's question instance: {e}")
        raise HTTPException(status_code=500, detail="Failed to update user's question instance.")
