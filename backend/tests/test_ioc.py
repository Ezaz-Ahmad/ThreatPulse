from datetime import datetime, timezone

import pytest

from app.ioc.validators import identify_ioc, InvalidIOCError
from app.ioc.scoring import score_lookup
from app.ioc.rules import generate_recommendations, priority_for_verdict
from app.ioc import providers
from app.models import NewsItem
from app.routers import ioc as ioc_router


# ------------------------------------------------------------- validators

def test_identify_ipv4():
    assert identify_ioc("185.220.101.45") == ("ipv4", "185.220.101.45")


def test_identify_domain():
    assert identify_ioc("evil-domain.com") == ("domain", "evil-domain.com")


def test_identify_url():
    kind, value = identify_ioc("https://evil-domain.com/payload.exe")
    assert kind == "url"
    assert value == "https://evil-domain.com/payload.exe"


def test_identify_hash():
    sha256 = "a" * 64
    assert identify_ioc(sha256) == ("sha256", sha256)
    md5 = "b" * 32
    assert identify_ioc(md5) == ("md5", md5)


def test_identify_rejects_garbage():
    with pytest.raises(InvalidIOCError):
        identify_ioc("not a real indicator!!")


def test_identify_rejects_empty():
    with pytest.raises(InvalidIOCError):
        identify_ioc("   ")


# ---------------------------------------------------- provider type dispatch
# Regression coverage for a real bug: validators.py returns specific hash
# subtypes ("md5"/"sha1"/"sha256"), but providers.py/scoring.py used to check
# for a generic "hash" type that never actually occurs, silently making
# VirusTotal/OTX/URLhaus report every hash lookup as unsupported. These tests
# assert each provider actually attempts a request for hash types instead of
# short-circuiting to "unsupported_type".

def test_virustotal_supports_all_hash_subtypes(monkeypatch):
    calls = []

    class FakeResp:
        status_code = 404

    def fake_get(url, headers=None, timeout=None):
        calls.append(url)
        return FakeResp()

    monkeypatch.setattr(providers, "_get_key", lambda name: "fake-key")
    monkeypatch.setattr(providers.requests, "get", fake_get)

    for sub in ("md5", "sha1", "sha256"):
        result = providers.query_virustotal("deadbeef", sub)
        assert result["status"] == "no_match"  # reached the API, got a 404
    assert len(calls) == 3


def test_otx_supports_all_hash_subtypes(monkeypatch):
    class FakeResp:
        status_code = 404

    monkeypatch.setattr(providers, "_get_key", lambda name: "fake-key")
    monkeypatch.setattr(providers.requests, "get", lambda *a, **k: FakeResp())

    for sub in ("md5", "sha1", "sha256"):
        result = providers.query_otx("deadbeef", sub)
        assert result["status"] == "no_match"


def test_urlhaus_supports_md5_and_sha256_not_sha1(monkeypatch):
    posted_fields = []

    class FakeResp:
        status_code = 200

        def raise_for_status(self):
            pass

        def json(self):
            return {"query_status": "no_results"}

    def fake_post(url, data=None, headers=None, timeout=None):
        posted_fields.append(list(data.keys())[0])
        return FakeResp()

    monkeypatch.setattr(providers, "_get_key", lambda name: "fake-key")
    monkeypatch.setattr(providers.requests, "post", fake_post)

    assert providers.query_urlhaus("a" * 32, "md5")["status"] == "no_match"
    assert providers.query_urlhaus("a" * 64, "sha256")["status"] == "no_match"
    assert posted_fields == ["md5_hash", "sha256_hash"]

    # SHA1 genuinely isn't supported by URLhaus's payload endpoint - this
    # should report unsupported_type, not silently query the wrong field.
    result = providers.query_urlhaus("a" * 40, "sha1")
    assert result["status"] == "unsupported_type"


def _sources(**overrides):
    base = {
        "abuseipdb": {"status": "not_configured"},
        "virustotal": {"status": "not_configured"},
        "otx": {"status": "not_configured"},
        "urlhaus": {"status": "no_match"},
        "threatpulse": {"status": "no_match", "mention_count": 0},
    }
    base.update(overrides)
    return base


def _correlation(**overrides):
    base = {"status": "no_match", "mention_count": 0, "mentions": [], "ransomware_groups": []}
    base.update(overrides)
    return base


# ------------------------------------------------- recommendation rule engine

