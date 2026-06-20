from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Float
from sqlalchemy.orm import relationship
from app.database import Base

class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    category = Column(String(255), nullable=True)
    location = Column(String(255), nullable=True)
    salary = Column(String(255), nullable=True)  # String to handle formats like '12 LPA' or '100,000'
    experience = Column(String(255), nullable=True)
    description = Column(Text, nullable=False)
    requirements = Column(Text, nullable=True)
    deadline = Column(DateTime, nullable=False)
    status = Column(String(50), default="open", nullable=False)  # open, closed
    ctc = Column(Float, nullable=True)
    eligibility_cgpa = Column(Float, default=0.0, nullable=False)

    # Relationships
    company = relationship("Company", back_populates="jobs")
    applications = relationship("Application", back_populates="job", cascade="all, delete-orphan")
