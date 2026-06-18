from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship, synonym
from app.database import Base

class StudentResume(Base):
    __tablename__ = "student_resumes"

    id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    summary = Column(Text, nullable=True)
    education = Column(Text, nullable=True)     # Stores JSON list of dicts
    experience = Column(Text, nullable=True)    # Stores JSON list of dicts
    projects = Column(Text, nullable=True)      # Stores JSON list of dicts
    template_style = Column(String(50), default="classic", nullable=False)
    file_url = Column(String, nullable=True)
    uploaded_at = Column(DateTime, nullable=True)

    user_id = synonym('id')

    # Relationships
    user = relationship("User", back_populates="student_resume")
