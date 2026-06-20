from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import os

from app.database import get_db
from app.models.user import User, UserRole
from app.models.company import Company
from app.schemas.job import JobCreate, JobResponse, JobDetailResponse, JobUpdateStatus
from app.schemas.user import CompanyCreate, CompanyResponse
from app.services import job_service
from app.auth.dependencies import get_current_active_user, RoleChecker

router = APIRouter(prefix="/jobs", tags=["Jobs & Companies"])

# Company endpoints
@router.post("/companies", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
def create_company(
    company: CompanyCreate,
    current_user: User = Depends(RoleChecker([UserRole.ADMIN.value, UserRole.RECRUITER.value])),
    db: Session = Depends(get_db)
):
    return job_service.create_company(db, current_user.id, company)

@router.get("/companies", response_model=List[CompanyResponse])
def get_companies(
    db: Session = Depends(get_db)
):
    return job_service.list_companies(db)

@router.get("/companies/my", response_model=CompanyResponse)
def get_my_company(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.RECRUITER.value:
        raise HTTPException(status_code=400, detail="Only recruiters have associated companies")
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found")
    return company

@router.put("/companies/my", response_model=CompanyResponse)
def update_my_company(
    company_data: CompanyCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.RECRUITER.value:
        raise HTTPException(status_code=400, detail="Only recruiters can update their companies")
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found")
    return job_service.update_company(db, company.id, company_data)

@router.post("/companies/my/logo", response_model=CompanyResponse)
async def upload_company_logo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.RECRUITER.value:
        raise HTTPException(status_code=400, detail="Only recruiters can upload company logos")
    company = db.query(Company).filter(Company.user_id == current_user.id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company profile not found")
        
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in [".png", ".jpg", ".jpeg", ".webp"]:
        raise HTTPException(status_code=400, detail="Only PNG, JPG, JPEG, or WEBP images are allowed.")
        
    filename = f"logo_{company.id}{file_ext}"
    logo_url = f"https://lejkebtkdhnhicdjolxb.supabase.co/storage/v1/object/public/logos/{filename}"
    
    try:
        contents = await file.read()
        uploaded_to_supabase = False
        from app.database import supabase
        if supabase:
            try:
                supabase.storage.from_("logos").upload(path=filename, file=contents, file_options={"content-type": file.content_type})
                uploaded_to_supabase = True
            except Exception:
                try:
                    supabase.storage.from_("logos").update(path=filename, file=contents, file_options={"content-type": file.content_type})
                    uploaded_to_supabase = True
                except Exception as e:
                    print(f"Warning: Supabase logo upload failed: {e}. Falling back to local storage.")
        
        if not uploaded_to_supabase:
            # Fallback to local storage
            upload_dir = "uploads/logos"
            os.makedirs(upload_dir, exist_ok=True)
            filepath = os.path.join(upload_dir, filename)
            with open(filepath, "wb") as f:
                f.write(contents)
            logo_url = f"/uploads/logos/{filename}"
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not save or upload logo file: {str(e)}"
        )
        
    company_data = CompanyCreate(
        company_name=company.company_name,
        website=company.website,
        industry=company.industry,
        logo_url=logo_url,
        description=company.description
    )
    return job_service.update_company(db, company.id, company_data)

# Job endpoints
@router.post("", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
def create_job_posting(
    job: JobCreate,
    current_user: User = Depends(RoleChecker([UserRole.ADMIN.value, UserRole.RECRUITER.value])),
    db: Session = Depends(get_db)
):
    return job_service.create_job(db, job)

@router.get("", response_model=List[JobDetailResponse])
def get_jobs(
    active_only: bool = True,
    company_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return job_service.list_jobs(
        db, 
        active_only=active_only, 
        company_id=company_id, 
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

@router.put("/{job_id}", response_model=JobResponse)
def update_job_posting(
    job_id: int,
    job_data: JobCreate,
    current_user: User = Depends(RoleChecker([UserRole.ADMIN.value, UserRole.RECRUITER.value])),
    db: Session = Depends(get_db)
):
    job = job_service.get_job_by_id(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found")
        
    if current_user.role == UserRole.RECRUITER.value:
        company = db.query(Company).filter(Company.user_id == current_user.id).first()
        if not company or job.company_id != company.id:
            raise HTTPException(status_code=403, detail="You do not have permission to modify this job listing")
            
    return job_service.update_job(db, job_id, job_data)

@router.delete("/{job_id}", status_code=status.HTTP_200_OK)
def delete_job_posting(
    job_id: int,
    current_user: User = Depends(RoleChecker([UserRole.ADMIN.value, UserRole.RECRUITER.value])),
    db: Session = Depends(get_db)
):
    job = job_service.get_job_by_id(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found")
        
    if current_user.role == UserRole.RECRUITER.value:
        company = db.query(Company).filter(Company.user_id == current_user.id).first()
        if not company or job.company_id != company.id:
            raise HTTPException(status_code=403, detail="You do not have permission to delete this job listing")
            
    job_service.delete_job(db, job_id)
    return {"message": "Job posting successfully deleted"}

@router.put("/{job_id}/status", response_model=JobResponse)
def update_job_status(
    job_id: int,
    status_update: JobUpdateStatus,
    current_user: User = Depends(RoleChecker([UserRole.ADMIN.value, UserRole.RECRUITER.value])),
    db: Session = Depends(get_db)
):
    return job_service.update_job_status(db, job_id, status_update.status)
