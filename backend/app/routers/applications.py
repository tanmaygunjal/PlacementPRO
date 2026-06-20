from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.user import User, UserRole
from app.models.job import Job
from app.schemas.application import ApplicationCreate, ApplicationResponse, ApplicationUpdate, ApplicationDetailResponse
from app.services import application_service
from app.auth.dependencies import get_current_active_user, RoleChecker

router = APIRouter(prefix="/applications", tags=["Job Applications"])

@router.post("", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
def apply_for_job(
    application: ApplicationCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.STUDENT.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only students can apply to jobs"
        )
    return application_service.apply_to_job(db, current_user.id, application)

@router.get("/my", response_model=List[ApplicationDetailResponse])
def get_my_applications(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.STUDENT.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only students can check their applications"
        )
    return application_service.get_student_applications(db, current_user.id)

@router.get("/job/{job_id}", response_model=List[ApplicationDetailResponse])
def get_applications_for_job(
    job_id: int,
    current_user: User = Depends(RoleChecker([UserRole.ADMIN.value, UserRole.RECRUITER.value])),
    db: Session = Depends(get_db)
):
    if current_user.role == UserRole.RECRUITER.value:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            raise HTTPException(status_code=404, detail="Job posting not found")
        from app.models.company import Company
        company = db.query(Company).filter(Company.user_id == current_user.id).first()
        if not company or job.company_id != company.id:
            raise HTTPException(status_code=403, detail="You do not have permission to view applicants for this job")
            
    return application_service.get_job_applications(db, job_id)

@router.put("/{application_id}/status", response_model=ApplicationResponse)
def update_application_status(
    application_id: int,
    status_update: ApplicationUpdate,
    current_user: User = Depends(RoleChecker([UserRole.ADMIN.value, UserRole.RECRUITER.value])),
    db: Session = Depends(get_db)
):
    return application_service.update_application_status(db, application_id, status_update.status)
