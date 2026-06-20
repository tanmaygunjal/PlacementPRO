import json
from pydantic import BaseModel, field_validator
from typing import List, Optional
from datetime import datetime

class ResumeAnalysisBase(BaseModel):
    resume_url: str
    ats_score: int
    extracted_skills: List[str]
    missing_skills: List[str]
    improvement_suggestions: List[str]
    strengths: List[str]
    weaknesses: List[str]

class ResumeAnalysisResponse(ResumeAnalysisBase):
    id: int
    student_id: int
    created_at: datetime

    class Config:
        from_attributes = True

    @field_validator("extracted_skills", "missing_skills", "improvement_suggestions", "strengths", "weaknesses", mode="before")
    @classmethod
    def parse_json_fields(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return [x.strip() for x in v.split(",") if x.strip()] if v else []
        return v or []

class JobMatchRequest(BaseModel):
    job_id: Optional[int] = None
    external_job_id: Optional[str] = None

class JobMatchResponse(BaseModel):
    match_score: int
    matching_skills: List[str]
    missing_skills: List[str]
    tailoring_suggestions: List[str]
