import logging
from typing import Annotated, Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session
from DB_Methods.database import get_db
from models.schema import QuestionInstance
from sqlalchemy.exc import SQLAlchemyError
from fastapi import APIRouter, HTTPException, Depends, Query

logger = logging.getLogger(__name__)

question_instance_router = APIRouter(tags=["Instances"])

class QuestionInstanceModel(BaseModel):
    question_id: int
    event_id: int | None = None
    points: int | None = None
    riddle_id: int | None = None
    is_riddle_completed: bool = False

def query_get_question_instance(
    db: Session, question_id: int,
    event_id: Annotated[Optional[int], Query()] = None,
):  
    try:
        query = db.query(QuestionInstance).filter_by(question_id = question_id)

        if event_id is not None:
            query = query.filter_by(event_id = event_id)

        logger.info("Fetched question instance from the database.")
        
        return query
    except SQLAlchemyError as e:
        logger.error(f"Database: getting question instance query error: {e}")
        raise HTTPException(status_code=500, detail=f"Database: getting question instance query error: {str(e)}")


@question_instance_router.get("/find", response_model = dict,
    responses={500: {"description": "Error retrieving question instance."}}
)
def get_question_instance(
    db: Annotated[Session, Depends(get_db)],
    question_id: int,
    event_id: Annotated[Optional[int], Query()] = None,
):
    try:
        query = query_get_question_instance(db, question_id, event_id)

        instances = query.all()

        data = [
            {
                "question_instance_id": inst.question_instance_id,
                "event_id": inst.event_id,
                "question_id": inst.question_id,
                "points": inst.points,
                "riddle_id": inst.riddle_id,
                "is_riddle_completed": inst.is_riddle_completed,
            }
            for inst in instances
        ]

        logger.info("Fetched question instance from the database.")

        return {"status_code": 200, 'data': data}
    except Exception as e:
        logger.error(f"Error fetching question instance: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve question instance. Exception: {str(e)}")
        
    

@question_instance_router.post("/update",
    status_code=201,
    responses={500: {"description": "Failed to upload question instance."}}
)
def create_question_instance(
    db: Annotated[Session, Depends(get_db)],
    request: dict,
):
    try:
        instance = None

        # If event_id is null -> practicing: save automaticall
        if request['event_id'] is None:
            instance = QuestionInstance(
                question_id = request['question_id'],
                event_id = None,
                points = request['points'],
                riddle_id = request['riddle_id'],
                is_riddle_completed = request['is_riddle_completed'],
            )
            db.add(instance)
        else:
            # get instance
            instance = query_get_question_instance(db,
                request['question_id'],
                request['event_id']
            ).first()

            if instance is None:
                # If it doesn't exist already, create it
                instance = QuestionInstance(
                    question_id = request['question_id'],
                    event_id = request['event_id'],
                    points = request['points'],
                    riddle_id = request['riddle_id'],
                    is_riddle_completed = request['is_riddle_completed'],
                )
                db.add(instance)
            else:
                # update if it exist
                instance.question_id = request['question_id'],
                instance.event_id = request['event_id'],
                instance.points = request['points'],
                instance.riddle_id = request['riddle_id'],
                instance.is_riddle_completed = request['is_riddle_completed'],

        db.commit()
        db.refresh(instance)

        logger.info("Uploaded question instance.")

        return {"status_code": 200, 'data': {
            "question_instance_id": instance.question_instance_id,
            "event_id": instance.event_id,
            "question_id": instance.question_id,
            "points": instance.points,
            "riddle_id": instance.riddle_id,
            "is_riddle_completed": instance.is_riddle_completed,
        }}
    except Exception as e:
        db.rollback()
        logger.error(f"Error uploading question instance: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload question instance. Exception: {str(e)}")
