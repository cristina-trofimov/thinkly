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
    "https://thinklyscs.com",
    "https://www.thinklyscs.com",  # Create React App
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
    app.include_router(accounts_router, prefix="/manage-accounts")
    app.include_router(email_router, prefix="/email")
    app.include_router(leaderboards_router, prefix="/leaderboards")
    app.include_router(riddles_router, prefix="/riddles")
    app.include_router(algotime_router, prefix="/algotime")
    app.include_router(admin_dashboard_router, prefix="/admin/dashboard")
except AttributeError:
    print("⚠️ No router found in leaderboards_api.py or questions_api.py. Make sure it defines `router = APIRouter()`.")

#  Run server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="https://thinkly-production.up.railway.app",  port=int(os.getenv("PORT", 8000)), reload=True, reload_excludes=["logs", "*.log"])
