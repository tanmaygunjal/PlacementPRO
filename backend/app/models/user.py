import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey, Enum, DateTime, func
from sqlalchemy.orm import relationship, synonym
from app.database import Base

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    STUDENT = "student"
    RECRUITER = "recruiter"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole, native_enum=False), default=UserRole.STUDENT, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    hashed_password = synonym('password_hash')

    @property
    def password(self):
        return self.password_hash


    @password.setter
    def password(self, plain_password):
        from app.auth.security import get_password_hash
        self.password_hash = get_password_hash(plain_password)

    # Relationships
    student_profile = relationship("StudentProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    student_resume = relationship("StudentResume", back_populates="user", uselist=False, cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="student")




class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    full_name = Column(String, nullable=False)
    roll_number = Column(String, unique=True, index=True, nullable=False)
    branch = Column(String, nullable=False)
    cgpa = Column(Float, nullable=False)
    skills = Column(String, nullable=True)  # Comma-separated skills
    resume_filename = Column(String, nullable=True)
    graduation_year = Column(Integer, nullable=False)
    phone = Column(String(20), nullable=True)

    # Relationships
    user = relationship("User", back_populates="student_profile")
