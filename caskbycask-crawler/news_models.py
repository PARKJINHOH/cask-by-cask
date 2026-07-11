from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from zoneinfo import ZoneInfo
import hashlib


TRACKING_QUERY_KEYS = {"fbclid", "gclid", "ref", "source"}
SERVICE_ZONE = ZoneInfo("Asia/Seoul")


def canonicalize_url(value: str) -> str:
    parsed = urlsplit(value.strip())
    if parsed.scheme.lower() not in {"http", "https"} or not parsed.hostname:
        raise ValueError(f"Invalid HTTP URL: {value}")
    scheme = parsed.scheme.lower()
    host = parsed.hostname.lower().removeprefix("www.")
    port = parsed.port
    if port and not ((scheme == "http" and port == 80) or (scheme == "https" and port == 443)):
        host = f"{host}:{port}"
    path = parsed.path.rstrip("/")
    query = urlencode(sorted(
        (key, item) for key, item in parse_qsl(parsed.query, keep_blank_values=True)
        if not key.lower().startswith("utm_") and key.lower() not in TRACKING_QUERY_KEYS
    ))
    return urlunsplit((scheme, host, path, query, ""))


def local_datetime_string(value: str | None = None) -> str | None:
    if not value:
        return datetime.now(SERVICE_ZONE).replace(tzinfo=None).isoformat(timespec="seconds")
    candidate = str(value).strip()
    if not candidate:
        return None
    try:
        if len(candidate) == 10:
            candidate += "T00:00:00"
        parsed = datetime.fromisoformat(candidate.replace("Z", "+00:00"))
        if parsed.tzinfo:
            parsed = parsed.astimezone(SERVICE_ZONE).replace(tzinfo=None)
        return parsed.isoformat(timespec="seconds")
    except ValueError:
        return None


@dataclass
class SearchSource:
    title: str
    url: str
    domain: str
    content: str
    score: float = 0.0
    published_at: str | None = None
    source_type: str = "UNAPPROVED"

    def evidence_payload(self) -> dict[str, Any]:
        canonical_url = canonicalize_url(self.url)
        return {
            "sourceUrl": self.url,
            "canonicalUrl": canonical_url,
            "domain": self.domain,
            "sourceTitle": self.title[:500],
            "sourceType": self.source_type,
            "evidenceSummary": self.content[:2000] or None,
            "contentHash": hashlib.sha256(self.content.encode("utf-8")).hexdigest(),
            "publishedAt": local_datetime_string(self.published_at) if self.published_at else None,
            "retrievedAt": local_datetime_string(),
        }


@dataclass
class DraftArticle:
    article_type: str
    category: str
    title: str
    content_html: str
    dedupe_key: str
    semantic_fingerprint: str
    confidence: float
    source_indexes: list[int]
    image_prompt: str
    topic_id: int | None = None
    image_url: str | None = None
    image_kind: str | None = None
    image_rights_evidence: str | None = None
    model_name: str | None = None


@dataclass
class UsageAccumulator:
    input_tokens: int = 0
    output_tokens: int = 0
    image_count: int = 0
    estimated_cost_usd: float = 0.0
    by_model: dict[str, dict[str, int]] = field(default_factory=dict)

    def add_text(self, model: str, input_tokens: int, output_tokens: int) -> None:
        self.input_tokens += max(0, input_tokens)
        self.output_tokens += max(0, output_tokens)
        entry = self.by_model.setdefault(model, {"input": 0, "output": 0})
        entry["input"] += max(0, input_tokens)
        entry["output"] += max(0, output_tokens)

    def add_image(self, estimated_cost_usd: float) -> None:
        self.image_count += 1
        self.estimated_cost_usd += max(0.0, estimated_cost_usd)
