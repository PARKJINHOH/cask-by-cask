from __future__ import annotations

from pathlib import Path
from typing import Any

import requests


class AiNewsApi:
    def __init__(self, base_url: str, internal_key: str, timeout: int = 30):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.headers = {"X-Internal-Key": internal_key, "Accept": "application/json"}

    def _data(self, response: requests.Response) -> Any:
        response.raise_for_status()
        body = response.json()
        if not body.get("success", False):
            raise RuntimeError(body.get("message") or "AI 소식 API 요청 실패")
        return body.get("data")

    def config(self) -> dict:
        response = requests.get(f"{self.base_url}/api/internal/ai-news/config", headers=self.headers, timeout=self.timeout)
        return self._data(response)

    def start_run(self, run_key: str, run_type: str) -> dict:
        response = requests.post(f"{self.base_url}/api/internal/ai-news/runs", headers=self.headers,
                                 json={"runKey": run_key, "runType": run_type}, timeout=self.timeout)
        return self._data(response)

    def finish_run(self, run_id: int, stats: dict) -> dict:
        response = requests.patch(f"{self.base_url}/api/internal/ai-news/runs/{run_id}/finish",
                                  headers=self.headers, json=stats, timeout=self.timeout)
        return self._data(response)

    def submit_article(self, payload: dict) -> dict:
        response = requests.post(f"{self.base_url}/api/internal/ai-news/articles", headers=self.headers,
                                 json=payload, timeout=max(self.timeout, 60))
        return self._data(response)

    def create_topic_suggestion(self, payload: dict) -> dict:
        response = requests.post(f"{self.base_url}/api/internal/ai-news/topics/suggestions",
                                 headers=self.headers, json=payload, timeout=self.timeout)
        return self._data(response)

    def check_duplicate(self, dedupe_key: str, canonical_url_hash: str | None,
                        semantic_fingerprint: str, article_type: str) -> dict:
        response = requests.get(
            f"{self.base_url}/api/internal/ai-news/dedupe",
            headers=self.headers,
            params={"dedupeKey": dedupe_key, "canonicalUrlHash": canonical_url_hash,
                    "semanticFingerprint": semantic_fingerprint, "type": article_type},
            timeout=self.timeout,
        )
        return self._data(response)

    def record_duplicate(self, payload: dict) -> dict:
        response = requests.post(f"{self.base_url}/api/internal/ai-news/duplicates",
                                 headers=self.headers, json=payload, timeout=self.timeout)
        return self._data(response)

    def record_usage(self, payload: dict) -> None:
        response = requests.post(f"{self.base_url}/api/internal/ai-news/usage", headers=self.headers,
                                 json=payload, timeout=self.timeout)
        self._data(response)

    def upload_image(self, path: Path) -> str:
        mime = {
            ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
        }.get(path.suffix.lower(), "application/octet-stream")
        with path.open("rb") as handle:
            response = requests.post(
                f"{self.base_url}/api/internal/ai-news/images",
                headers=self.headers,
                files={"image": (path.name, handle, mime)},
                timeout=max(self.timeout, 60),
            )
        data = self._data(response)
        return data["imageUrl"]
