from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
import hashlib


TRACKING_QUERY_KEYS = {"fbclid", "gclid", "ref", "source"}
try:
    SERVICE_ZONE = ZoneInfo("Asia/Seoul")
except ZoneInfoNotFoundError:
    # Windows의 최소 Python 설치처럼 IANA tzdata가 없는 환경에서도 KST는 DST가 없어 고정 UTC+9로 안전하다.
    SERVICE_ZONE = timezone(timedelta(hours=9), name="Asia/Seoul")


def truncate_utf16(value: str, max_units: int) -> str:
    """Java Bean Validation @Size와 같은 UTF-16 code unit 기준으로 자른다."""
    if max_units <= 0:
        return ""
    result: list[str] = []
    units = 0
    for character in str(value):
        character_units = 2 if ord(character) > 0xFFFF else 1
        if units + character_units > max_units:
            break
        result.append(character)
        units += character_units
    return "".join(result)


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

    def evidence_payload(self) -> dict[str, Any]:
        canonical_url = canonicalize_url(self.url)
        return {
            "sourceUrl": truncate_utf16(self.url, 1500),
            "canonicalUrl": truncate_utf16(canonical_url, 1500),
            "domain": truncate_utf16(self.domain, 255),
            "sourceTitle": truncate_utf16(self.title, 500),
            "evidenceSummary": truncate_utf16(self.content, 2000) or None,
            "contentHash": hashlib.sha256(self.content.encode("utf-8")).hexdigest(),
            "publishedAt": local_datetime_string(self.published_at) if self.published_at else None,
            "retrievedAt": local_datetime_string(),
        }


@dataclass
class NewsLead:
    """AI 가 물어온 소재. 본문은 없다 — 관리자가 근거 URL 을 보고 직접 쓴다."""

    category: str
    title: str
    summary: str
    #: 같은 사건을 다시 잡았을 때 걸러 내는 안정 키. 백엔드 dedupeKey 로 그대로 간다.
    event_key: str
    source_indexes: list[int]
    confidence: float = 0.0
    model_name: str | None = None

    @property
    def dedupe_key(self) -> str:
        return f"release:{self.event_key}"


@dataclass
class UsageAccumulator:
    input_tokens: int = 0
    output_tokens: int = 0
    by_model: dict[str, dict[str, int]] = field(default_factory=dict)

    def add_text(self, model: str, input_tokens: int, output_tokens: int) -> None:
        self.input_tokens += max(0, input_tokens)
        self.output_tokens += max(0, output_tokens)
        entry = self.by_model.setdefault(model, {"input": 0, "output": 0})
        entry["input"] += max(0, input_tokens)
        entry["output"] += max(0, output_tokens)

