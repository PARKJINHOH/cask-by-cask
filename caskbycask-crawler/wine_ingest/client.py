from __future__ import annotations

import requests


class WineIngestApi:
    def __init__(self, api_url: str, internal_key: str, timeout: int = 20):
        self.base = f"{api_url.rstrip('/')}/api/internal/wine-ingest"
        self.timeout = timeout
        self.headers = {"X-Internal-Key": internal_key, "Content-Type": "application/json"}

    def _request(self, method: str, path: str, payload: dict | None = None):
        response = requests.request(
            method, f"{self.base}{path}", json=payload, headers=self.headers, timeout=self.timeout,
        )
        response.raise_for_status()
        body = response.json()
        if not body.get("success"):
            raise RuntimeError(body.get("message") or f"API failed: {path}")
        return body.get("data")

    def config(self):
        return self._request("GET", "/config")

    def enqueue_scheduled(self):
        return self._request("POST", "/runs/scheduled")

    def claim(self):
        return self._request("POST", "/runs/claim")

    def heartbeat(self, run_key: str):
        return self._request("POST", f"/runs/{run_key}/heartbeat")

    def import_wine(self, run_key: str, payload: dict):
        return self._request("POST", f"/runs/{run_key}/items/import", payload)

    def failure(self, run_key: str, payload: dict):
        return self._request("POST", f"/runs/{run_key}/items/failure", payload)

    def finish(self, run_key: str, error_message: str | None = None):
        return self._request("PATCH", f"/runs/{run_key}/finish", {"errorMessage": error_message})
