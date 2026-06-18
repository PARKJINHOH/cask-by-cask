"""스크래퍼 공통 베이스.

신규 사이트는 BaseScraper 를 상속해 fetch_list / fetch_detail 두 메서드만 구현하면
main 오케스트레이터가 동일하게 다룬다.

※ 2단계(목록→상세) 구조를 의도적으로 유지한다: 제목 키워드/중복 판정을 먼저 통과한
   글만 상세를 받으므로, 대상 사이트에 보내는 요청 수가 크게 줄어 차단 위험이 낮다.
   (Step 6 의 단일 fetch_posts 보다 운영상 안전)
"""
from __future__ import annotations

import random
import time

import requests

from logger import get_logger
from models import PostDetail, RawPost

log = get_logger("scraper")

# 본문/이미지 공통 상한
MAX_CONTENT_CHARS = 2000
MAX_IMAGES = 5

# User-Agent 로테이션 풀 (요청마다 무작위 선택 → 봇 패턴 완화)
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
]


class BaseScraper:
    site = "base"

    def __init__(self, timeout: int = 10, delay: float = 1.0, cookie: str = "", notifier=None):
        self.timeout = timeout
        self.delay_min = max(0.0, delay)
        self.delay_max = self.delay_min + 2.0   # Step 6: 약 1~3초 무작위 간격
        self.notifier = notifier
        self.session = requests.Session()
        self.session.headers.update({"Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8"})
        if cookie:
            self.session.headers["Cookie"] = cookie

    # ── 하위 클래스가 구현 ──────────────────────────────────────
    def fetch_list(self, target: dict) -> list[RawPost]:
        raise NotImplementedError

    def fetch_detail(self, post: RawPost) -> PostDetail:
        raise NotImplementedError

    def _handle_request_error(self, url: str, error: requests.RequestException) -> None:
        return None

    # ── 공용 헬퍼 ───────────────────────────────────────────────
    def _get(self, url: str, **kwargs):
        """GET 요청. 매너 딜레이 + UA 로테이션. 실패 시 None 반환(+로그)."""
        time.sleep(random.uniform(self.delay_min, self.delay_max))
        self.session.headers["User-Agent"] = random.choice(USER_AGENTS)
        try:
            resp = self.session.get(url, timeout=self.timeout, **kwargs)
            resp.raise_for_status()
            return resp
        except requests.RequestException as e:
            log.warning("[%s] 요청 실패 %s: %s", self.site, url, e)
            self._handle_request_error(url, e)
            return None
