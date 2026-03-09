from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import or_
from models.schema import Riddle
from database_operations.database import get_db, _commit_or_rollback
import logging
from typing import Annotated, Optional
import os
import time
import re
from urllib.parse import urlparse
from services.posthog_analytics import track_custom_event
from pydantic import BaseModel

from supabase import create_client, Client

logger = logging.getLogger(__name__)
riddles_router = APIRouter(tags=["Riddles"])
DEFAULT_PAGE_SIZE = 25
MAX_PAGE_SIZE = 100

# Supabase (server-side)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    logger.critical("FATAL: Missing SUPABASE_URL or SUPABASE_ANON_KEY. Riddle file uploads will be unavailable.")
    supabase = None
else:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

BUCKET = "uploads"
FOLDER = "public"
MAX_MB = 100
RIDDLE_NOT_FOUND="Riddle not found"


class RiddleListItemResponse(BaseModel):
    riddle_id: int
    riddle_question: str
    riddle_answer: str
    riddle_file: str | None = None


class PaginatedRiddlesResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[RiddleListItemResponse]


def serialize_riddle(riddle: Riddle) -> dict:
    return {
        "riddle_id": riddle.riddle_id,
        "riddle_question": riddle.riddle_question,
        "riddle_answer": riddle.riddle_answer,
        "riddle_file": riddle.riddle_file,
    }


def _get_riddle_or_404(db: Session, riddle_id: int) -> Riddle:
    riddle = db.query(Riddle).filter(Riddle.riddle_id == riddle_id).first()
    if not riddle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=RIDDLE_NOT_FOUND,
        )
    return riddle


def _apply_riddle_search(query, search: Optional[str]):
    if search and search.strip():
        needle = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Riddle.riddle_question.ilike(needle),
                Riddle.riddle_answer.ilike(needle),
            )
        )
    return query


def _paginate_query(query, page: int, page_size: int):
    total = query.count()
    offset = (page - 1) * page_size
    items = query.offset(offset).limit(page_size).all()
    return total, items


def _set_riddle_cache_headers(response: Response) -> None:
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"


def check_riddle_exists(db: Session, question: str) -> bool:
    return db.query(Riddle).filter(Riddle.riddle_question == question).first() is not None


def _validate_upload(file: UploadFile) -> None:
    allowed = (
        (file.content_type or "").startswith("image/")
        or (file.content_type or "").startswith("audio/")
        or (file.content_type or "").startswith("video/")
        or file.content_type == "application/pdf"
    )
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type. Use image/audio/video/pdf.",
        )


def _extract_storage_path_from_public_url(public_url: str) -> Optional[str]:
    """
    Expected public URL shape:
    .../storage/v1/object/public/{bucket}/{path}
    Returns "{path}" (without bucket) or None if cannot parse.
    """
    if not public_url:
        return None

    try:
        p = urlparse(public_url)
        marker = "/storage/v1/object/public/"
        idx = p.path.find(marker)
        if idx == -1:
            return None

        tail = p.path[idx + len(marker):]  # "{bucket}/{path}"
        if not tail.startswith(f"{BUCKET}/"):
            return None

        return tail[len(f"{BUCKET}/"):]  # "{path}"
    except Exception:
        return None


async def _upload_to_supabase(file: UploadFile) -> str:
    if supabase is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="File storage is not configured.",
        )
    content = await file.read()
    if len(content) > MAX_MB * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Max {MAX_MB}MB.",
        )

    safe_name = re.sub(r"[^a-zA-Z0-9._-]", "_", file.filename or "upload")
    path = f"{FOLDER}/{int(time.time() * 1000)}_{safe_name}"

    res = supabase.storage.from_(BUCKET).upload(
        path=path,
        file=content,
        file_options={
            "content-type": file.content_type or "application/octet-stream",
            "cache-control": "3600",
            "upsert": "false",
        },
    )

    if isinstance(res, dict) and res.get("error"):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {res['error']}",
        )

    public_url = supabase.storage.from_(BUCKET).get_public_url(path)
    return public_url


def _delete_from_supabase_by_public_url(public_url: str) -> None:
    if supabase is None:
        logger.warning("Supabase not configured — skipping file deletion.")
        return
    storage_path = _extract_storage_path_from_public_url(public_url)
    if not storage_path:
        logger.warning(f"Could not parse Supabase storage path from URL: {public_url}")
        return

    res = supabase.storage.from_(BUCKET).remove([storage_path])
    if isinstance(res, dict) and res.get("error"):
        logger.warning(f"Supabase remove error: {res['error']} for path: {storage_path}")


# ---------------- GET ONE ----------------
@riddles_router.get(
    "/{riddle_id}",
    status_code=status.HTTP_200_OK,
)
async def get_riddle_by_id(
    riddle_id: int,
    db: Annotated[Session, Depends(get_db)],
):
    logger.info(f"Public user requesting riddle ID {riddle_id}")

    try:
        return serialize_riddle(_get_riddle_or_404(db, riddle_id))

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error retrieving riddle {riddle_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve riddle",
        )