def test_priority_for_verdict_matches_scoring_tiers():
    assert priority_for_verdict("strong_malicious_indicators") == "high"
    assert priority_for_verdict("moderate_risk_indicators") == "medium"
    assert priority_for_verdict("low_risk_indicators") == "low"
    assert priority_for_verdict("no_significant_indicators") == "none"


def test_ip_high_priority_leads_with_firewall_guidance():
    result = generate_recommendations("ipv4", "strong_malicious_indicators", _sources(), _correlation())
    assert result["priority"] == "high"
    assert any("firewall" in a.lower() for a in result["actions"])


def test_domain_high_priority_leads_with_dns_not_firewall():
    result = generate_recommendations("domain", "strong_malicious_indicators", _sources(), _correlation())
    assert result["priority"] == "high"
    assert "dns" in result["actions"][0].lower()
    assert not any("firewall" in a.lower() for a in result["actions"])


def test_hash_high_priority_leads_with_edr_guidance():
    result = generate_recommendations("sha256", "strong_malicious_indicators", _sources(), _correlation())
    assert result["priority"] == "high"
    assert any("edr" in a.lower() for a in result["actions"])


def test_benign_result_gets_short_no_action_message():
    result = generate_recommendations("ipv4", "no_significant_indicators", _sources(), _correlation())
    assert result["priority"] == "none"
    assert result["actions"] == [
        "No immediate action required.",
        "Continue normal monitoring.",
        "Validate against your internal environment if this IP appears unexpectedly.",
    ]


def test_hash_lookup_with_malware_family_adds_family_specific_actions():
    sources = _sources(virustotal={"status": "success", "malicious": 63, "suspicious": 0, "harmless": 8, "malware_family": "Lumma Stealer"})
    result = generate_recommendations("sha256", "strong_malicious_indicators", sources, _correlation())
    joined = " ".join(result["actions"]).lower()
    assert "lumma stealer" in joined
    assert "credential" in joined


def test_ransomware_group_correlation_adds_group_specific_actions():
    correlation = _correlation(status="success", mention_count=1, ransomware_groups=["LockBit"])
    result = generate_recommendations("ipv4", "strong_malicious_indicators", _sources(), correlation)
    joined = " ".join(result["actions"]).lower()
    assert "lockbit" in joined
    assert "vss" in joined or "volume shadow copy" in joined


def test_unrecognized_ransomware_group_still_gets_generic_guidance():
    correlation = _correlation(status="success", mention_count=1, ransomware_groups=["SomeNewGroup2026"])
    result = generate_recommendations("domain", "moderate_risk_indicators", _sources(), correlation)
    joined = " ".join(result["actions"]).lower()
    assert "somenewgroup2026" in joined
    assert "backup" in joined


def test_benign_result_ignores_family_and_group_signals():
    # A clean/no-signal verdict shouldn't get padded with hypothetical
    # family/group guidance even if those fields happen to be populated.
    sources = _sources(virustotal={"status": "no_match", "malicious": 0, "suspicious": 0, "harmless": 70, "malware_family": "Lumma Stealer"})
    correlation = _correlation(ransomware_groups=["LockBit"])
    result = generate_recommendations("sha256", "no_significant_indicators", sources, correlation)
    assert result["priority"] == "none"
    assert not any("lumma" in a.lower() or "lockbit" in a.lower() for a in result["actions"])


# --------------------------------------------------------------- scoring

def test_score_lookup_strong_malicious():
    sources = {
        "abuseipdb": {"status": "success", "abuse_confidence_score": 92, "total_reports": 148},
        "virustotal": {"status": "success", "malicious": 8, "suspicious": 2, "harmless": 61},
        "otx": {"status": "success", "pulse_count": 6},
        "urlhaus": {"status": "no_match"},
        "threatpulse": {"status": "success", "mention_count": 2},
    }
    correlation = {"status": "success", "mention_count": 2, "mentions": []}
    result = score_lookup(sources, correlation)
    assert result["risk_score"] == 30 + 35 + 10 + 12  # abuseipdb + vt + otx + threatpulse(2 mentions)
    assert result["verdict"] == "strong_malicious_indicators"
    assert result["confidence"] == "high"


