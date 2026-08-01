from datetime import datetime, timezone
from app.models import NewsItem, Advisory, CVEEntry, KEVEntry, RansomwareVictim


def _seed(db_session):
    now = datetime.now(timezone.utc)
    db_session.add(NewsItem(source="Test", title="Hello", link="https://x/1", published_at=now))
    db_session.add(Advisory(source="CISA", title="Adv", link="https://x/2", published_at=now))
    db_session.add(CVEEntry(cve_id="CVE-2026-1", severity="HIGH", cvss_score=7.5, published_at=now))
    db_session.add(KEVEntry(cve_id="CVE-2026-1", known_ransomware_use="Known", date_added=now))
    db_session.add(RansomwareVictim(group_name="G1", victim_name="V1", sector="Finance", published_at=now))
    db_session.commit()


def test_news_endpoint_returns_seeded_item(client, db_session):
    _seed(db_session)
    resp = client.get("/api/news")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["title"] == "Hello"


def test_cves_endpoint_min_score_filter(client, db_session):
    _seed(db_session)
    assert client.get("/api/cves", params={"min_score": 8}).json() == []
    assert len(client.get("/api/cves", params={"min_score": 5}).json()) == 1


def test_kev_ransomware_only_filter(client, db_session):
    _seed(db_session)
    resp = client.get("/api/kev", params={"ransomware_only": True})
    assert len(resp.json()) == 1


def test_stats_endpoint_counts(client, db_session):
    _seed(db_session)
    body = client.get("/api/stats").json()
    assert body["total_news"] == 1
    assert body["total_cves"] == 1
    assert body["kev_ransomware_flagged"] == 1


def test_analytics_severity_distribution(client, db_session):
    _seed(db_session)
    body = client.get("/api/analytics/severity-distribution").json()
    assert {"severity": "HIGH", "count": 1} in body


def test_analytics_top_ransomware_groups(client, db_session):
    _seed(db_session)
    body = client.get("/api/analytics/top-ransomware-groups").json()
    assert body[0]["group_name"] == "G1"
    assert body[0]["count"] == 1


def test_analytics_news_volume_shape(client, db_session):
    _seed(db_session)
    body = client.get("/api/analytics/news-volume", params={"days": 7}).json()
    assert len(body) == 7
    assert sum(d["count"] for d in body) == 1
