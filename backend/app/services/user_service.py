from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List
from fastapi import HTTPException, status

from app.models.user import User, UserRole
from app.models.student import Student
from app.schemas.user import UserCreate, StudentCreate, StudentBase
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
        name=user_schema.name,
        email=user_schema.email,
        password_hash=hashed_pwd,
        role=user_schema.role.value if hasattr(user_schema.role, 'value') else user_schema.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def create_student_profile(db: Session, user_id: int, profile_schema: StudentCreate) -> Student:
    # Verify user exists and is a student
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role != UserRole.STUDENT.value:
        raise HTTPException(status_code=400, detail="Only students can have a student profile")
    
    # Check if profile already exists
    existing_profile = db.query(Student).filter(Student.user_id == user_id).first()
    if existing_profile:
        return update_student_profile(db, user_id, StudentBase(**profile_schema.model_dump()))
        
    db_profile = Student(
        user_id=user_id,
        college=profile_schema.college,
        branch=profile_schema.branch,
        graduation_year=profile_schema.graduation_year,
        cgpa=profile_schema.cgpa,
        skills=profile_schema.skills,
        resume_url=profile_schema.resume_url
    )
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    return db_profile

def update_student_profile(db: Session, user_id: int, profile_schema: StudentBase) -> Student:
    db_profile = db.query(Student).filter(Student.user_id == user_id).first()
    if not db_profile:
        # Create it if it doesn't exist to be robust
        return create_student_profile(db, user_id, StudentCreate(**profile_schema.dict()))
            
    db_profile.college = profile_schema.college
    db_profile.branch = profile_schema.branch
    db_profile.cgpa = profile_schema.cgpa
    db_profile.skills = profile_schema.skills
    db_profile.graduation_year = profile_schema.graduation_year
    if profile_schema.resume_url is not None:
        db_profile.resume_url = profile_schema.resume_url
    
    db.commit()
    db.refresh(db_profile)
    return db_profile

def update_resume_url(db: Session, user_id: int, resume_url: str) -> Student:
    db_profile = db.query(Student).filter(Student.user_id == user_id).first()
    if not db_profile:
        # Create a basic profile if they don't have one yet
        db_profile = Student(user_id=user_id, resume_url=resume_url)
        db.add(db_profile)
    else:
        db_profile.resume_url = resume_url
        
    db.commit()
    db.refresh(db_profile)
    return db_profile

def list_students(
    db: Session, 
    min_cgpa: Optional[float] = None, 
    branch: Optional[str] = None, 
    search: Optional[str] = None
) -> List[Student]:
    query = db.query(Student)
    if min_cgpa is not None:
        query = query.filter(Student.cgpa >= min_cgpa)
    if branch:
        query = query.filter(Student.branch.ilike(f"%{branch}%"))
    if search:
        query = query.filter(
            or_(
                Student.college.ilike(f"%{search}%"),
                Student.branch.ilike(f"%{search}%"),
                Student.skills.ilike(f"%{search}%")
            )
        )
    return query.all()
