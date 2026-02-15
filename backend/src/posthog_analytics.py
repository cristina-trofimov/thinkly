"""
PostHog Analytics Integration for FastAPI
Tracks all API calls, user behavior, and feature usage
"""
import os
import logging
from typing import Optional, Dict, Any
from datetime import datetime
from fastapi import Request
from posthog import Posthog
import json

logger = logging.getLogger(__name__)

# Initialize PostHog client
POSTHOG_API_KEY = os.getenv("POSTHOG_API_KEY")
POSTHOG_HOST = os.getenv("POSTHOG_HOST", "https://app.posthog.com")

# Global PostHog client
posthog_client: Optional[Posthog] = None


def init_posthog():
    """Initialize PostHog client with API key from environment"""
    global posthog_client

    if not POSTHOG_API_KEY:
        logger.warning("POSTHOG_API_KEY not found in environment. Analytics disabled.")
        return None

    try:
        posthog_client = Posthog(
            project_api_key=POSTHOG_API_KEY,
            host=POSTHOG_HOST
        )
        logger.info(f"PostHog initialized successfully. Host: {POSTHOG_HOST}")
        return posthog_client
    except Exception as e:
        logger.error(f"Failed to initialize PostHog: {e}")
        return None


def get_user_id_from_request(request: Request) -> Optional[str]:
    """
    Extract user ID from request state (set by auth middleware).
    Returns user_id as string or 'anonymous' if not authenticated.
    """
    try:
        # Check if user info is in request state (from auth middleware)
        if hasattr(request.state, "user"):
            user = request.state.user
            if isinstance(user, dict) and "user_id" in user:
                return str(user["user_id"])
            elif hasattr(user, "user_id"):
                return str(user.user_id)

        # Check for user_id in path params (for some endpoints)
        if "user_id" in request.path_params:
            return str(request.path_params["user_id"])

        return "anonymous"
    except Exception as e:
        logger.debug(f"Could not extract user_id: {e}")
        return "anonymous"


def get_user_type_from_request(request: Request) -> Optional[str]:
    """Extract user type/role from request state"""
    try:
        if hasattr(request.state, "user"):
            user = request.state.user
            if isinstance(user, dict):
                return user.get("user_type") or user.get("role")
            elif hasattr(user, "user_type"):
                return user.user_type
        return "anonymous"
    except Exception:
        return "anonymous"


def sanitize_request_body(body: Any, max_length: int = 1000) -> str:
    """
    Sanitize request body for analytics (remove sensitive data, limit size)
    """
    try:
        if isinstance(body, (dict, list)):
            body_str = json.dumps(body)
        else:
            body_str = str(body)

        # Truncate if too long
        if len(body_str) > max_length:
            body_str = body_str[:max_length] + "... (truncated)"

        return body_str
    except Exception:
        return "(unable to serialize)"


async def track_api_call(
        request: Request,
        response_status: int,
        response_time_ms: float,
        error: Optional[str] = None
):
    """
    Track an API call event in PostHog with comprehensive metadata
    """
    if not posthog_client:
        return

    try:
        user_id = get_user_id_from_request(request)
        user_type = get_user_type_from_request(request)

        # Extract endpoint information
        method = request.method
        path = request.url.path
        endpoint_name = f"{method} {path}"

        # Categorize the endpoint
        category = categorize_endpoint(path)

        # Build properties
        properties = {
            "method": method,
            "path": path,
            "endpoint": endpoint_name,
            "category": category,
            "status_code": response_status,
            "response_time_ms": round(response_time_ms, 2),
            "user_type": user_type,
            "timestamp": datetime.utcnow().isoformat(),
            "origin": request.headers.get("origin"),
            "user_agent": request.headers.get("user-agent"),
            "referer": request.headers.get("referer"),
        }

        # Add query parameters
        if request.query_params:
            properties["query_params"] = dict(request.query_params)

        # Add error information if present
        if error:
            properties["error"] = error
            properties["has_error"] = True
        else:
            properties["has_error"] = False

        # Track the event
        posthog_client.capture(
            distinct_id=user_id,
            event="api_call",
            properties=properties
        )

        # Also track feature-specific events
        track_feature_event(user_id, path, method, properties)

        logger.debug(f"PostHog tracked: {endpoint_name} (user: {user_id})")

    except Exception as e:
        logger.error(f"Failed to track API call in PostHog: {e}")