# ---------------- GET ALL ----------------
@riddles_router.get(
    "/",
    status_code=status.HTTP_200_OK,
    response_model=PaginatedRiddlesResponse,
)
async def list_riddles(
    response: Response,
    db: Annotated[Session, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = DEFAULT_PAGE_SIZE,
    search: Annotated[Optional[str], Query(max_length=200)] = None,
):
    logger.info("Public user requesting riddles page=%s page_size=%s", page, page_size)

    try:
        query = _apply_riddle_search(db.query(Riddle), search)
        query = query.order_by(Riddle.riddle_id.desc())
        total, riddles = _paginate_query(query, page, page_size)
        _set_riddle_cache_headers(response)

        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "items": [serialize_riddle(r) for r in riddles],
        }

    except Exception as e:
        logger.exception(f"Error retrieving riddles list: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve riddles",
        )


# ---------------- CREATE ----------------
@riddles_router.post(
    "/create",
    status_code=status.HTTP_201_CREATED,
)
async def create_riddle(
    question: Annotated[str, Form()],
    answer: Annotated[str, Form()],
    file: Annotated[Optional[UploadFile], File()] = None,
    db: Annotated[Session, Depends(get_db)]= None,
):
    logger.info("Anonymous user attempting to create new riddle")

    q = question.strip()
    a = answer.strip()

    if not q or not a:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question and Answer are required.",
        )

    if check_riddle_exists(db, q):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A riddle with this question already exists",
        )

    try:
        file_url: Optional[str] = None

        if file is not None:
            _validate_upload(file)
            file_url = await _upload_to_supabase(file)

        new_riddle = Riddle(
            riddle_question=q,
            riddle_answer=a,
            riddle_file=file_url,
        )

        db.add(new_riddle)
        _commit_or_rollback(db)
        db.refresh(new_riddle)

        # Track riddle creation
        track_custom_event(
            user_id="anonymous",  # Riddles can be created by anyone
            event_name="riddle_created",
            properties={
                "riddle_id": new_riddle.riddle_id,
                "has_file": file_url is not None,
                "question_length": len(q),
            }
        )

        return serialize_riddle(new_riddle)

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"FATAL error during riddle creation: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )


# ---------------- EDIT ----------------
@riddles_router.put(
    "/{riddle_id}",
    status_code=status.HTTP_200_OK,
)
async def edit_riddle(
    riddle_id: int,
    question: Annotated[Optional[str], Form()] = None,
    answer: Annotated[Optional[str], Form()] = None,
    file: Annotated[Optional[UploadFile], File()] = None,
    remove_file: Annotated[bool, Form()] = False,
    db: Annotated[Session, Depends(get_db)]=None
):
    try:
        riddle = _get_riddle_or_404(db, riddle_id)

        if question is not None:
            q = question.strip()
            if not q:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Riddle question cannot be empty",
                )
            if q != riddle.riddle_question and check_riddle_exists(db, q):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A riddle with this question already exists",
                )
            riddle.riddle_question = q

        if answer is not None:
            a = answer.strip()
            if not a:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Riddle answer cannot be empty",
                )
            riddle.riddle_answer = a

        if remove_file and riddle.riddle_file:
            _delete_from_supabase_by_public_url(riddle.riddle_file)
            riddle.riddle_file = None

        if file is not None:
            _validate_upload(file)
            if riddle.riddle_file:
                _delete_from_supabase_by_public_url(riddle.riddle_file)

            new_url = await _upload_to_supabase(file)
            riddle.riddle_file = new_url

        _commit_or_rollback(db)
        db.refresh(riddle)

        # Track riddle edit
        track_custom_event(
            user_id="anonymous",
            event_name="riddle_edited",
            properties={
                "riddle_id": riddle.riddle_id,
                "fields_updated": {
                    "question": question is not None,
                    "answer": answer is not None,
                    "file": file is not None or remove_file,
                }
            }
        )

        return serialize_riddle(riddle)

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error editing riddle {riddle_id}: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        )


# ---------------- DELETE ----------------
@riddles_router.delete(
    "/{riddle_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_riddle(
    riddle_id: int,
    db: Annotated[Session, Depends(get_db)],
):
    logger.info(f"Anonymous user attempting to delete riddle ID: {riddle_id}")

    try:
        riddle = _get_riddle_or_404(db, riddle_id)

        if riddle.riddle_file:
            _delete_from_supabase_by_public_url(riddle.riddle_file)

        db.delete(riddle)
        _commit_or_rollback(db)

        # Track riddle deletion
        track_custom_event(
            user_id="anonymous",
            event_name="riddle_deleted",
            properties={
                "riddle_id": riddle_id,
                "had_file": riddle.riddle_file is not None,
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error deleting riddle {riddle_id}: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete riddle",
        )

    return None
