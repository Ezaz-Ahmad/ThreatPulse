from fastapi import APIRouter
from app.ingest.run_all import run_all_ingestion

router = APIRouter(prefix="/api/refresh", tags=["refresh"])


@router.post("")
def trigger_refresh():
    """Manually trigger a full ingestion run (synchronous - may take a bit)."""
    result = run_all_ingestion()
    return {"status": "ok", "results": result}