def test_score_lookup_no_signal_is_low_confidence():
    sources = {
        "abuseipdb": {"status": "not_configured"},
        "virustotal": {"status": "not_configured"},
        "otx": {"status": "not_configured"},
        "urlhaus": {"status": "no_match"},
        "threatpulse": {"status": "no_match", "mention_count": 0},
    }
    correlation = {"status": "no_match", "mention_count": 0, "mentions": []}
    result = score_lookup(sources, correlation)
    assert result["risk_score"] == 0
    assert result["verdict"] == "no_significant_indicators"
    assert result["confidence"] == "low"


# ----------------------------------------------------------------- API

def _fake_query_all(indicator, indicator_type):
    return {
        "abuseipdb": {"status": "success", "abuse_confidence_score": 92, "total_reports": 148, "last_reported_at": None},
        "virustotal": {"status": "success", "malicious": 8, "suspicious": 2, "harmless": 61},
        "otx": {"status": "success", "pulse_count": 6},
        "urlhaus": {"status": "no_match"},
    }


def test_lookup_endpoint_returns_report(client, db_session, monkeypatch):
    monkeypatch.setattr(ioc_router, "query_all", _fake_query_all)
    resp = client.post("/api/ioc/lookup", json={"indicator": "185.220.101.45"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["indicator"] == "185.220.101.45"
    assert body["indicator_type"] == "ipv4"
    assert body["cached"] is False
    assert body["risk_score"] > 0
    assert body["sources"]["abuseipdb"]["abuse_confidence_score"] == 92
    assert body["analyst_guidance"]["priority"] == "high"
    assert len(body["analyst_guidance"]["actions"]) > 0


def test_lookup_endpoint_uses_cache_on_second_call(client, db_session, monkeypatch):
    calls = {"n": 0}

    def counting_query_all(indicator, indicator_type):
        calls["n"] += 1
        return _fake_query_all(indicator, indicator_type)

    monkeypatch.setattr(ioc_router, "query_all", counting_query_all)

    first = client.post("/api/ioc/lookup", json={"indicator": "185.220.101.45"})
    second = client.post("/api/ioc/lookup", json={"indicator": "185.220.101.45"})

    assert first.json()["cached"] is False
    assert second.json()["cached"] is True
    assert calls["n"] == 1  # second call served entirely from cache


def test_lookup_endpoint_rejects_invalid_indicator(client, db_session):
    resp = client.post("/api/ioc/lookup", json={"indicator": "!!not-valid!!"})
    assert resp.status_code == 422


def test_lookup_correlates_with_ingested_news(client, db_session, monkeypatch):
    monkeypatch.setattr(ioc_router, "query_all", _fake_query_all)
    db_session.add(NewsItem(
        source="Test",
        title="Botnet using 185.220.101.45 spotted in the wild",
        link="https://example.com/article",
        published_at=datetime.now(timezone.utc),
    ))
    db_session.commit()

    resp = client.post("/api/ioc/lookup", json={"indicator": "185.220.101.45"})
    body = resp.json()
    assert body["correlation"]["mention_count"] == 1
    assert body["sources"]["threatpulse"]["mention_count"] == 1


def test_cached_lookup_tolerates_pre_rule_engine_flat_list_format(client, db_session):
    # Simulate a row cached before the rule engine shipped, when
    # analyst_guidance_json stored a flat list of strings rather than
    # {"priority": ..., "actions": [...]}.
    from app.models import IOCLookup
    import json as json_module

    db_session.add(IOCLookup(
        indicator="203.0.113.9",
        indicator_type="ipv4",
        risk_score=85,
        verdict="strong_malicious_indicators",
        verdict_label="Strong malicious indicators",
        confidence="high",
        sources_json="{}",
        score_reasons_json="[]",
        analyst_guidance_json=json_module.dumps(["Old-format action line."]),
        correlation_json="{}",
        fetched_at=datetime.now(timezone.utc),
    ))
    db_session.commit()

    resp = client.post("/api/ioc/lookup", json={"indicator": "203.0.113.9"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["cached"] is True
    assert body["analyst_guidance"]["priority"] == "high"
    assert body["analyst_guidance"]["actions"] == ["Old-format action line."]


def test_recent_lookups_endpoint(client, db_session, monkeypatch):
    monkeypatch.setattr(ioc_router, "query_all", _fake_query_all)
    client.post("/api/ioc/lookup", json={"indicator": "185.220.101.45"})
    resp = client.get("/api/ioc/recent")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["indicator"] == "185.220.101.45"
