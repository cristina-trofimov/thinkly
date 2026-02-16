"""
PostHog Analytics Integration for FastAPI
Tracks all API calls, user behavior, and feature usage
"""
import asyncio
import os
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timezone
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
            "timestamp": datetime.now(timezone.utc).isoformat(),
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
        await asyncio.to_thread(
            posthog_client.capture,
            distinct_id=user_id,
            event="api_call",
            properties=properties
        )

        # Also track feature-specific events
        await asyncio.to_thread(track_feature_event, user_id, path, method, properties)

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
    elif "/judge0" in path:
        return "code_execution"
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


def _resolve_feature_event(path: str, method: str) -> Optional[str]:
    """
    Return the PostHog event name for a given (path fragment, method) pair,
    or None if the call should not produce a feature event.
    """
    # Ordered rules: (path_fragment, method_or_None) -> event_name
    # method=None means the rule matches regardless of HTTP method.
    rules: list[tuple[str, Optional[str], str]] = [
        ("/competitions/create",      "POST",   "competition_created"),
        ("/competitions/",            "PUT",    "competition_updated"),
        ("/competitions/",            "DELETE",  "competition_deleted"),
        ("/algotime/create",          "POST",   "algotime_created"),
        ("/leaderboards",             "GET",    "leaderboard_viewed"),
        ("/auth/login",               "POST",   "user_login"),
        ("/auth/logout",              "POST",   "user_logout"),
        ("/auth/signup",              "POST",   "user_signup"),
        ("/auth/forgot-password",     "POST",   "password_reset_requested"),
        ("/auth/reset-password",      "POST",   "password_reset_completed"),
        ("/auth/change-password",     "POST",   "password_changed"),
        ("/questions",                "GET",    "questions_viewed"),
        ("/riddles",                  "POST",   "riddle_created"),
        ("/email/send",               "POST",   "email_sent"),
        ("/admin/dashboard",          None,     "admin_dashboard_accessed"),
        ("/judge0",                   "POST",   "code_submitted"),
    ]

    for fragment, required_method, event_name in rules:
        if fragment in path and (required_method is None or method == required_method):
            return event_name

    # Special case: batch-delete requires two independent path checks
    if "/manage-accounts/users" in path and "batch-delete" in path:
        return "users_deleted"

    return None


def track_feature_event(user_id: str, path: str, method: str, base_properties: Dict[str, Any]):
    """Track specific feature usage events"""
    if not posthog_client:
        return

    try:
        event_name = _resolve_feature_event(path, method)
        if event_name:
            posthog_client.capture(
                distinct_id=user_id,
                event=event_name,
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