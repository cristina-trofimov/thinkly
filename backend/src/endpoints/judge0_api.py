import os
import time
import requests
from fastapi import APIRouter, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from dotenv import load_dotenv
import logging
from services.posthog_analytics import track_custom_event


limiter = Limiter(key_func=get_remote_address)

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


def judge0_get_outputs(
        tokens: list[str],
        interval_ms: int = 500,
        max_attempts: int = 300,
) -> dict:
    """
    Retrieve and aggregate results for multiple batch submissions from Judge0.

    Returns the first failing submission result if any test case fails,
    or the last submission result if all are accepted.

    :param tokens: List of submission tokens.
    :param interval_ms: Polling interval in milliseconds.
    :param max_attempts: Maximum number of polling attempts.
    :return: A single submission result dict — failing one if any failed, else the last accepted.
    """
    _validate_judge0_url()

    token_str = ",".join(tokens)
    for _ in range(max_attempts):
        try:
            resp = requests.get(f"{JUDGE0_URL}/submissions/batch?tokens={token_str}")
            resp.raise_for_status()

            data = resp.json()
            submissions = data.get("submissions", data) if isinstance(data, dict) else data

            # Keep polling if any submission is still in progress
            statuses = [item["status"]["description"] for item in submissions]
            if any(status in ("In Queue", "Processing") for status in statuses):
                time.sleep(interval_ms / 1000)
                continue

            # All done — find the first non-accepted result
            for submission in submissions:
                if submission["status"]["description"] != "Accepted":
                    return submission

            # All accepted — return the last one as the representative result
            # Calculate average time and memory
            total_time = sum(float(submission.get("time", 0) or 0) for submission in submissions)
            total_memory = sum(float(submission.get("memory", 0) or 0) for submission in submissions)
            num_submissions = len(submissions)

            average_time = total_time / num_submissions if num_submissions > 0 else 0
            average_memory = total_memory / num_submissions if num_submissions > 0 else 0

            average_submission = {
                "stdout": "All testcases passed.",
                "time": f"{average_time:.2f}",
                "memory": f"{average_memory:.2f}",
                "stderr": None,
                "token": None,
                "compile_output": None,
                "message": None,
                "status": {
                    "id": submissions[0].get("status").get("id"),
                    "description": "Accepted"
                }
            }

            return average_submission

        except Exception as e:
            logger.exception("Network error when getting Judge0 batch outputs")
            raise RuntimeError(f"Network error when getting Judge0 batch outputs: {e}")

    raise RuntimeError("Judge0 batch polling timed out")


def submit_to_judge0(
        submissions: list[dict],
        user_id: str = "anonymous",
):

    _validate_judge0_url()

    # Construct the batch payload
    batch_payload = {"submissions": []}
    for submission in submissions:
        payload = {
            "source_code": submission["source_code"],
            "language_id": submission["language_id"],
            "stdin": submission.get("stdin", ""),
            "expected_output": str(submission["expected_output"]) if isinstance(submission.get("expected_output"), dict) else submission.get("expected_output"),
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
        batch_payload["submissions"].append(payload)

    try:

        # Track batch submission event
        track_custom_event(
            user_id=user_id,
            event_name="code_submitted",
            properties={
                "language_id": submissions[0]["language_id"],
                "has_stdin": len(submissions[0].get("stdin", "")) > 0,
                "has_expected_output": submissions[0].get("expected_output") is not None,
                "code_length": len(submissions[0]["source_code"]),
            }
        )

        # Post the batch payload
        post_resp = requests.post(f"{JUDGE0_URL}/submissions/batch", json=batch_payload)
        logger.debug(f"Judge0 batch submission response: {post_resp.status_code} - {post_resp.text}")
        post_resp.raise_for_status()

        # Extract all tokens from the response
        tokens = [item['token'] for item in post_resp.json()]

        # Retrieve results for all tokens
        # After
        result = judge0_get_outputs(tokens)

        status_description = result.get('status', {}).get('description', 'Unknown')
        track_custom_event(
            user_id=user_id,
            event_name="code_execution_completed",
            properties={
                "status": status_description,
                "execution_time": result.get('time'),
                "memory_used": result.get('memory'),
                "is_accepted": status_description == "Accepted",
                "is_correct": status_description == "Accepted",
                "has_compile_error": "Compilation Error" in status_description,
                "has_runtime_error": "Runtime Error" in status_description,
                "token": result.get('token'),
            }
        )

        return result
    
    except Exception as e:
        logger.exception("Network error when running batch code with Judge0")

        # Track execution error
        track_custom_event(
            user_id=user_id,
            event_name="batch_code_execution_error",
            properties={
                "error_message": str(e),
                "error_type": "network_error",
            }
        )

        raise RuntimeError(f"Network error when running batch code with Judge0: {e}")


def check_all_submissions_passed(submissions: list[dict]) -> bool:
    """
    Check if all submissions in the response have passed.

    :param submissions: List of submission results from Judge0.
    :return: True if all submissions are "Accepted", False otherwise.
    """
    for submission in submissions:
        status_description = submission.get("status", {}).get("description", "")
        if status_description != "Accepted":
            return False
    return True


# Routes
@judge0_router.post("",
                    responses={400: {"description": "Error sending problem to Judge0."}}
                    )
@limiter.limit("5/minute")
def judge0_run_code(request: Request, body: dict = None):
    # Extract user_id from request if available (set by frontend or auth middleware)
    user_id = body.get("user_id", "anonymous") if body else "anonymous"
    logger.debug(f"Received code submission request from user_id: {user_id}")

    try:
        # Extract submissions from the body
        submissions = body.get("submissions", []) if body else []

        if not submissions:
            raise HTTPException(status_code=400, detail="No submissions provided.")

        response = submit_to_judge0(
            submissions=submissions,
            user_id=user_id,
        )

        return {"ok": True, "status_code": 200, **response}
    except Exception:
        # Error is already tracked in submit_to_judge0, just raise HTTP exception
        raise HTTPException(status_code=400, detail="Failed to run code.")