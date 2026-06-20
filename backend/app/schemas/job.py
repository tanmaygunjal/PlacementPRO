from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.schemas.user import CompanyResponse

# Job Schemas
class JobBase(BaseModel):
    title: str
    category: Optional[str] = None
    location: Optional[str] = None
    salary: Optional[str] = None
    experience: Optional[str] = None
    description: str
    requirements: Optional[str] = None
    deadline: datetime
    ctc: Optional[float] = None
    eligibility_cgpa: float = 0.0

class JobCreate(JobBase):
    company_id: int

class JobUpdateStatus(BaseModel):
    status: str  # open, closed

class JobResponse(JobBase):
    id: int
    company_id: int
    status: str

    class Config:
        from_attributes = True

class JobDetailResponse(JobResponse):
    company: CompanyResponse

    class Config:
        from_attributes = True
