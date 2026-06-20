from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from fastapi import HTTPException, status
from typing import Optional, Tuple
import os

from app.models.user import User, UserRole
from app.models.student import Student
from app.models.company import Company
from app.models.refresh_token import RefreshToken
from app.schemas.user import StudentRegister, RecruiterRegister
from app.schemas.auth import Token
from app.auth.security import (
    verify_password, 
    get_password_hash, 
    create_access_token, 
    create_refresh_token, 
    create_temporary_token, 
    decode_token
)

def register_student(db: Session, reg: StudentRegister) -> User:
    # 1. Check if user email is already registered
    existing_user = db.query(User).filter(User.email == reg.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # 2. Create User record
    hashed_pwd = get_password_hash(reg.password)
    db_user = User(
        name=reg.name,
        email=reg.email,
        password_hash=hashed_pwd,
        role=UserRole.STUDENT.value,
        is_verified=False
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # 3. Create Student record
    db_student = Student(
        user_id=db_user.id,
        college=reg.college,
        branch=reg.branch,
        graduation_year=reg.graduation_year,
        cgpa=reg.cgpa,
        skills=reg.skills,
        resume_url=reg.resume_url
    )
    db.add(db_student)
    db.commit()
    db.refresh(db_user)
    
    # 4. Generate email verification token and log it
    verify_token = create_temporary_token(subject=db_user.email, token_type="verify", expires_in_minutes=1440)
    print("\n" + "="*80)
    print(f"EMAIL VERIFICATION LINK FOR {db_user.name} ({db_user.email}):")
    print(f"http://localhost:5173/verify-email?token={verify_token}")
    print("="*80 + "\n")
    
    return db_user

def register_recruiter(db: Session, reg: RecruiterRegister) -> User:
    # 1. Check if user email is already registered
    existing_user = db.query(User).filter(User.email == reg.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
        
    # 2. Check if company name is already registered
    existing_company = db.query(Company).filter(Company.company_name == reg.company_name).first()
    if existing_company:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Company name is already registered"
        )
        
    # 3. Create User record
    hashed_pwd = get_password_hash(reg.password)
    db_user = User(
        name=reg.name,
        email=reg.email,
        password_hash=hashed_pwd,
        role=UserRole.RECRUITER.value,
        is_verified=False
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # 4. Create Company record
    db_company = Company(
        user_id=db_user.id,
        company_name=reg.company_name,
        website=reg.website,
        industry=reg.industry,
        logo_url=reg.logo_url,
        description=reg.description
    )
    db.add(db_company)
    db.commit()
    db.refresh(db_user)
    
    # 5. Generate email verification token and log it
    verify_token = create_temporary_token(subject=db_user.email, token_type="verify", expires_in_minutes=1440)
    print("\n" + "="*80)
    print(f"EMAIL VERIFICATION LINK FOR {db_user.name} ({db_user.email}):")
    print(f"http://localhost:5173/verify-email?token={verify_token}")
    print("="*80 + "\n")
    
    return db_user

def authenticate_user(db: Session, email: str, password: str) -> User:
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

def create_refresh_session(db: Session, user: User) -> Token:
    access_token = create_access_token(subject=user.email, role=user.role)
    refresh_token_str = create_refresh_token(subject=user.email)
    
    # Store refresh token in database
    expires_at = datetime.utcnow() + timedelta(days=7)
    db_refresh_token = RefreshToken(
        token=refresh_token_str,
        user_id=user.id,
        expires_at=expires_at
    )
    db.add(db_refresh_token)
    db.commit()
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token_str,
        token_type="bearer"
    )

def refresh_access_token(db: Session, refresh_token_str: str) -> Token:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_token(refresh_token_str)
    email: str = payload.get("sub")
    token_type: str = payload.get("type")
    
    if email is None or token_type != "refresh":
        raise credentials_exception
        
    # Check if token exists in database and is not expired
    db_token = db.query(RefreshToken).filter(RefreshToken.token == refresh_token_str).first()
    if not db_token or db_token.expires_at < datetime.utcnow():
        if db_token:
            db.delete(db_token)
            db.commit()
        raise credentials_exception
        
    user = db.query(User).filter(User.id == db_token.user_id).first()
    if not user:
        raise credentials_exception
        
    # Generate new access token
    new_access_token = create_access_token(subject=user.email, role=user.role)
    
    return Token(
        access_token=new_access_token,
        refresh_token=refresh_token_str,
        token_type="bearer"
    )

def revoke_refresh_token(db: Session, refresh_token_str: str) -> bool:
    db_token = db.query(RefreshToken).filter(RefreshToken.token == refresh_token_str).first()
    if db_token:
        db.delete(db_token)
        db.commit()
        return True
    return False

def forgot_password(db: Session, email: str) -> bool:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Avoid user enumeration by returning True anyway, but do not print link
        return True
        
    # Generate reset token (valid for 15 minutes)
    reset_token = create_temporary_token(subject=user.email, token_type="reset", expires_in_minutes=15)
    
    print("\n" + "="*80)
    print(f"PASSWORD RESET LINK FOR {user.name} ({user.email}):")
    print(f"http://localhost:5173/reset-password?token={reset_token}")
    print("="*80 + "\n")
    
    return True

def reset_password(db: Session, token: str, new_password: str) -> bool:
    payload = decode_token(token)
    email: str = payload.get("sub")
    token_type: str = payload.get("type")
    
    if email is None or token_type != "reset":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
        
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
        
    user.password_hash = get_password_hash(new_password)
    
    # Revoke all active refresh sessions to force re-login on all devices
    db.query(RefreshToken).filter(RefreshToken.user_id == user.id).delete()
    
    db.commit()
    return True

def verify_email(db: Session, token: str) -> bool:
    payload = decode_token(token)
    email: str = payload.get("sub")
    token_type: str = payload.get("type")
    
    if email is None or token_type != "verify":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token"
        )
        
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
        
    user.is_verified = True
    db.commit()
    return True
