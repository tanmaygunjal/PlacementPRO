from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from app.models.user import UserRole

# Student Profile Schemas
class StudentProfileBase(BaseModel):
    full_name: str
    roll_number: str
    branch: str
    cgpa: float = Field(..., ge=0.0, le=10.0)
    graduation_year: int
    skills: Optional[str] = None

class StudentProfileCreate(StudentProfileBase):
    pass

class StudentProfileResponse(StudentProfileBase):
    id: int
    resume_filename: Optional[str] = None

    class Config:
        from_attributes = True

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    role: UserRole = UserRole.STUDENT

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class UserDetailResponse(UserResponse):
    student_profile: Optional[StudentProfileResponse] = None

    class Config:
        from_attributes = True
