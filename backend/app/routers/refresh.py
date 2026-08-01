import logging
from fastapi import APIRouter, BackgroundTasks
from app.ingest.run_all import run_all_ingestion

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/refresh", tags=["refresh"])


@router.post("")
def trigger_refresh(background_tasks: BackgroundTasks):
    """Kick off a full ingestion run in the background and return immediately.

    The ingestion pipeline (6 news feeds, CISA advisories/KEV, NVD CVEs with a
    deliberate rate-limit delay, ransomware.live) can take anywhere from
    30 seconds to a couple of minutes. Running it synchronously inside the
    request made the "Refresh Now" button feel broken (and risked hitting a
    gateway timeout on Render/Vercel). Instead we queue it as a background
    task and let the frontend poll /api/stats for the updated last_ingest_at
    timestamp.
    """
    background_tasks.add_task(run_all_ingestion)
    logger.info("Refresh requested - ingestion queued in background")
    return {"status": "started"}
