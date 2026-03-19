import logging
from typing import Annotated, Optional
from sqlalchemy.orm import Session
from database_operations.database import get_db
from models.schema import QuestionInstance
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel

logger = logging.getLogger(__name__)

question_instance_router = APIRouter(tags=["Instances"])

class QuestionInstanceModel(BaseModel):
    question_instance_id: int
    question_id: int
    event_id: int | None = None
    riddle_id: int | None = None

@question_instance_router.get("/find", response_model = dict,
    responses={500: {"description": "Error retrieving a question instance."}}
)
def get_question_instance(
    db: Annotated[Session, Depends(get_db)],
    question_id: int,
    event_id: Annotated[Optional[int], Query()] = None,
):
    try:
        query = db.query(QuestionInstance).filter_by(question_id = question_id, event_id = event_id).first()

        logger.info("Fetched question instance from the database.")

        data = None
        if query is not None:
            data = QuestionInstanceModel(
                question_instance_id = query.question_instance_id,
                event_id =  query.event_id,
                question_id = query.question_id,
                riddle_id = query.riddle_id
            )

        return {"status_code": 200, 'data': data}
    except Exception as e:
        logger.error(f"Error fetching question instance: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve question instance. Exception: {str(e)}")


@question_instance_router.get("/by-event", response_model = dict,
    responses={500: {"description": "Error retrieving question instances associated to an event."}}
)
def get_all_question_instances_by_event_id(
    db: Annotated[Session, Depends(get_db)],
    event_id: int
):
    try:
        query = db.query(QuestionInstance).filter_by(event_id = event_id).all()

        instances = [
            QuestionInstanceModel(
                question_instance_id = inst.question_instance_id,
                event_id =  inst.event_id,
                question_id = inst.question_id,
                riddle_id = inst.riddle_id
            )
            for inst in query
        ]

        logger.info("Fetched question instances associated to an event from the database.")

        return {"status_code": 200, 'data': instances}
    except Exception as e:
        logger.error(f"Error fetching question instances associated to an event: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve question instances associated to an event. Exception: {str(e)}")
        

@question_instance_router.put("/put",
    status_code=201,
    responses={500: {"description": "Failed to push question instance."}}
)
def push_question_instance(
    db: Annotated[Session, Depends(get_db)],
    request: dict,
):
    try:
        # get instance
        instance = db.query(QuestionInstance).filter_by(
            question_id = request['question_id'],
            event_id = request['event_id']).first()

        if instance is None:
            # If it doesn't exist already, create it
            instance = QuestionInstance(
                question_id = request['question_id'],
                event_id = request['event_id'],
                riddle_id = request['riddle_id']
            )
            db.add(instance)
        else:
            # update if it exist
            instance.question_id = request['question_id']
            instance.event_id = request['event_id']
            instance.riddle_id = request['riddle_id']

        db.commit()
        db.refresh(instance)

        logger.info("Pushed question instance.")

        return {"status_code": 200, 'data': QuestionInstanceModel(
                question_instance_id = instance.question_instance_id,
                event_id =  instance.event_id,
                question_id = instance.question_id,
                riddle_id = instance.riddle_id
            )
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error pushing question instance: {e}")
        raise HTTPException(status_code=500, detail="Failed to push question instance.")
