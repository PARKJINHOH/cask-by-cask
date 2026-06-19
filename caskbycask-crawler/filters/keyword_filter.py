"""1차 제목 키워드 필터.

본문/이미지 다운로드와 AI 분석은 비용이 크므로, 먼저 제목(+있으면 본문)만 보고 후보를 추린다.
- 통과 조건: 할인 키워드 1개 이상 포함 (가격 여부는 AI 가 판단 — 가격이 이미지에만 있는
  커뮤니티 글도 통과시키기 위함)
- exclude_keywords(매수 문의 등) 포함 시 탈락
가격 패턴 감지(has_price)는 게이트가 아니라 로깅/진단용 보조 신호로만 쓴다.
"""
from __future__ import annotations

import re

# Step 5 기본 키워드 (config.DEAL_KEYWORDS 로 덮어쓸 수 있음)
DEFAULT_KEYWORDS = [
    "할인", "특가", "핫딜", "세일", "이벤트", "%", "한정", "최저가",
    "구매", "구입", "영입", "특파원", "입고",
    "sale", "deal", "discount", "limited",
]

# 가격 패턴 — 원화 / 달러 (보조 신호)
_PRICE_PATTERNS = [
    re.compile(r"\d{1,3}(?:,\d{3})*\s*원"),
    re.compile(r"\$\s*\d+"),
]


class KeywordFilter:
    def __init__(self, keywords: list[str] | None = None, exclude_keywords: list[str] | None = None):
        self.keywords = [k.lower() for k in (keywords or DEFAULT_KEYWORDS)]
        self.exclude = [k.lower() for k in (exclude_keywords or [])]

    @staticmethod
    def _text(post: dict) -> str:
        return f"{post.get('title', '')} {post.get('content', '')}".lower()

    def matched_keyword(self, text: str) -> str | None:
        return next((k for k in self.keywords if k and k in text), None)

    def has_price(self, text: str) -> bool:
        return any(p.search(text) for p in _PRICE_PATTERNS)

    def passes(self, post: dict) -> bool:
        """제목+본문 합친 텍스트에 할인 키워드가 있으면 통과(제외 키워드는 우선 탈락)."""
        text = self._text(post)
        for ex in self.exclude:
            if ex and ex in text:
                return False
        return self.matched_keyword(text) is not None
