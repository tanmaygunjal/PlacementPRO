import sys
import os

# Add the backend directory to Python's sys.path so 'app' packages can be imported correctly
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.main import app
