from sqlalchemy.orm import Session
from datetime import datetime
from fastapi import HTTPException, status
from typing import List, Optional

from app.models.job import Job
from app.models.application import Application
from app.models.student import Student
from app.schemas.application import ApplicationCreate

def apply_to_job(db: Session, user_id: int, application_schema: ApplicationCreate) -> Application:
    # 1. Check if job exists and is open
    job = db.query(Job).filter(Job.id == application_schema.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found")
    if job.status != "open" or job.deadline < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This job posting is no longer active or the deadline has passed"
        )
        
    # 2. Check student profile
    student_profile = db.query(Student).filter(Student.user_id == user_id).first()
    if not student_profile or not (student_profile.college or student_profile.branch):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student profile not found. Please complete your profile first."
        )
        
    # 3. Check resume existence
    if not student_profile.resume_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume not found. Please upload a resume or provide a resume URL before applying."
        )
        
    # 4. Check CGPA eligibility
    if student_profile.cgpa is not None and job.eligibility_cgpa and student_profile.cgpa < job.eligibility_cgpa:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You do not meet the minimum CGPA requirement of {job.eligibility_cgpa} (Your CGPA: {student_profile.cgpa})"
        )
        
    # 5. Check duplicate application
    existing_app = db.query(Application).filter(
        Application.job_id == job.id,
        Application.student_id == student_profile.id
    ).first()
    if existing_app:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already applied to this job."
        )
        
    db_application = Application(
        job_id=job.id,
        student_id=student_profile.id,
        resume_url=student_profile.resume_url,
        status="applied"
    )
    db.add(db_application)
    db.commit()
    db.refresh(db_application)
    return db_application

def get_application_by_id(db: Session, app_id: int) -> Optional[Application]:
    return db.query(Application).filter(Application.id == app_id).first()

def update_application_status(db: Session, app_id: int, status_update: str) -> Application:
    application = get_application_by_id(db, app_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    application.status = status_update
    db.commit()
    db.refresh(application)
    return application

def get_student_applications(db: Session, user_id: int) -> List[Application]:
    student_profile = db.query(Student).filter(Student.user_id == user_id).first()
    if not student_profile:
        return []
    return db.query(Application).filter(Application.student_id == student_profile.id).all()

def get_job_applications(db: Session, job_id: int) -> List[Application]:
    return db.query(Application).filter(Application.job_id == job_id).all()
