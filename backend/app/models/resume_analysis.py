from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class ResumeAnalysis(Base):
    __tablename__ = "resume_analyses"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    resume_url = Column(String(500), nullable=False)
    ats_score = Column(Integer, nullable=False)
    extracted_skills = Column(Text, nullable=True)  # JSON-serialized list of strings
    missing_skills = Column(Text, nullable=True)    # JSON-serialized list of strings
    improvement_suggestions = Column(Text, nullable=True)  # JSON-serialized list of strings
    strengths = Column(Text, nullable=True)         # JSON-serialized list of strings
    weaknesses = Column(Text, nullable=True)        # JSON-serialized list of strings
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    student = relationship("Student", back_populates="resume_analysis")
