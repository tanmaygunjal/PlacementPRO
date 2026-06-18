from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.job import CompanyCreate, CompanyResponse, JobCreate, JobResponse, JobDetailResponse
from app.services import job_service
from app.auth.dependencies import get_current_active_user, RoleChecker

router = APIRouter(prefix="/jobs", tags=["Jobs & Companies"])

# Company endpoints
@router.post("/companies", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
def create_company(
    company: CompanyCreate,
    current_user: User = Depends(RoleChecker([UserRole.ADMIN, UserRole.RECRUITER])),
    db: Session = Depends(get_db)
):
    return job_service.create_company(db, company)

@router.get("/companies", response_model=List[CompanyResponse])
def get_companies(
    db: Session = Depends(get_db)
):
    return job_service.list_companies(db)

# Job endpoints
@router.post("", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
def create_job_posting(
    job: JobCreate,
    current_user: User = Depends(RoleChecker([UserRole.ADMIN, UserRole.RECRUITER])),
    db: Session = Depends(get_db)
):
    return job_service.create_job(db, job)

@router.get("", response_model=List[JobDetailResponse])
def get_jobs(
    active_only: bool = True,
    company_id: Optional[int] = None,
    max_cgpa: Optional[float] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    # Students should only see jobs where they might be eligible, but let's let them query all active jobs.
    # We can pass filters to service
    return job_service.list_jobs(
        db, 
        active_only=active_only, 
        company_id=company_id, 
        max_cgpa=max_cgpa, 
        search=search
    )

@router.get("/{job_id}", response_model=JobDetailResponse)
def get_job_by_id(
    job_id: int,
    db: Session = Depends(get_db)
):
    job = job_service.get_job_by_id(db, job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job posting not found"
        )
    return job

@router.put("/{job_id}/status", response_model=JobResponse)
def update_job_active_status(
    job_id: int,
    is_active: bool,
    current_user: User = Depends(RoleChecker([UserRole.ADMIN, UserRole.RECRUITER])),
    db: Session = Depends(get_db)
):
    return job_service.update_job_status(db, job_id, is_active)
