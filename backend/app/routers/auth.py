from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.user import UserCreate, UserDetailResponse, UserResponse
from app.schemas.auth import Token, LoginRequest
from app.services import user_service
from app.auth.security import verify_password, create_access_token
from app.auth.dependencies import get_current_active_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_schema: UserCreate, db: Session = Depends(get_db)):
    return user_service.create_user(db, user_schema)

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = user_service.get_user_by_email(db, form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(subject=user.email, role=user.role.value)
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login-json", response_model=Token)
def login_json(login_req: LoginRequest, db: Session = Depends(get_db)):
    user = user_service.get_user_by_email(db, login_req.email)
    if not user or not verify_password(login_req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    access_token = create_access_token(subject=user.email, role=user.role.value)
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserDetailResponse)
def get_me(current_user = Depends(get_current_active_user)):
    return current_user
