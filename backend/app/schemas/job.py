from pydantic import BaseModel, HttpUrl, Field
from typing import Optional, List
from datetime import datetime

# Company Schemas
class CompanyBase(BaseModel):
    name: str
    description: Optional[str] = None
    website: Optional[str] = None

class CompanyCreate(CompanyBase):
    pass

class CompanyResponse(CompanyBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Job Schemas
class JobBase(BaseModel):
    title: str
    description: str
    requirements: Optional[str] = None
    location: Optional[str] = None
    ctc: Optional[float] = Field(None, description="CTC in LPA")
    eligibility_cgpa: float = Field(0.0, ge=0.0, le=10.0)
    deadline: datetime

class JobCreate(JobBase):
    company_id: int

class JobResponse(JobBase):
    id: int
    company_id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class JobDetailResponse(JobResponse):
    company: CompanyResponse

    class Config:
        from_attributes = True
