from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from Components.leaderboards import leaderboards_api

app = FastAPI(title="My Backend API")

# --- Allow frontend requests (CORS setup) ---
origins = [
    "http://localhost:5173",  # Vite dev server
    "http://localhost:3000",  # Create React App
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Root route (for testing) ---
@app.get("/")
def root():
    return {"message": "Backend is running!"}

# --- Include your leaderboards API ---
try:
    app.include_router(leaderboards_api.router)
except AttributeError:
    print("⚠️ No router found in leaderboards_api.py. Make sure it defines `router = APIRouter()`.")

# --- Run server ---
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
