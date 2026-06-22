import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles


from app.database import engine, Base
from app.routers import auth, students, jobs, applications, admin, external_jobs, resume_analyzer

# Create DB tables (primarily useful for simple local SQLite running; migrations cover Production)
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Warning: Could not create tables on startup: {e}")


# Ensure upload directory exists
try:
    os.makedirs("/tmp/uploads" if os.environ.get("VERCEL") else "uploads/resumes", exist_ok=True)
except Exception:
    pass

from pydantic import BaseModel
from sqlalchemy.orm import Session
from fastapi import Depends
from app.database import get_db
from app.models.user import User

app = FastAPI(
    title="PlacementPro API",
    description="Backend API services for PlacementPro Training & Placement Portal",
    version="1.0.0"
)

@app.get("/health")
def health():
    return {
        "status": "connected"
    }

import time
from fastapi import Request

import sys

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    method = request.method
    url = str(request.url)
    path = request.url.path
    print(f"\n>>> [FastAPI Request] {method} {url} (path: {path})", file=sys.stderr, flush=True)
    
    try:
        response = await call_next(request)
    except Exception as e:
        print(f"!!! [FastAPI Request Exception] {e}", file=sys.stderr, flush=True)
        raise e
    
    process_time = (time.time() - start_time) * 1000
    print(f"<<< [FastAPI Response] Status: {response.status_code} (took {process_time:.2f}ms)\n", file=sys.stderr, flush=True)
    return response

# Configure CORS for frontend compatibility with explicit origins
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://placement-pro.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers under prefix '/api'
app.include_router(auth.router, prefix="/api")
app.include_router(students.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(applications.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(external_jobs.router, prefix="/api")
app.include_router(resume_analyzer.router, prefix="/api")

# Resolve frontend directory dynamically
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
frontend_dir = os.path.join(BASE_DIR, "frontend")
if not os.path.exists(frontend_dir):
    frontend_dir = os.path.join(BASE_DIR, "..", "frontend")

# Ensure frontend directory exists
try:
    os.makedirs(frontend_dir, exist_ok=True)
except Exception:
    pass

# Mount frontend files at root
try:
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
except Exception as e:
    print(f"Warning: Could not mount frontend static directory: {e}")

import asyncio
from app.services.external_job_service import start_background_scraping

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(start_background_scraping())

