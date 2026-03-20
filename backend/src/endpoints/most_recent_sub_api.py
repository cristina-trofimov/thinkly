import logging
from datetime import datetime
from typing import Annotated
from sqlalchemy.orm import Session
from database_operations.database import get_db
from models.schema import MostRecentSubmission
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

logger = logging.getLogger(__name__)

most_recent_sub_router = APIRouter(tags=["Last_Runs"])


class MostRecentSubModel(BaseModel):
    row_id: int
    user_question_instance_id: int
    code: str
    lang_judge_id: int
    submitted_on: datetime

    class Config:
        from_attributes = True


class MostRecentSubRequest(BaseModel):
    user_question_instance_id: int
    code: str
    lang_judge_id: int
    submitted_on: datetime


@most_recent_sub_router.get("/latest", response_model=dict,
                            responses={500: {"description": "Error retrieving most recent submission."}}
                            )
def get_most_recent_sub(
        db: Annotated[Session, Depends(get_db)],
        user_question_instance_id: int
):
    try:
        query = db.query(MostRecentSubmission).filter_by(user_question_instance_id=user_question_instance_id).first()

        logger.info("Fetched most recent submission from the database.")

        data = None
        if query is not None:
            data = MostRecentSubModel(
                row_id=query.row_id,
                user_question_instance_id=query.user_question_instance_id,
                code=query.code,
                lang_judge_id=query.lang_judge_id,
                submitted_on=query.submitted_on
            )

        return {"status_code": 200, 'data': data}
    except Exception as e:
        logger.error(f"Error fetching most recent submission: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve most recent submission.")


@most_recent_sub_router.put("/put", status_code=201,
                            responses={500: {"description": "Failed to update most recent submission."}}
                            )
def add_most_recent_sub(
        db: Annotated[Session, Depends(get_db)],
        request: dict,
):
    try:
        recent_run = db.query(MostRecentSubmission).filter_by(
            user_question_instance_id=request['user_question_instance_id']).first()

        if recent_run is None:
            recent_run = MostRecentSubmission(
                user_question_instance_id=request['user_question_instance_id'],
                code=request['code'],
                lang_judge_id=request['lang_judge_id'],
                submitted_on=request['submitted_on']
            )
            db.add(recent_run)
        else:
            # update if it exist
            recent_run.user_question_instance_id = request['user_question_instance_id']
            recent_run.code = request['code']
            recent_run.lang_judge_id = request['lang_judge_id']
            recent_run.submitted_on = request['submitted_on']

        db.commit()
        db.refresh(recent_run)

        logger.info("Uploaded most recent submission.")

        return {"status_code": 200, 'data': MostRecentSubModel(
            row_id=recent_run.row_id,
            user_question_instance_id=recent_run.user_question_instance_id,
            code=recent_run.code,
            lang_judge_id=recent_run.lang_judge_id,
            submitted_on=recent_run.submitted_on
        )}
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating most recent submission: {e}")
        raise HTTPException(status_code=500, detail="Failed to update most recent submission.")