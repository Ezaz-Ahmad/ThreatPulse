import feedparser
from app.ingest.cisa import process_kev_json, process_advisories_feed
from app.models import KEVEntry, Advisory

SAMPLE_KEV = {
    "vulnerabilities": [
        {
            "cveID": "CVE-2026-11111",
            "vendorProject": "ExampleCorp",
            "product": "ExampleGateway",
            "vulnerabilityName": "ExampleGateway Remote Code Execution",
            "dateAdded": "2026-07-15",
            "dueDate": "2026-08-05",
            "knownRansomwareCampaignUse": "Known",
            "shortDescription": "Allows unauthenticated RCE.",
        }
    ]
}

SAMPLE_ADVISORY_RSS = """<?xml version="1.0"?>
<rss version="2.0"><channel><title>CISA</title>
<item>
  <title>CISA Releases Advisory on Industrial Control Systems</title>
  <link>https://cisa.gov/advisory-1</link>
  <guid>https://cisa.gov/advisory-1</guid>
  <pubDate>Tue, 21 Jul 2026 09:00:00 GMT</pubDate>
</item>
</channel></rss>"""


def test_process_kev_json_inserts_entry(db_session):
    count = process_kev_json(db_session, SAMPLE_KEV)
    db_session.commit()
    assert count == 1

    entry = db_session.query(KEVEntry).one()
    assert entry.cve_id == "CVE-2026-11111"
    assert entry.known_ransomware_use == "Known"
    assert entry.date_added is not None


def test_process_kev_json_dedupes(db_session):
    process_kev_json(db_session, SAMPLE_KEV)
    db_session.commit()
    second = process_kev_json(db_session, SAMPLE_KEV)
    db_session.commit()
    assert second == 0


def test_process_advisories_feed(db_session):
    parsed = feedparser.parse(SAMPLE_ADVISORY_RSS)
    count = process_advisories_feed(db_session, parsed)
    db_session.commit()
    assert count == 1
    adv = db_session.query(Advisory).one()
    assert "Industrial Control Systems" in adv.title
