import os, time, requests
from fastapi import APIRouter, HTTPException
from dotenv import load_dotenv
import logging

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()
JUDGE0_URL = os.getenv("JUDGE0_URL")

if not JUDGE0_URL:
    logger.critical("FATAL: Missing judge0 url.")
    raise SystemExit("Missing judge0 url.")

judge0_router = APIRouter(tags=["Judge0"])

def judge0_get_output(
    token: str,
    interval_ms: int = 500,
    max_attempts: int = 300,
):
    try:
        if max_attempts == 0:
            raise RuntimeError("Judge0 polling timed out")
        
        resp = requests.get(f"{JUDGE0_URL}/submissions/{token}")
        resp.raise_for_status()
        
        data = resp.json()
        status = data['status']['description']
        
        if status in ("In Queue", "Processing"):
            time.sleep(interval_ms / 1000)
            return judge0_get_output(token, interval_ms, max_attempts - 1)
        # logger.info(f"SUCCESS: Email sent successfully. Message ID: {resp.json().get('messageId')}")
        return data
    
    except Exception as e:
        logger.exception("Network error when getting Judge0 output")
        raise RuntimeError(f"Network error when getting Judge0 output: {e}")

def submit_to_judge0(
    source_code: str,
    language_id: str,
    stdin: str,
    expected_output: str | None = None,
):
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

    try:
        logger.debug(f"Posting to Judge0...")
        post_resp = requests.post(f"{JUDGE0_URL}/submissions", json=payload)
        post_resp.raise_for_status()
        
        results = judge0_get_output(post_resp.json()['token'])
        return results

    except Exception as e:
        logger.exception("Network error when running code with Judge0")
        raise RuntimeError(f"Network error when running code with Judge0: {e}")

# Routes
@judge0_router.post("/",
    responses={ 400: { "description": "Error sending problem to Judge0." } }
)
async def judge0_run_code(request: dict):
    try:
        response = await submit_to_judge0(
            source_code=request["source_code"],
            language_id=request['language_id'],
            stdin=request['stdin'],
            expected_output=request["expected_output"]
        )
        return {"ok": True, **response}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
