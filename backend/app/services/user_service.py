from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List
from fastapi import HTTPException, status

from app.models.user import User, StudentProfile, UserRole
from app.schemas.user import UserCreate, StudentProfileCreate, StudentProfileBase
from app.auth.security import get_password_hash

def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()

def create_user(db: Session, user_schema: UserCreate) -> User:
    # Check if user already exists
    existing_user = get_user_by_email(db, user_schema.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    hashed_pwd = get_password_hash(user_schema.password)
    db_user = User(
        email=user_schema.email,
        hashed_password=hashed_pwd,
        role=user_schema.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def create_student_profile(db: Session, user_id: int, profile_schema: StudentProfileCreate) -> StudentProfile:
    # Verify user exists and is a student
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role != UserRole.STUDENT:
        raise HTTPException(status_code=400, detail="Only students can have a student profile")
    
    # Check if profile already exists
    existing_profile = db.query(StudentProfile).filter(StudentProfile.id == user_id).first()
    if existing_profile:
        raise HTTPException(status_code=400, detail="Profile already exists for this student")
    
    # Roll number unique check
    existing_roll = db.query(StudentProfile).filter(StudentProfile.roll_number == profile_schema.roll_number).first()
    if existing_roll:
        raise HTTPException(status_code=400, detail="Roll number already registered")
        
    db_profile = StudentProfile(
        id=user_id,
        full_name=profile_schema.full_name,
        roll_number=profile_schema.roll_number,
        branch=profile_schema.branch,
        cgpa=profile_schema.cgpa,
        skills=profile_schema.skills,
        graduation_year=profile_schema.graduation_year
    )
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    return db_profile

def update_student_profile(db: Session, user_id: int, profile_schema: StudentProfileBase) -> StudentProfile:
    db_profile = db.query(StudentProfile).filter(StudentProfile.id == user_id).first()
    if not db_profile:
        raise HTTPException(status_code=404, detail="Student profile not found")
        
    # Check roll number uniqueness if changed
    if db_profile.roll_number != profile_schema.roll_number:
        existing_roll = db.query(StudentProfile).filter(StudentProfile.roll_number == profile_schema.roll_number).first()
        if existing_roll:
            raise HTTPException(status_code=400, detail="Roll number already registered")
            
    db_profile.full_name = profile_schema.full_name
    db_profile.roll_number = profile_schema.roll_number
    db_profile.branch = profile_schema.branch
    db_profile.cgpa = profile_schema.cgpa
    db_profile.skills = profile_schema.skills
    db_profile.graduation_year = profile_schema.graduation_year
    
    db.commit()
    db.refresh(db_profile)
    return db_profile

def update_resume_filename(db: Session, user_id: int, filename: str) -> StudentProfile:
    db_profile = db.query(StudentProfile).filter(StudentProfile.id == user_id).first()
    if not db_profile:
        raise HTTPException(status_code=404, detail="Student profile not found. Complete profile before uploading resume.")
    
    db_profile.resume_filename = filename
    db.commit()
    db.refresh(db_profile)
    return db_profile

def list_students(
    db: Session, 
    min_cgpa: Optional[float] = None, 
    branch: Optional[str] = None, 
    search: Optional[str] = None
) -> List[StudentProfile]:
    query = db.query(StudentProfile)
    if min_cgpa is not None:
        query = query.filter(StudentProfile.cgpa >= min_cgpa)
    if branch:
        query = query.filter(StudentProfile.branch.ilike(f"%{branch}%"))
    if search:
        query = query.filter(
            or_(
                StudentProfile.full_name.ilike(f"%{search}%"),
                StudentProfile.roll_number.ilike(f"%{search}%"),
                StudentProfile.skills.ilike(f"%{search}%")
            )
        )
    return query.all()
