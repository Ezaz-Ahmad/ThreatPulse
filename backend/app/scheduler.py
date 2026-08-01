import os
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from app.ingest.run_all import run_all_ingestion

logger = logging.getLogger(__name__)

_scheduler = None


def start_scheduler():
    global _scheduler
    if _scheduler is not None:
        return _scheduler
    interval_hours = float(os.getenv("UPDATE_INTERVAL_HOURS", "1"))
    _scheduler = BackgroundScheduler(timezone="UTC")
    _scheduler.add_job(
        run_all_ingestion,
        "interval",
        hours=interval_hours,
        id="ingest_all",
        next_run_time=None,  # first run triggered manually at startup, see main.py
        max_instances=1,
        coalesce=True,
    )
    _scheduler.start()
    logger.info("Scheduler started: ingestion every %s hours", interval_hours)
    return _scheduler


def shutdown_scheduler():
    global _scheduler
    if _scheduler:
        _scheduler.shutdown(wait=False)
        _scheduler = None
