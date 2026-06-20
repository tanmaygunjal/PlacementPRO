from pydantic import BaseModel
from typing import List, Optional

class AdminStats(BaseModel):
    total_students: int
    total_companies: int
    total_jobs: int
    total_applications: int

class ApplicationStatusCount(BaseModel):
    status: str
    count: int

class BranchCount(BaseModel):
    branch: str
    count: int

class AdminAnalytics(BaseModel):
    application_statuses: List[ApplicationStatusCount]
    branch_registrations: List[BranchCount]

class CompanyApprovalUpdate(BaseModel):
    is_approved: bool
