"""1차 제목 키워드 필터.

본문/이미지 다운로드와 AI 분석은 비용이 크므로, 먼저 제목만 보고 후보를 추린다.
- deal_keywords 중 하나라도 포함되면 통과
- exclude_keywords 가 포함되면 (매수 문의 등) 탈락
실제 '주류 핫딜인지'의 정밀 판단은 다음 단계인 OpenAI 분석이 맡는다.
"""
from __future__ import annotations


class KeywordFilter:
    def __init__(self, deal_keywords: list[str], exclude_keywords: list[str]):
        self.deal = [k.lower() for k in deal_keywords]
        self.exclude = [k.lower() for k in exclude_keywords]

    def passes(self, title: str) -> tuple[bool, str]:
        """(통과여부, 사유)."""
        t = (title or "").lower()

        for ex in self.exclude:
            if ex and ex in t:
                return False, f"제외키워드 '{ex}'"

        for kw in self.deal:
            if kw and kw in t:
                return True, f"할인키워드 '{kw}'"

        return False, "할인키워드 없음"
