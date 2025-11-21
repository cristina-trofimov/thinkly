from fastapi import APIRouter, Request, status
from pydantic import BaseModel
import logging

router = APIRouter()
logger = logging.getLogger("")

class ClientLog(BaseModel):
    level: str = "INFO"
    message: str
    component: str
    url: str
    stack: str | None = None

@router.post("/client-log", status_code=status.HTTP_204_NO_CONTENT)
async def capture_client_log(log_data: ClientLog, request: Request):
    # Add server-side context (e.g., IP address)
    extra_data = {
        "client_ip": request.client.host,
        "component": log_data.component,
        "url": log_data.url,
        "stack": log_data.stack,
        "source": "frontend" # Add a source tag for easy filtering in Kibana
    }
    
    # Log the message using the configured JSON logger
    log_func = getattr(logger, log_data.level.lower(), logger.info)
    log_func(log_data.message, extra=extra_data)

    return