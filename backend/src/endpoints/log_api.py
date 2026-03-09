from fastapi import APIRouter, Request, status, HTTPException
from pydantic import BaseModel
import logging
import re

logger = logging.getLogger("client_logger")
log_router = APIRouter(tags=["Logging"])

class ClientLogPayload(BaseModel):
    level: str = "INFO"
    message: str
    component: str
    url: str
    stack: str | None = None

CONTROL_CHARS = re.compile(r"[\r\n\t]")

def sanitize(value: str | None, max_len: int = 500) -> str:
    if value is None:
        return ""
    s = str(value)
    s = CONTROL_CHARS.sub(lambda m: {"\n": "\\n", "\r": "\\r", "\t": "\\t"}[m.group()], s)
    if len(s) > max_len:
        s = s[:max_len] + "...(truncated)"
    return s

ALLOWED_LEVELS = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}

@log_router.post("/client-log", status_code=status.HTTP_204_NO_CONTENT)
async def capture_client_log(log_data: ClientLogPayload, request: Request):
    try:
        url = sanitize(log_data.url)
        component = sanitize(log_data.component)
        message = sanitize(log_data.message)

        first_stack_line = ""
        if log_data.stack:
            # take first line only, then sanitize & truncate
            first_stack_line = sanitize(log_data.stack.splitlines()[0], max_len=300)

        level = sanitize(log_data.level, max_len=20).upper()
        log_func = getattr(logger, level.lower(), logger.info) if level in ALLOWED_LEVELS else logger.info

        log_func(
            "ClientLog url=%s component=%s message=%s stack=%s",
            url,
            component,
            message,
            first_stack_line,
        )

    except Exception as e:
        logger.exception("Internal error processing client log request: %s", type(e).__name__)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal logging error",
        )