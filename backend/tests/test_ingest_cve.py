from app.ingest.cve import process_cve_page
from app.models import CVEEntry

SAMPLE_CVE_PAGE = {
    "totalResults": 1,
    "vulnerabilities": [
        {
            "cve": {
                "id": "CVE-2026-22222",
                "published": "2026-07-10T12:00:00.000",
                "descriptions": [{"lang": "en", "value": "A critical RCE in a popular web server."}],
                "metrics": {
                    "cvssMetricV31": [
                        {"baseSeverity": "CRITICAL", "cvssData": {"baseScore": 9.8}}
                    ]
                },
            }
        }
    ],
}


def test_process_cve_page_inserts_entry(db_session):
    count = process_cve_page(db_session, SAMPLE_CVE_PAGE)
    db_session.commit()
    assert count == 1
    entry = db_session.query(CVEEntry).one()
    assert entry.cve_id == "CVE-2026-22222"
    assert entry.cvss_score == 9.8
    assert entry.severity == "CRITICAL"


def test_process_cve_page_skips_entries_without_id(db_session):
    count = process_cve_page(db_session, {"vulnerabilities": [{"cve": {}}]})
    db_session.commit()
    assert count == 0