def categorize_endpoint(path: str) -> str:
    """Categorize endpoint by feature area"""
    if "/auth" in path:
        return "authentication"
    elif "/competitions" in path:
        return "competitions"
    elif "/algotime" in path:
        return "algotime"
    elif "/leaderboards" in path:
        return "leaderboards"
    elif "/questions" in path:
        return "questions"
    elif "/riddles" in path:
        return "riddles"
    elif "/manage-accounts" in path or "/users" in path:
        return "user_management"
    elif "/email" in path:
        return "email"
    elif "/admin" in path:
        return "admin"
    elif "/log" in path:
        return "logging"
    else:
        return "other"


def track_feature_event(user_id: str, path: str, method: str, base_properties: Dict[str, Any]):
    """Track specific feature usage events"""
    if not posthog_client:
        return

    try:
        # Track specific feature events based on endpoint
        if "/competitions/create" in path and method == "POST":
            posthog_client.capture(
                distinct_id=user_id,
                event="competition_created",
                properties=base_properties
            )

        elif "/competitions/" in path and method == "PUT":
            posthog_client.capture(
                distinct_id=user_id,
                event="competition_updated",
                properties=base_properties
            )

        elif "/competitions/" in path and method == "DELETE":
            posthog_client.capture(
                distinct_id=user_id,
                event="competition_deleted",
                properties=base_properties
            )

        elif "/algotime/create" in path and method == "POST":
            posthog_client.capture(
                distinct_id=user_id,
                event="algotime_created",
                properties=base_properties
            )

        elif "/leaderboards" in path and method == "GET":
            posthog_client.capture(
                distinct_id=user_id,
                event="leaderboard_viewed",
                properties=base_properties
            )

        elif "/auth/login" in path and method == "POST":
            posthog_client.capture(
                distinct_id=user_id,
                event="user_login",
                properties=base_properties
            )

        elif "/auth/logout" in path and method == "POST":
            posthog_client.capture(
                distinct_id=user_id,
                event="user_logout",
                properties=base_properties
            )

        elif "/auth/signup" in path and method == "POST":
            posthog_client.capture(
                distinct_id=user_id,
                event="user_signup",
                properties=base_properties
            )

        elif "/auth/forgot-password" in path and method == "POST":
            posthog_client.capture(
                distinct_id=user_id,
                event="password_reset_requested",
                properties=base_properties
            )

        elif "/auth/reset-password" in path and method == "POST":
            posthog_client.capture(
                distinct_id=user_id,
                event="password_reset_completed",
                properties=base_properties
            )

        elif "/auth/change-password" in path and method == "POST":
            posthog_client.capture(
                distinct_id=user_id,
                event="password_changed",
                properties=base_properties
            )

        elif "/questions" in path and method == "GET":
            posthog_client.capture(
                distinct_id=user_id,
                event="questions_viewed",
                properties=base_properties
            )

        elif "/riddles" in path and method == "POST":
            posthog_client.capture(
                distinct_id=user_id,
                event="riddle_created",
                properties=base_properties
            )

        elif "/email/send" in path and method == "POST":
            posthog_client.capture(
                distinct_id=user_id,
                event="email_sent",
                properties=base_properties
            )

        elif "/manage-accounts/users" in path and "batch-delete" in path:
            posthog_client.capture(
                distinct_id=user_id,
                event="users_deleted",
                properties=base_properties
            )

        elif "/admin/dashboard" in path:
            posthog_client.capture(
                distinct_id=user_id,
                event="admin_dashboard_accessed",
                properties=base_properties
            )

    except Exception as e:
        logger.debug(f"Failed to track feature event: {e}")


def identify_user(user_id: str, properties: Dict[str, Any]):
    """
    Identify a user in PostHog with their properties.
    Call this after login/signup to set user properties.
    """
    if not posthog_client:
        return

    try:
        posthog_client.identify(
            distinct_id=str(user_id),
            properties=properties
        )
        logger.debug(f"PostHog identified user: {user_id}")
    except Exception as e:
        logger.error(f"Failed to identify user in PostHog: {e}")


def track_custom_event(user_id: str, event_name: str, properties: Optional[Dict[str, Any]] = None):
    """
    Track a custom event in PostHog.
    Use this for tracking specific user actions not covered by API calls.
    """
    if not posthog_client:
        return

    try:
        posthog_client.capture(
            distinct_id=str(user_id),
            event=event_name,
            properties=properties or {}
        )
        logger.debug(f"PostHog tracked custom event: {event_name} (user: {user_id})")
    except Exception as e:
        logger.error(f"Failed to track custom event in PostHog: {e}")


def shutdown_posthog():
    """Shutdown PostHog client gracefully"""
    global posthog_client
    if posthog_client:
        try:
            posthog_client.shutdown()
            logger.info("PostHog client shut down successfully")
        except Exception as e:
            logger.error(f"Error shutting down PostHog: {e}")