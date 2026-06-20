from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ExternalJobBase(BaseModel):
    title: str
    company_name: str
    location: Optional[str] = None
    salary: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    apply_url: str
    source_api: str

class ExternalJobResponse(ExternalJobBase):
    id: int
    external_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
