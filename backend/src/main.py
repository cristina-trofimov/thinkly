from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from endpoints.log import log_router
from endpoints.authentification_api import auth_router
from endpoints.questions_api import questions_router
from endpoints.competitions_api import competitions_router
from endpoints.standings_api import standings_router
from endpoints.manage_accounts_api import accounts_router
from endpoints.leaderboards_api import leaderboards_router
from endpoints.currentLeaderboard_api import current_leaderboard_router
from endpoints.send_email_api import email_router
import uvicorn
from logging_config import setup_logging
import os

setup_logging()
app = FastAPI(title="My Backend API")

# --- Request Logging Middleware ---
@app.middleware("http")
async def log_requests(request: Request, call_next):
    print(">>", request.method, request.url.path, "Origin:", request.headers.get("origin"))
    response = await call_next(request)
    return response

# --- Allow frontend requests (CORS setup) ---
origins = [
    "http://localhost:5173",      # local dev (outside Docker)
    "http://vite-frontend:5173",  # Docker service name from docker-compose
    "http://127.0.0.1:5173",  # Create React App
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root route (for testing)
@app.get("/")
def root():
    return {"message": "Backend is running!"}

# Include routers
try:
    app.include_router(log_router, prefix="/log")
    app.include_router(auth_router, prefix="/auth")
    app.include_router(questions_router, prefix="/questions")
    app.include_router(competitions_router, prefix="/competitions")
    app.include_router(standings_router, prefix="/standings")
    app.include_router(accounts_router, prefix="/manage-accounts")
    app.include_router(email_router, prefix="/email")
    app.include_router(leaderboards_router, prefix="/leaderboards")
    app.include_router(current_leaderboard_router, prefix="/standings")
except AttributeError:
    print("⚠️ No router found in leaderboards_api.py or questions_api.py. Make sure it defines `router = APIRouter()`.")

#  Run server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0",  port=int(os.getenv("PORT", 8000)), reload=True)
