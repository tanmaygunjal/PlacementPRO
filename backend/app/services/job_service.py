from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import datetime
from typing import Optional, List
from fastapi import HTTPException, status

from app.models.job import Company, Job
from app.schemas.job import CompanyCreate, JobCreate

# Company Services
def get_company_by_id(db: Session, company_id: int) -> Optional[Company]:
    return db.query(Company).filter(Company.id == company_id).first()

def get_company_by_name(db: Session, name: str) -> Optional[Company]:
    return db.query(Company).filter(Company.name.ilike(name)).first()

def create_company(db: Session, company_schema: CompanyCreate) -> Company:
    existing_company = get_company_by_name(db, company_schema.name)
    if existing_company:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Company with this name already exists"
        )
    db_company = Company(
        name=company_schema.name,
        description=company_schema.description,
        website=company_schema.website
    )
    db.add(db_company)
    db.commit()
    db.refresh(db_company)
    return db_company

def list_companies(db: Session) -> List[Company]:
    return db.query(Company).all()

# Job Services
def get_job_by_id(db: Session, job_id: int) -> Optional[Job]:
    return db.query(Job).filter(Job.id == job_id).first()

def create_job(db: Session, job_schema: JobCreate) -> Job:
    # Verify company exists
    company = get_company_by_id(db, job_schema.company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    
    db_job = Job(
        company_id=job_schema.company_id,
        title=job_schema.title,
        description=job_schema.description,
        requirements=job_schema.requirements,
        location=job_schema.location,
        ctc=job_schema.ctc,
        eligibility_cgpa=job_schema.eligibility_cgpa,
        deadline=job_schema.deadline
    )
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    return db_job

def list_jobs(
    db: Session,
    active_only: bool = True,
    company_id: Optional[int] = None,
    max_cgpa: Optional[float] = None,
    search: Optional[str] = None
) -> List[Job]:
    query = db.query(Job)
    
    if active_only:
        query = query.filter(Job.is_active == True, Job.deadline > datetime.utcnow())
        
    if company_id is not None:
        query = query.filter(Job.company_id == company_id)
        
    if max_cgpa is not None:
        query = query.filter(Job.eligibility_cgpa <= max_cgpa)
        
    if search:
        query = query.filter(
            or_(
                Job.title.ilike(f"%{search}%"),
                Job.description.ilike(f"%{search}%"),
                Job.requirements.ilike(f"%{search}%")
            )
        )
        
    return query.all()

def update_job_status(db: Session, job_id: int, is_active: bool) -> Job:
    job = get_job_by_id(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job.is_active = is_active
    db.commit()
    db.refresh(job)
    return job
