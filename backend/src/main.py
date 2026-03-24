from fastapi import Depends, FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from endpoints.log_api import log_router
from endpoints.authentification_api import auth_router
from endpoints.questions_api import questions_router
from endpoints.competitions_api import competitions_router
from endpoints.manage_accounts_api import accounts_router
from endpoints.leaderboards_api import leaderboards_router
from endpoints.send_email_api import email_router
from endpoints.riddles_api import riddles_router
from endpoints.algotime_sessions_api import algotime_router
from endpoints.admin_dashboard_api import admin_dashboard_router
from endpoints.judge0_api import judge0_router
from endpoints.submission_api import submission_router
from endpoints.question_instance_api import question_instance_router
from endpoints.most_recent_sub_api import most_recent_sub_router
from endpoints.user_preferences_api import user_preferences_router
from endpoints import authentification_api
from endpoints.languages_api import languages_router
from endpoints.base_event_api import base_event_router
from endpoints.user_question_instance_api import user_question_instance_router
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from logging_config import setup_logging
from services.competition_cleanup import cleanup_ended_competitions
from services.algotime_cleanup import cleanup_ended_algotime_sessions
from services.posthog_analytics import init_posthog, track_api_call, shutdown_posthog
from services.email_scheduler import run_scheduled_emails
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import os
from dotenv import load_dotenv
import logging
import time


load_dotenv()
JUDGE0_URL = os.getenv("JUDGE0_URL")

setup_logging()
logger = logging.getLogger(__name__)

# Modern lifespan event handler (replaces deprecated on_event)
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 Starting up...")
    init_posthog()
    logger.info("✓ PostHog analytics initialized")

    scheduler = AsyncIOScheduler()
    scheduler.add_job(run_scheduled_emails, "interval", minutes=1, id="email_scheduler")
    scheduler.add_job(cleanup_ended_competitions, "interval", hours=1, id="competition_cleanup")
    scheduler.add_job(cleanup_ended_algotime_sessions, "interval", hours=1, id="algotime_cleanup")
    scheduler.start()
    logger.info("✓ Email scheduler started (polling every 60s)")

    yield  # Application runs here

    # Shutdown
    logger.info("🛑 Shutting down...")
    scheduler.shutdown(wait=False)
    logger.info("✓ Email scheduler stopped")
    shutdown_posthog()
    logger.info("✓ PostHog analytics shut down")


app = FastAPI(title="My Backend API", lifespan=lifespan)

    
PUBLIC_PATHS = [
    "/",               
    "/auth/signup",    
    "/auth/login",
    "/auth/google-auth",
    "/auth/refresh",
    "/auth/forgot-password",
    "/auth/reset-password",
]

async def global_auth_dependency(request: Request):
    if request.url.path in PUBLIC_PATHS:
        return None
    
    # This manually triggers the OAuth2 logic for the middleware
    token = await authentification_api.oauth2_scheme(request)
    return authentification_api.get_current_user(token)


app = FastAPI(
    title="My Backend API", 
    lifespan=lifespan,
    dependencies=[Depends(global_auth_dependency)] # This enforces it on every route
)
# --- Rate Limiting ---
limiter = Limiter(key_func=get_remote_address, default_limits=["45/minute"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)


# --- Allow frontend requests (CORS setup) ---
# ✅ CORS must be registered FIRST so it wraps all other middleware.
# If CORS is added after custom middlewares, unhandled exceptions will
# propagate out before CORS headers are attached, causing browser CORS errors.
origins = [
    "https://thinklyscs.com",
    "https://www.thinklyscs.com",
    "http://localhost:5173",
]
# Guard against JUDGE0_URL being None if env var is not set
if JUDGE0_URL:
    origins.append(JUDGE0_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=3600,  # Allow browser to cache preflight for 1 hour
    expose_headers=["*"],
)


# --- PostHog Analytics Middleware ---
@app.middleware("http")
async def analytics_middleware(request: Request, call_next):
    """Track all API calls with PostHog analytics"""
    start_time = time.time()
    error = None
    response = None

    try:
        response = await call_next(request)
        return response
    except Exception as e:
        error = str(e)
        raise
    finally:
        # Calculate response time
        response_time_ms = (time.time() - start_time) * 1000

        # Track the API call in PostHog
        status_code = response.status_code if response else 500
        await track_api_call(
            request=request,
            response_status=status_code,
            response_time_ms=response_time_ms,
            error=error
        )


# --- Request Logging Middleware ---
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(">>", request.method, request.url.path, "Origin:", request.headers.get("origin"))
    response = await call_next(request)
    return response


# Root route (for testing)
@app.get("/")
def root():
    return {"message": "Backend is running!"}


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    msg = ""
    for err in exc.errors():
        row = f"Entry {err['loc'][1]}" if len(err['loc']) > 1 else ""
        msg += f"{row} - {err['loc'][-1]}: {err['msg']}\n"
    return JSONResponse(
        status_code=422,
        content={"detail": f"Validation Error: {msg}"}
    )

# Include routers
try:
    app.include_router(log_router, prefix="/log")
    app.include_router(auth_router, prefix="/auth")
    app.include_router(questions_router, prefix="/questions")
    app.include_router(question_instance_router, prefix="/instances")
    app.include_router(competitions_router, prefix="/competitions")
    app.include_router(accounts_router, prefix="/manage-accounts")
    app.include_router(email_router, prefix="/email")
    app.include_router(leaderboards_router, prefix="/leaderboards")
    app.include_router(riddles_router, prefix="/riddles")
    app.include_router(algotime_router, prefix="/algotime")
    app.include_router(admin_dashboard_router, prefix="/admin/dashboard")
    app.include_router(judge0_router, prefix="/judge0")
    app.include_router(submission_router, prefix="/attempts")
    app.include_router(most_recent_sub_router, prefix="/recent-sub")
    app.include_router(user_preferences_router, prefix="/prefs") # New router for user preferences
    app.include_router(languages_router, prefix="/lang")
    app.include_router(base_event_router, prefix="/events")
    app.include_router(user_question_instance_router, prefix="/user-instances")
except Exception:
    logger.warning("⚠️ Failed to register one or more routers. Make sure all routers are properly defined.")

# Run server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0",  port=int(os.getenv("PORT", 8000)), reload=True, reload_excludes=["logs", "*.log", "__pycache__", "./*.db", "./*.sqlite"])
