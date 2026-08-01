import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.database import Base, get_db
from app.routers import news, advisories, cves, kev, ransomware, stats, analytics


@pytest.fixture()
def db_session(tmp_path):
    """A fresh, isolated SQLite database for a single test."""
    db_path = tmp_path / "test.db"
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture()
def client(db_session):
    """A FastAPI TestClient wired to the isolated test database.

    Built from a standalone app (not app.main.app) so tests never trigger the
    real startup lifespan/scheduler/network ingestion - only the routers
    under test are mounted.
    """
    test_app = FastAPI()
    test_app.include_router(news.router)
    test_app.include_router(advisories.router)
    test_app.include_router(cves.router)
    test_app.include_router(kev.router)
    test_app.include_router(ransomware.router)
    test_app.include_router(stats.router)
    test_app.include_router(analytics.router)

    def _get_db_override():
        yield db_session

    test_app.dependency_overrides[get_db] = _get_db_override
    return TestClient(test_app)
