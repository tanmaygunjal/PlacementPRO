from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os
from sqlalchemy.ext.declarative import declarative_base
from supabase import create_client

import re

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Check if DATABASE_URL is empty or not set
if not DATABASE_URL:
    DATABASE_URL = "sqlite:///./placementpro.db"

# Force SQLAlchemy to use pg8000 dialect for PostgreSQL on Vercel
if DATABASE_URL.startswith("postgresql://") or DATABASE_URL.startswith("postgres://"):
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+pg8000://", 1)
    else:
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+pg8000://", 1)

engine = create_engine(
    DATABASE_URL
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase = None
if SUPABASE_URL and SUPABASE_KEY and SUPABASE_KEY != "YOUR_SUPABASE_ANON_OR_SERVICE_KEY":
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"Warning: Could not initialize Supabase client: {e}")



