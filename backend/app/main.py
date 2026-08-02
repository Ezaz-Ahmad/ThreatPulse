import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.scheduler import start_scheduler, shutdown_scheduler
from app.ingest.run_all import run_all_ingestion
from app.routers import news, advisories, cves, kev, ransomware, stats, refresh, analytics, ioc

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    scheduler = start_scheduler()
    # Kick off one ingestion run in the background at startup so the dashboard
    # isn't empty on first launch.
    try:
        scheduler.add_job(run_all_ingestion, id="startup_ingest", replace_existing=True)
    except Exception:
        logger.exception("Could not schedule startup ingestion job")
    yield
    shutdown_scheduler()


app = FastAPI(title="ThreatPulse API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(news.router)
app.include_router(advisories.router)
app.include_router(cves.router)
app.include_router(kev.router)
app.include_router(ransomware.router)
app.include_router(stats.router)
app.include_router(refresh.router)
app.include_router(analytics.router)
app.include_router(ioc.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
