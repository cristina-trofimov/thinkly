import logging
from typing import Annotated
from pydantic import BaseModel
from DB_Methods.database import get_db
from models.schema import QuestionInstance
from fastapi import APIRouter, HTTPException, Depends, Query

logger = logging.getLogger(__name__)

question_instance_router = APIRouter(tags=["Instances"])

class QuestionInstanceModel(BaseModel):
    question_id: int
    event_id: int | None = None
    points: int
    riddle_id: int | None = None
    is_riddle_completed: bool = False


@question_instance_router.get("/find",
    responses={400: {"description": "Error retrieving question instance."}}
)
def get_question_instance(
    db: Annotated[str, Depends(get_db)],
    question_id: int,
    event_id: Annotated[int | None, Query()] = None,
):
    print("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n")
    print(f"question_id: {question_id}")
    print(f"event_id: {event_id}")
    print("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")
    
    try:
        instance = db.query(QuestionInstanceModel).filter_by(
            question_id = int(question_id),
            event_id = int(event_id) if isinstance(event_id, int) else None
            ).all()
        logger.info(f"Fetched question instance from the database.")

        return {"status_code": 200, **instance}
    except Exception as e:
        logger.error(f"Error fetching question instance: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve question instance. Exception: {str(e)}")


@question_instance_router.post("/update",
    status_code=201,
    responses={500: {"description": "Failed to upload question instance."}}
)
def create_question_instance(
    db: Annotated[str, Depends(get_db)],
    request: dict,
):
    print("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n")
    print(request)
    print("\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")
    try:
        instance = None

        # If event_id is null -> practicing: save automaticall
        if request['event_id'] is None:
            print("request")
            instance = QuestionInstance(
                question_id = request['question_id'],
                event_id = request['event_id'],
                points = request['points'],
                riddle_id = request['riddle_id'],
                is_riddle_completed = request['is_riddle_completed'],
            )
            db.add(instance)
        else:
            print("1"*30)
            
            # get instance
            instance = get_question_instance(db, {
                "question_id": request['question_id'],
                "event_id": request['event_id'],
            })

            if instance is None:
                print("2"*30)

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
                print("3"*30)
                
                # update if it exist
                for field, value in request.model_dump(exclude_unset=True).items():
                    setattr(instance, field, value)

        db.commit()

        logger.info(f"Uploaded question instance.")

        return {"status_code": 200, "message": f"Successfully uploaded question instance", **instance.__dict__}
    except Exception as e:
        db.rollback()
        logger.error(f"Error uploading question instance: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload question instance. Exception: {str(e)}")
