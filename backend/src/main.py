from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from Components.leaderboards import leaderboards_api
import os
app = FastAPI(title="My Backend API")

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
    app.include_router(leaderboards_api.router)
    app.include_router(homepage_api.router)
except AttributeError:
    print("⚠️ No router found in leaderboards_api.py. Make sure it defines `router = APIRouter()`.")

#  Run server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0",  port=int(os.getenv("PORT", 8000)), reload=True)
