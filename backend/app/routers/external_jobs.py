from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional

from app.database import get_db
from app.models.external_job import ExternalJob
from app.models.user import User, UserRole
from app.schemas.external_job import ExternalJobResponse
from app.services import external_job_service
from app.auth.dependencies import get_current_active_user, RoleChecker

router = APIRouter(prefix="/external-jobs", tags=["External Jobs"])

@router.get("", response_model=List[ExternalJobResponse])
def get_external_jobs(
    search: Optional[str] = None,
    category: Optional[str] = None,
    location: Optional[str] = None,
    source: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(ExternalJob)
    
    if search:
        query = query.filter(
            or_(
                ExternalJob.title.ilike(f"%{search}%"),
                ExternalJob.company_name.ilike(f"%{search}%"),
                ExternalJob.description.ilike(f"%{search}%")
            )
        )
        
    if category:
        query = query.filter(ExternalJob.category.ilike(category))
        
    if location:
        query = query.filter(ExternalJob.location.ilike(f"%{location}%"))
        
    if source:
        query = query.filter(ExternalJob.source_api.ilike(source))
        
    # Sort by created_at descending
    query = query.order_by(ExternalJob.created_at.desc())
    return query.all()

@router.get("/categories", response_model=List[str])
def get_external_job_categories(db: Session = Depends(get_db)):
    results = db.query(ExternalJob.category).distinct().all()
    # Flatten list of tuples and filter out None
    return [r[0] for r in results if r[0]]

@router.post("/fetch", status_code=status.HTTP_200_OK)
async def trigger_manual_fetch(
    current_user: User = Depends(RoleChecker([UserRole.ADMIN.value])),
    db: Session = Depends(get_db)
):
    try:
        new_count = await external_job_service.fetch_and_store_jobs(db)
        return {
            "message": "Manual jobs fetch completed successfully.",
            "new_jobs_added": new_count
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch external jobs: {str(e)}"
        )
