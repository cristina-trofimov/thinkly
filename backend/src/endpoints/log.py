from fastapi import APIRouter, Request, status, HTTPException
from pydantic import BaseModel
import logging

# Ensure this logger is correctly configured in your setup_logging()
logger = logging.getLogger("client_logger") 
# We use a specific logger name here to easily identify client-side logs in Kibana

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
    Receives JSON logs from the React frontend, adds server context, and logs them 
    using the centralized JSON logger.
    """
    try:
        # Extra data to include in the JSON log record
        extra_data = {
            # Use 'request.client.host' or handle proxy headers if in production
            "client_ip": request.client.host,
            "component": log_data.component,
            "source": "frontend",
            "url": log_data.url,
            "stack": log_data.stack,
        }
        
        # Determine the logging function based on the requested level (e.g., logger.error)
        log_level = log_data.level.upper()
        log_func = getattr(logger, log_level.lower(), logger.info)
        
        # Log the message. The configured JSON formatter will automatically include extra_data.
        # Note: If the log level is DEBUG/TRACE, and your logger is INFO, it will be skipped.
        log_func(log_data.message, extra=extra_data)

    except Exception as e:
        # Log the internal failure of the logging endpoint itself
        # This will show up under the client_logger name, indicating a logging system failure.
        logger.exception(f"Internal error processing client log request: {type(e).__name__}")
        # Return a successful status code (204) to the client to prevent client-side infinite loops,
        # but internally we log the issue.
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal logging error")
        
    # HTTP_204_NO_CONTENT means success, but no content to return
    return