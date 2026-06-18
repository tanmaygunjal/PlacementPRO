import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles


from app.database import engine, Base
from app.routers import auth, students, jobs, applications

# Create DB tables (primarily useful for simple local SQLite running; migrations cover Production)
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Warning: Could not create tables on startup: {e}")


# Ensure upload directory exists
try:
    os.makedirs("/tmp/uploads/resumes" if os.environ.get("VERCEL") else "uploads/resumes", exist_ok=True)
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

class UserCreate(BaseModel):
    name: str
    email: str
    password: str

@app.post("/register")
def register(
    user: UserCreate,
    db: Session = Depends(get_db)
):

    new_user = User(
        name=user.name,
        email=user.email,
        password=user.password
    )

    db.add(new_user)
    db.commit()

    return {
        "message": "Registered"
    }



# Configure CORS for frontend compatibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers under prefix '/api'
app.include_router(auth.router, prefix="/api")
app.include_router(students.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(applications.router, prefix="/api")

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

