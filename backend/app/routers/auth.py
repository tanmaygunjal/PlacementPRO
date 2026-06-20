from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.user import StudentRegister, RecruiterRegister, UserResponse, UserDetailResponse, UserCreate
from app.schemas.auth import (
    Token, 
    LoginRequest, 
    ForgotPasswordRequest, 
    ResetPasswordRequest, 
    RefreshTokenRequest, 
    VerifyEmailRequest
)
from app.services import auth_service, user_service
from app.auth.dependencies import get_current_active_user
from app.models.user import UserRole

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register/student", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_student(payload: StudentRegister, db: Session = Depends(get_db)):
    return auth_service.register_student(db, payload)

@router.post("/register/recruiter", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_recruiter(payload: RecruiterRegister, db: Session = Depends(get_db)):
    return auth_service.register_recruiter(db, payload)

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    print(f"\n>>> [Auth Router] Registering user: email={payload.email}, role={payload.role}")
    if payload.role == UserRole.STUDENT.value or payload.role == UserRole.STUDENT:
        student_reg = StudentRegister(
            name=payload.name or "Student User",
            email=payload.email,
            password=payload.password,
            college=payload.college,
            branch=payload.branch,
            graduation_year=payload.graduation_year,
            cgpa=payload.cgpa,
            skills=payload.skills,
            resume_url=payload.resume_url
        )
        return auth_service.register_student(db, student_reg)
    elif payload.role == UserRole.RECRUITER.value or payload.role == UserRole.RECRUITER:
        company_name = payload.company_name or f"Company of {payload.email}"
        recruiter_reg = RecruiterRegister(
            name=payload.name or "Recruiter User",
            email=payload.email,
            password=payload.password,
            company_name=company_name,
            website=payload.website,
            industry=payload.industry,
            logo_url=payload.logo_url,
            description=payload.description
        )
        return auth_service.register_recruiter(db, recruiter_reg)
    else:
        return user_service.create_user(db, payload)

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = auth_service.authenticate_user(db, form_data.username, form_data.password)
    return auth_service.create_refresh_session(db, user)

@router.post("/login-json", response_model=Token)
def login_json(req: LoginRequest, db: Session = Depends(get_db)):
    user = auth_service.authenticate_user(db, req.email, req.password)
    return auth_service.create_refresh_session(db, user)

@router.post("/refresh", response_model=Token)
def refresh(req: RefreshTokenRequest, db: Session = Depends(get_db)):
    return auth_service.refresh_access_token(db, req.refresh_token)

@router.post("/logout")
def logout(req: RefreshTokenRequest, db: Session = Depends(get_db)):
    revoked = auth_service.revoke_refresh_token(db, req.refresh_token)
    if not revoked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or already revoked refresh token"
        )
    return {"detail": "Successfully logged out"}

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    auth_service.forgot_password(db, req.email)
    return {"detail": "If the email is registered, a password reset link has been sent."}

@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    auth_service.reset_password(db, req.token, req.new_password)
    return {"detail": "Password has been reset successfully."}

@router.post("/verify-email")
def verify_email(req: VerifyEmailRequest, db: Session = Depends(get_db)):
    auth_service.verify_email(db, req.token)
    return {"detail": "Email verified successfully."}

@router.get("/me", response_model=UserDetailResponse)
def get_me(current_user = Depends(get_current_active_user)):
    return current_user
