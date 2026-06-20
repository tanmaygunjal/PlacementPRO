from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional

from app.database import get_db
from app.auth.dependencies import RoleChecker, get_current_user
from app.models.user import User
from app.models.student import Student
from app.models.company import Company
from app.models.job import Job
from app.models.application import Application
from app.schemas.admin import AdminStats, AdminAnalytics, ApplicationStatusCount, BranchCount, CompanyApprovalUpdate
from app.services import user_service

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(get_current_user), Depends(RoleChecker(["admin"]))]
)

@router.get("/stats", response_model=AdminStats)
def get_admin_stats(db: Session = Depends(get_db)):
    total_students = db.query(Student).count()
    total_companies = db.query(Company).count()
    total_jobs = db.query(Job).count()
    total_applications = db.query(Application).count()
    
    return {
        "total_students": total_students,
        "total_companies": total_companies,
        "total_jobs": total_jobs,
        "total_applications": total_applications
    }

@router.get("/analytics", response_model=AdminAnalytics)
def get_admin_analytics(db: Session = Depends(get_db)):
    # Group applications by status
    status_counts = db.query(
        Application.status, 
        func.count(Application.id)
    ).group_by(Application.status).all()
    
    application_statuses = [
        ApplicationStatusCount(status=status or "unknown", count=count)
        for status, count in status_counts
    ]
    
    # Group students by branch
    branch_counts = db.query(
        Student.branch, 
        func.count(Student.id)
    ).filter(Student.branch.isnot(None)).group_by(Student.branch).all()
    
    branch_registrations = [
        BranchCount(branch=branch, count=count)
        for branch, count in branch_counts
    ]
    
    return {
        "application_statuses": application_statuses,
        "branch_registrations": branch_registrations
    }

@router.get("/students")
def get_students(
    min_cgpa: Optional[float] = None,
    branch: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    students = user_service.list_students(db, min_cgpa=min_cgpa, branch=branch, search=search)
    result = []
    for s in students:
        result.append({
            "id": s.id,
            "user_id": s.user_id,
            "college": s.college,
            "branch": s.branch,
            "graduation_year": s.graduation_year,
            "cgpa": s.cgpa,
            "skills": s.skills,
            "resume_url": s.resume_url,
            "name": s.user.name if s.user else None,
            "email": s.user.email if s.user else None
        })
    return result

@router.get("/companies")
def get_companies(db: Session = Depends(get_db)):
    companies = db.query(Company).all()
    # Return companies with their associated user email and name for admin view
    result = []
    for c in companies:
        result.append({
            "id": c.id,
            "company_name": c.company_name,
            "website": c.website,
            "industry": c.industry,
            "logo_url": c.logo_url,
            "description": c.description,
            "is_approved": c.is_approved,
            "recruiter_name": c.user.name if c.user else None,
            "recruiter_email": c.user.email if c.user else None
        })
    return result

@router.patch("/companies/{company_id}/approve")
def approve_company(company_id: int, approval: CompanyApprovalUpdate, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    company.is_approved = approval.is_approved
    db.commit()
    db.refresh(company)
    
    return {
        "message": f"Company approval status updated to {company.is_approved}",
        "company": {
            "id": company.id,
            "company_name": company.company_name,
            "is_approved": company.is_approved
        }
    }

@router.delete("/students/{student_id}", status_code=status.HTTP_200_OK)
def delete_student(student_id: int, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    # Cascade deletion by deleting the parent User account
    user = db.query(User).filter(User.id == student.user_id).first()
    if user:
        db.delete(user)
    else:
        db.delete(student)
        
    db.commit()
    return {"message": "Student and associated user account successfully deleted"}

@router.delete("/jobs/{job_id}", status_code=status.HTTP_200_OK)
def delete_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found")
        
    db.delete(job)
    db.commit()
    return {"message": "Job posting successfully deleted"}
