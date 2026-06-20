from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import datetime
from typing import Optional, List
from fastapi import HTTPException, status

from app.models.job import Job
from app.models.company import Company
from app.schemas.job import JobCreate
from app.schemas.user import CompanyCreate

# Company Services
def get_company_by_id(db: Session, company_id: int) -> Optional[Company]:
    return db.query(Company).filter(Company.id == company_id).first()

def get_company_by_name(db: Session, company_name: str) -> Optional[Company]:
    return db.query(Company).filter(Company.company_name.ilike(company_name)).first()

def create_company(db: Session, user_id: int, company_schema: CompanyCreate) -> Company:
    existing_company = get_company_by_name(db, company_schema.company_name)
    if existing_company:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Company with this name already exists"
        )
    db_company = Company(
        user_id=user_id,
        company_name=company_schema.company_name,
        website=company_schema.website,
        industry=company_schema.industry,
        logo_url=company_schema.logo_url,
        description=company_schema.description
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
    
    # Restrict job posting if company is not approved
    if not company.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your company has not been approved by the Administrator yet. You cannot post jobs."
        )
    
    db_job = Job(
        company_id=job_schema.company_id,
        title=job_schema.title,
        category=job_schema.category,
        location=job_schema.location,
        salary=job_schema.salary,
        experience=job_schema.experience,
        description=job_schema.description,
        requirements=job_schema.requirements,
        deadline=job_schema.deadline,
        status="open",
        ctc=job_schema.ctc,
        eligibility_cgpa=job_schema.eligibility_cgpa
    )
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    return db_job

def list_jobs(
    db: Session,
    active_only: bool = True,
    company_id: Optional[int] = None,
    search: Optional[str] = None
) -> List[Job]:
    query = db.query(Job)
    
    if active_only:
        query = query.filter(Job.status == "open", Job.deadline > datetime.utcnow())
        
    if company_id is not None:
        query = query.filter(Job.company_id == company_id)
        
    if search:
        query = query.filter(
            or_(
                Job.title.ilike(f"%{search}%"),
                Job.description.ilike(f"%{search}%"),
                Job.requirements.ilike(f"%{search}%"),
                Job.category.ilike(f"%{search}%"),
                Job.location.ilike(f"%{search}%")
            )
        )
        
    return query.all()

def update_job_status(db: Session, job_id: int, status_str: str) -> Job:
    job = get_job_by_id(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job.status = status_str
    db.commit()
    db.refresh(job)
    return job

def update_company(db: Session, company_id: int, company_schema: CompanyCreate) -> Company:
    db_company = db.query(Company).filter(Company.id == company_id).first()
    if not db_company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    if company_schema.company_name and company_schema.company_name != db_company.company_name:
        dup = get_company_by_name(db, company_schema.company_name)
        if dup:
            raise HTTPException(status_code=400, detail="Company with this name already exists")
        db_company.company_name = company_schema.company_name
        
    if company_schema.website is not None:
        db_company.website = company_schema.website
    if company_schema.industry is not None:
        db_company.industry = company_schema.industry
    if company_schema.logo_url is not None:
        db_company.logo_url = company_schema.logo_url
    if company_schema.description is not None:
        db_company.description = company_schema.description
        
    db.commit()
    db.refresh(db_company)
    return db_company

def update_job(db: Session, job_id: int, job_schema: JobCreate) -> Job:
    db_job = db.query(Job).filter(Job.id == job_id).first()
    if not db_job:
        raise HTTPException(status_code=404, detail="Job posting not found")
        
    db_job.title = job_schema.title
    db_job.category = job_schema.category
    db_job.location = job_schema.location
    db_job.salary = job_schema.salary
    db_job.experience = job_schema.experience
    db_job.description = job_schema.description
    db_job.requirements = job_schema.requirements
    db_job.deadline = job_schema.deadline
    db_job.ctc = job_schema.ctc
    db_job.eligibility_cgpa = job_schema.eligibility_cgpa
    
    db.commit()
    db.refresh(db_job)
    return db_job

def delete_job(db: Session, job_id: int) -> None:
    db_job = db.query(Job).filter(Job.id == job_id).first()
    if not db_job:
        raise HTTPException(status_code=404, detail="Job posting not found")
    db.delete(db_job)
    db.commit()
