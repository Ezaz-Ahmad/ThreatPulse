import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# By default this runs on local SQLite (zero setup). Set DATABASE_URL to point
# at a real Postgres instance (e.g. a free Neon/Supabase database) for a
# production deployment where the filesystem isn't persistent (Render, Fly.io,
# most free-tier hosts wipe local disk on every restart/redeploy).
DEFAULT_SQLITE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "cyber_intel.db"
)
DATABASE_URL = os.getenv("DATABASE_URL") or f"sqlite:///{os.getenv('DB_PATH', DEFAULT_SQLITE_PATH)}"

# Render/Heroku-style URLs sometimes use "postgres://" which SQLAlchemy 2.x no
# longer accepts - normalize to the psycopg driver form.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from app import models  # noqa: F401  (ensure models are registered)
    Base.metadata.create_all(bind=engine)
