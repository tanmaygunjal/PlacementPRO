from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.schemas.job import JobDetailResponse
from app.schemas.user import StudentResponse

class ApplicationBase(BaseModel):
    job_id: int

class ApplicationCreate(ApplicationBase):
    pass

class ApplicationUpdate(BaseModel):
    status: str  # applied, shortlisted, interviewing, offered, rejected

class ApplicationResponse(ApplicationBase):
    id: int
    student_id: int
    status: str
    applied_at: datetime

    class Config:
        from_attributes = True

class ApplicationDetailResponse(ApplicationResponse):
    job: JobDetailResponse
    student: StudentResponse

    class Config:
        from_attributes = True
