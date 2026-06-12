"""스테이지 간에 주고받는 타입드 데이터 계약(dataclass).

dict 를 그대로 흘려보내면 필드 오타·누락을 잡기 어렵다.
스크래퍼 → 필터 → 분석 → 업로더 사이의 데이터는 모두 이 모델을 통해 전달한다.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class RawPost:
    """목록 단계에서 수집한 게시글 메타. (본문 미수집)"""
    site: str            # 'dcinside' | 'naver_cafe'
    board_id: str        # dcinside gallery id / naver club_id
    board_name: str
    post_id: str
    title: str
    url: str
    posted_at: Optional[str] = None   # ISO8601 (알 수 있을 때만)

    @property
    def key(self) -> str:
        """중복 판별용 전역 유니크 키."""
        return f"{self.site}:{self.board_id}:{self.post_id}"


@dataclass
class PostDetail:
    """본문 단계에서 채운 상세."""
    raw: RawPost
    content_text: str
    image_urls: list[str] = field(default_factory=list)


@dataclass
class AnalysisResult:
    """OpenAI 분석 결과(정규화)."""
    is_hotdeal: bool
    is_alcohol: bool
    confidence: float                 # 0.0 ~ 1.0
    category: str                     # WHISKY | WINE | COGNAC | OTHER | UNKNOWN
    product_name: Optional[str]
    price: Optional[int]              # KRW
    original_price: Optional[int]
    discount_rate: Optional[int]      # %
    vendor: Optional[str]             # 판매처(마트/온라인몰 등) — 면세/쇼핑몰 자동수집은 아님
    deal_score: Optional[int]         # 0~100, AI가 본 '핫딜 매력도'
    summary: str                      # 한 줄 요약
    reason: str                       # 핫딜/비핫딜 판단 근거
    raw: dict = field(default_factory=dict)   # 모델 원응답(디버그용)

    @classmethod
    def from_model_json(cls, data: dict) -> "AnalysisResult":
        """모델이 돌려준 JSON을 안전하게 정규화."""
        def _int(v):
            try:
                if v is None or v == "":
                    return None
                return int(round(float(str(v).replace(",", "").replace("원", "").strip())))
            except (TypeError, ValueError):
                return None

        return cls(
            is_hotdeal=bool(data.get("is_hotdeal", False)),
            is_alcohol=bool(data.get("is_alcohol", False)),
            confidence=max(0.0, min(1.0, float(data.get("confidence", 0) or 0))),
            category=str(data.get("category", "UNKNOWN") or "UNKNOWN").upper(),
            product_name=(data.get("product_name") or None),
            price=_int(data.get("price")),
            original_price=_int(data.get("original_price")),
            discount_rate=_int(data.get("discount_rate")),
            vendor=(data.get("vendor") or None),
            deal_score=_int(data.get("deal_score")),
            summary=str(data.get("summary", "") or ""),
            reason=str(data.get("reason", "") or ""),
            raw=data,
        )
