from fastapi import APIRouter, Request, status, HTTPException
from pydantic import BaseModel
import logging

logger = logging.getLogger("client_logger") 

log_router = APIRouter(tags=["Logging"])

# Pydantic model must match the payload structure from React
class ClientLogPayload(BaseModel):
    level: str = "INFO"
    message: str
    component: str
    url: str
    stack: str | None = None

@log_router.post("/client-log", status_code=status.HTTP_204_NO_CONTENT)
async def capture_client_log(log_data: ClientLogPayload, request: Request):
    """
    Receives structured logs from the React frontend and manually formats them 
    into a comprehensive PLAIN TEXT message.
    """
    try:
        # Manually combine structured data into the message string
        context_str = f" | URL: {log_data.url} | COMP: {log_data.component}"
        
        # Build the final message string
        final_message = f"{log_data.message} {context_str}"
        
        if log_data.stack:
            # Append stack trace (truncated) to the end of the log line
            final_message += f" | STACK_SNIPPET: {log_data.stack.splitlines()[0]}..."

        # Determine the logging function (e.g., logger.error)
        log_level = log_data.level.upper()

        if log_level in ("DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"):
            log_func = getattr(logger, log_level.lower())
        else:
            log_func = logger.info
        
        # Log the final plain text message
        log_func(final_message)

    except Exception as e:
        # Log the internal failure of the logging endpoint itself
        logger.exception(f"Internal error processing client log request: {type(e).__name__}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal logging error")