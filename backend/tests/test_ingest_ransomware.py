from app.ingest.ransomware import process_records
from app.models import RansomwareVictim

SAMPLE_RECORDS = [
    {
        "group_name": "TestGroup",
        "post_title": "Example Manufacturing Co",
        "discovered": "2026-07-18",
        "country": "US",
        "activity": "Manufacturing",
        "post_url": "https://example.com/leak/1",
    }
]


def test_process_records_inserts_victim(db_session):
    count = process_records(db_session, SAMPLE_RECORDS)
    db_session.commit()
    assert count == 1
    v = db_session.query(RansomwareVictim).one()
    assert v.group_name == "TestGroup"
    assert v.victim_name == "Example Manufacturing Co"
    assert v.sector == "Manufacturing"
    assert v.country == "US"


def test_process_records_skips_missing_victim_name(db_session):
    count = process_records(db_session, [{"group_name": "G"}])
    db_session.commit()
    assert count == 0
