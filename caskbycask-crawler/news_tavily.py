from __future__ import annotations

from urllib.parse import urlparse

import requests

from news_models import SearchSource


class TavilyNewsSearch:
    def __init__(self, api_key: str, timeout: int = 30, max_results: int = 10):
        self.api_key = api_key
        self.timeout = timeout
        self.max_results = max(1, min(20, max_results))
        self.credits_used = 0

    def search(self, query: str, *, topic: str = "news", time_range: str | None = "day",
               include_domains: list[str] | None = None) -> list[SearchSource]:
        payload = {
            "query": query,
            "topic": topic,
            "search_depth": "basic",
            "max_results": self.max_results,
            "include_answer": False,
            "include_raw_content": "text",
            "include_images": False,
        }
        if time_range:
            payload["time_range"] = time_range
        if include_domains:
            payload["include_domains"] = list(dict.fromkeys(include_domains))[:300]
        response = requests.post(
            "https://api.tavily.com/search",
            headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
            json=payload,
            timeout=self.timeout,
        )
        response.raise_for_status()
        self.credits_used += 1
        result = response.json()
        sources: list[SearchSource] = []
        for item in result.get("results", []):
            url = str(item.get("url") or "").strip()
            host = (urlparse(url).hostname or "").lower().removeprefix("www.")
            if not url.startswith(("http://", "https://")) or not host:
                continue
            raw = item.get("raw_content") or item.get("content") or ""
            sources.append(SearchSource(
                title=str(item.get("title") or host)[:500],
                url=url[:1500],
                domain=host[:255],
                content=str(raw)[:12000],
                score=float(item.get("score") or 0),
                published_at=item.get("published_date"),
            ))
        return sources
