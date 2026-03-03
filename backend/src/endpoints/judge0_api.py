import os
import time
import requests
from fastapi import APIRouter, HTTPException
from dotenv import load_dotenv
import logging
from backend.src.services.posthog_analytics import track_custom_event

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()
JUDGE0_URL = os.getenv("JUDGE0_URL")

judge0_router = APIRouter(tags=["Judge0"])


def _validate_judge0_url():
    """Validate that JUDGE0_URL is configured. Called when actually needed."""
    if not JUDGE0_URL:
        logger.critical("FATAL: Missing judge0 url.")
        raise RuntimeError("Missing JUDGE0_URL environment variable. Please configure it in your .env file.")


def judge0_get_output(
        token: str,
        interval_ms: int = 500,
        max_attempts: int = 300,
):
    _validate_judge0_url()
    for _ in range(max_attempts):
        try:
            logger.debug("Getting Judge0 submission output...")
            resp = requests.get(f"{JUDGE0_URL}/submissions/{token}")
            resp.raise_for_status()

            data = resp.json()
            status = data['status']['description']

            if status not in ("In Queue", "Processing"):
                return data

            time.sleep(interval_ms / 1000)

        except Exception as e:
            logger.exception("Network error when getting Judge0 output")
            raise RuntimeError(f"Network error when getting Judge0 output: {e}")

    raise RuntimeError("Judge0 polling timed out")


def submit_to_judge0(
        source_code: str,
        language_id: str,
        stdin: str,
        expected_output: str | None = None,
        user_id: str = "anonymous",
):
    _validate_judge0_url()
    payload = {
        "source_code": source_code,
        "language_id": language_id,
        "number_of_runs": None,
        "stdin": stdin,
        "expected_output": expected_output,
        "cpu_time_limit": None,
        "cpu_extra_time": None,
        "wall_time_limit": None,
        "memory_limit": None,
        "stack_limit": None,
        "max_processes_and_or_threads": None,
        "enable_per_process_and_thread_time_limit": None,
        "enable_per_process_and_thread_memory_limit": None,
        "max_file_size": None,
        "enable_network": None
    }

    # Remove None fields, should be null
    payload = {k: v for k, v in payload.items() if v is not None}

    try:
        logger.debug("Posting to Judge0...")

        # Track code submission
        track_custom_event(
            user_id=user_id,
            event_name="code_submitted",
            properties={
                "language_id": language_id,
                "has_stdin": len(stdin) > 0,
                "has_expected_output": expected_output is not None,
                "code_length": len(source_code),
            }
        )

        post_resp = requests.post(f"{JUDGE0_URL}/submissions", json=payload)
        post_resp.raise_for_status()

        results = judge0_get_output(post_resp.json()['token'])

        # Track execution completion
        status_description = results.get('status', {}).get('description', 'Unknown')
        track_custom_event(
            user_id=user_id,
            event_name="code_execution_completed",
            properties={
                "language_id": language_id,
                "status": status_description,
                "execution_time": results.get('time'),
                "memory_used": results.get('memory'),
                "is_accepted": status_description == "Accepted",
                "is_correct": status_description == "Accepted",
                "has_compile_error": "Compilation Error" in status_description,
                "has_runtime_error": "Runtime Error" in status_description,
                "token": results.get('token'),
            }
        )

        return results

    except Exception as e:
        logger.exception("Network error when running code with Judge0")

        # Track execution error
        track_custom_event(
            user_id=user_id,
            event_name="code_execution_error",
            properties={
                "language_id": language_id,
                "error_message": str(e),
                "error_type": "network_error",
            }
        )

        raise RuntimeError(f"Network error when running code with Judge0: {e}")


# Routes
@judge0_router.post("",
                    responses={400: {"description": "Error sending problem to Judge0."}}
                    )
def judge0_run_code(request: dict):
    # Extract user_id from request if available (set by frontend or auth middleware)
    user_id = request.get("user_id", "anonymous")

    try:
        response = submit_to_judge0(
            source_code=request["source_code"],
            language_id=request['language_id'],
            stdin=request['stdin'],
            expected_output=request.get("expected_output"),
            user_id=str(user_id),
        )
        return {"ok": True, "status_code": 200, **response}
    except Exception as e:
        # Error is already tracked in submit_to_judge0, just raise HTTP exception
        raise HTTPException(status_code=400, detail=str(e))