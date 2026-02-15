from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from endpoints.log import log_router
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
from logging_config import setup_logging
from posthog_analytics import init_posthog, track_api_call, shutdown_posthog
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv
import time


load_dotenv()
JUDGE0_URL = os.getenv("JUDGE0_URL")


setup_logging()


# Modern lifespan event handler (replaces deprecated on_event)
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Starting up...")
    init_posthog()
    print("✓ PostHog analytics initialized")

    yield  # Application runs here

    # Shutdown
    print("🛑 Shutting down...")
    shutdown_posthog()
    print("✓ PostHog analytics shut down")


app = FastAPI(title="My Backend API", lifespan=lifespan)


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
    print(">>", request.method, request.url.path, "Origin:", request.headers.get("origin"))
    response = await call_next(request)
    return response

# --- Allow frontend requests (CORS setup) ---
origins = [
    "https://thinklyscs.com",
    "https://www.thinklyscs.com",  # Create React App
    "http://localhost:5173",
    JUDGE0_URL
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=3600,  # Allow browser to cache preflight for 1 hour
    expose_headers=["*"],
)

# Root route (for testing)
@app.get("/")
def root():
    return {"message": "Backend is running!"}

@app.get("/config")
def config():
    return {
        "allowed_origins": origins,
    }

# Include routers
try:
    app.include_router(log_router, prefix="/log")
    app.include_router(auth_router, prefix="/auth")
    app.include_router(questions_router, prefix="/questions")
    app.include_router(competitions_router, prefix="/competitions")
    app.include_router(accounts_router, prefix="/manage-accounts")
    app.include_router(email_router, prefix="/email")
    app.include_router(leaderboards_router, prefix="/leaderboards")
    app.include_router(riddles_router, prefix="/riddles")
    app.include_router(algotime_router, prefix="/algotime")
    app.include_router(admin_dashboard_router, prefix="/admin/dashboard")
    app.include_router(judge0_router, prefix="/judge0")
except AttributeError:
    print("⚠️ No router found. Make sure all routers are properly defined.")

#  Run server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0",  port=int(os.getenv("PORT", 8000)), reload=True, reload_excludes=["logs", "*.log", "__pycache__", "./*.db", "./*.sqlite"])
