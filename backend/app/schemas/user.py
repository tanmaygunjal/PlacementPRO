from pydantic import BaseModel, EmailStr, Field, model_validator
from typing import Optional, List
from datetime import datetime
from app.models.user import UserRole

# Student Profile Schemas
class StudentBase(BaseModel):
    college: Optional[str] = None
    branch: Optional[str] = None
    graduation_year: Optional[int] = None
    cgpa: Optional[float] = Field(None, ge=0.0, le=10.0)
    skills: Optional[str] = None
    resume_url: Optional[str] = None

class StudentCreate(StudentBase):
    pass

class StudentResponse(StudentBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

# Company Profile Schemas
class CompanyBase(BaseModel):
    company_name: Optional[str] = None
    name: Optional[str] = None  # backward compatibility for tests
    website: Optional[str] = None
    industry: Optional[str] = None
    logo_url: Optional[str] = None
    description: Optional[str] = None

    @model_validator(mode='before')
    @classmethod
    def populate_company_name(cls, data):
        if isinstance(data, dict):
            if 'name' in data and not data.get('company_name'):
                data['company_name'] = data['name']
            if 'company_name' in data and not data.get('name'):
                data['name'] = data['company_name']
        return data

class CompanyCreate(CompanyBase):
    @model_validator(mode='after')
    def verify_company_name(self):
        if not self.company_name:
            raise ValueError("company_name or name is required")
        return self

class CompanyResponse(CompanyBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

# Registration Schemas
class StudentRegister(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(..., min_length=6)
    college: Optional[str] = None
    branch: Optional[str] = None
    graduation_year: Optional[int] = None
    cgpa: Optional[float] = Field(None, ge=0.0, le=10.0)
    skills: Optional[str] = None
    resume_url: Optional[str] = None

class RecruiterRegister(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(..., min_length=6)
    company_name: str
    website: Optional[str] = None
    industry: Optional[str] = None
    logo_url: Optional[str] = None
    description: Optional[str] = None

# User Base Schemas
class UserBase(BaseModel):
    email: EmailStr
    role: UserRole = UserRole.STUDENT

class UserCreate(UserBase):
    name: Optional[str] = None
    password: str = Field(..., min_length=6)
    
    # Student specific fields
    college: Optional[str] = None
    branch: Optional[str] = None
    graduation_year: Optional[int] = None
    cgpa: Optional[float] = Field(None, ge=0.0, le=10.0)
    skills: Optional[str] = None
    resume_url: Optional[str] = None
    
    # Recruiter specific fields
    company_name: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None
    logo_url: Optional[str] = None
    description: Optional[str] = None

class UserResponse(UserBase):
    id: int
    name: Optional[str] = None
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True

class UserDetailResponse(UserResponse):
    student_profile: Optional[StudentResponse] = None
    companies: List[CompanyResponse] = []

    class Config:
        from_attributes = True
