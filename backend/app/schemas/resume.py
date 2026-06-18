from pydantic import BaseModel, Field
from typing import List, Optional, Any

# Resume Builder Item Schemas
class ResumeItemEducation(BaseModel):
    school: str
    degree: str
    year: int
    cgpa: Optional[float] = None

class ResumeItemExperience(BaseModel):
    company: str
    role: str
    duration: str
    description: str

class ResumeItemProject(BaseModel):
    title: str
    tech_stack: str
    description: str

# Resume Main Schemas
class ResumeDataBase(BaseModel):
    summary: Optional[str] = None
    education: List[ResumeItemEducation] = []
    experience: List[ResumeItemExperience] = []
    projects: List[ResumeItemProject] = []
    template_style: str = "classic"

class ResumeDataCreate(ResumeDataBase):
    pass

class ResumeDataResponse(ResumeDataBase):
    id: int

    class Config:
        from_attributes = True

# ATS Checker Schemas
class CheckDetail(BaseModel):
    score: int
    status: str
    message: str
    found: List[str] = []
    missing: List[str] = []

class AtsCheckResult(BaseModel):
    score: int
    length_check: CheckDetail
    keyword_check: CheckDetail
    skills_match: CheckDetail
    formatting_warnings: List[str] = []

# Readiness Dashboard Schemas
class JobDeadlineInfo(BaseModel):
    id: int
    title: str
    company_name: str
    deadline: str

class ReadinessResponse(BaseModel):
    readiness_score: int
    profile_complete: bool
    resume_uploaded: bool
    skills_count: int
    missing_skills: List[str] = []
    upcoming_deadlines: List[JobDeadlineInfo] = []
    interview_readiness: str
