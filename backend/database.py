import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

# Configure this in your .env file
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:password@localhost/emotion_db")

# Railway provides DATABASE_URL starting with mysql:// which defaults to MySQLdb. 
# We replace it to use pymysql which is installed.
if DATABASE_URL.startswith("mysql://"):
    DATABASE_URL = DATABASE_URL.replace("mysql://", "mysql+pymysql://", 1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
