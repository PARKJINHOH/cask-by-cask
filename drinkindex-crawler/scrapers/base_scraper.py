"""스크래퍼 공통 베이스.

신규 사이트는 BaseScraper 를 상속하여 fetch_list / fetch_detail 두 메서드만 구현하면
main 오케스트레이터가 동일하게 다룬다. (면세/쇼핑몰 등 확장 지점)
"""
from __future__ import annotations

import time

import requests

from logger import get_logger
from models import PostDetail, RawPost

log = get_logger("scraper")

DEFAULT_UA = (
    "Mozilla/5.0 (Linux; Android 13; SM-S918N) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
)


class BaseScraper:
    site = "base"

    def __init__(self, timeout: int = 15, delay: float = 1.2, cookie: str = ""):
        self.timeout = timeout
        self.delay = delay
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": DEFAULT_UA,
            "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
        })
        if cookie:
            self.session.headers["Cookie"] = cookie

    # ── 하위 클래스가 구현 ──────────────────────────────────────
    def fetch_list(self, target: dict) -> list[RawPost]:
        raise NotImplementedError

    def fetch_detail(self, post: RawPost) -> PostDetail:
        raise NotImplementedError

    # ── 공용 헬퍼 ───────────────────────────────────────────────
    def _get(self, url: str, **kwargs) -> requests.Response:
        time.sleep(self.delay)  # 매너 딜레이(차단 방지)
        resp = self.session.get(url, timeout=self.timeout, **kwargs)
        resp.raise_for_status()
        return resp
