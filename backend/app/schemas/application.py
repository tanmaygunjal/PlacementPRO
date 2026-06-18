from pydantic import BaseModel
from datetime import datetime
from app.models.job import ApplicationStatus
from app.schemas.job import JobDetailResponse
from app.schemas.user import UserDetailResponse

class ApplicationBase(BaseModel):
    job_id: int

class ApplicationCreate(ApplicationBase):
    pass

class ApplicationUpdate(BaseModel):
    status: ApplicationStatus

class ApplicationResponse(ApplicationBase):
    id: int
    student_id: int
    status: ApplicationStatus
    applied_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ApplicationDetailResponse(ApplicationResponse):
    job: JobDetailResponse
    student: UserDetailResponse

    class Config:
        from_attributes = True
