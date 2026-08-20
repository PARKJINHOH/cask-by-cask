from __future__ import annotations

from typing import Any

import requests


class AiNewsApi:
    def __init__(self, base_url: str, internal_key: str, timeout: int = 30):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.headers = {"X-Internal-Key": internal_key, "Accept": "application/json"}

    def _data(self, response: requests.Response) -> Any:
        if response.status_code >= 400:
            try:
                error_body = response.json()
            except ValueError:
                error_body = response.text
            raise RuntimeError(
                f"AI 소식 API 오류 status={response.status_code}, body={str(error_body)[:1500]}"
            )
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

    def submit_lead(self, payload: dict) -> dict:
        """소재를 저장한다. 본문 없이 제목·요약·근거만 보낸다."""
        response = requests.post(f"{self.base_url}/api/internal/ai-news/leads", headers=self.headers,
                                 json=payload, timeout=max(self.timeout, 60))
        return self._data(response)

    def check_duplicate(self, dedupe_key: str, canonical_url_hash: str | None) -> dict:
        response = requests.get(
            f"{self.base_url}/api/internal/ai-news/dedupe",
            headers=self.headers,
            params={"dedupeKey": dedupe_key, "canonicalUrlHash": canonical_url_hash},
            timeout=self.timeout,
        )
        return self._data(response)

    def record_usage(self, payload: dict) -> None:
        response = requests.post(f"{self.base_url}/api/internal/ai-news/usage", headers=self.headers,
                                 json=payload, timeout=self.timeout)
        self._data(response)

    def record_source_crawl_result(self, source_id: int, status: str,
                                   error_message: str | None = None) -> None:
        response = requests.patch(
            f"{self.base_url}/api/internal/ai-news/sources/{source_id}/crawl-result",
            headers=self.headers,
            json={"status": status, "errorMessage": error_message},
            timeout=self.timeout,
        )
        self._data(response)
