from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from endpoints.leaderboards_api import leaderboards_router
from endpoints.authentification import auth_router
from endpoints.questions_api import questions_router
from endpoints.send_email import email_router
from endpoints.homepage_api import homepage_router
from endpoints.manage_accounts_api import manage_accounts_router
import os

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

# Include your leaderboards API
try:
    app.include_router(auth_router, prefix="/auth")
    app.include_router(email_router, prefix="/email")
    app.include_router(leaderboards_router, prefix="/leaderboards")
    app.include_router(questions_router, prefix="/questions")
    app.include_router(homepage_router, prefix="/homepage")
    app.include_router(manage_accounts_router, prefix="/manageAccounts")
except AttributeError:
    print("⚠️ No router found in leaderboards_api.py or questions_api.py. Make sure it defines `router = APIRouter()`.")

#  Run server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0",  port=int(os.getenv("PORT", 8000)), reload=True)
