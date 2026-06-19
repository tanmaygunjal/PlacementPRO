from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os
from sqlalchemy.ext.declarative import declarative_base
from supabase import create_client

import re

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def rewrite_supabase_url(url: str) -> str:
    if not url:
        return url
    pattern = r"^(?P<dialect>[a-zA-Z0-9+_]+)://(?P<user>[^:]+):(?P<password>[^@]+)@(?P<host>[^:/]+)(?::(?P<port>\d+))?/(?P<db>.+)$"
    match = re.match(pattern, url)
    if not match:
        return url
    gd = match.groupdict()
    dialect = gd['dialect']
    user = gd['user']
    password = gd['password']
    host = gd['host']
    port = gd['port'] or "5432"
    db = gd['db']
    if "pooler.supabase.com" in host and "." in user:
        real_user, project_ref = user.split(".", 1)
        host = f"db.{project_ref}.supabase.co"
        port = "5432"
        user = real_user
    if dialect in ["postgresql", "postgres"]:
        dialect = "postgresql+pg8000"
    return f"{dialect}://{user}:{password}@{host}:{port}/{db}"

DATABASE_URL = rewrite_supabase_url(DATABASE_URL)

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



