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


_CATEGORIES = {"WHISKY", "COGNAC", "WINE", "TEQUILA", "RUM", "BEER", "SOJU", "OTHER"}
_CURRENCIES = {"KRW", "USD", "EUR"}


@dataclass
class AnalysisResult:
    """OpenAI 분석 결과(정규화). 필드는 백엔드 /api/internal/deals 계약과 1:1 대응."""
    is_deal: bool
    drink_name: Optional[str]
    drink_category: str               # WHISKY|COGNAC|WINE|TEQUILA|RUM|BEER|SOJU|OTHER
    original_price: Optional[int]
    deal_price: Optional[int]
    discount_rate: Optional[float]    # 0.0 ~ 1.0
    currency: str                     # KRW|USD|EUR
    seller: Optional[str]             # 판매처명
    deal_condition: Optional[str]     # 조건 설명
    expiry_info: Optional[str]        # 기간 정보
    confidence_score: int             # 1 ~ 10
    summary_ko: str                   # 한국어 요약 1~2줄
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

        def _float(v):
            try:
                if v is None or v == "":
                    return None
                f = float(v)
                return max(0.0, min(1.0, f))   # 0.0~1.0 클램프
            except (TypeError, ValueError):
                return None

        category = str(data.get("drink_category", "OTHER") or "OTHER").upper()
        if category not in _CATEGORIES:
            category = "OTHER"
        currency = str(data.get("currency", "KRW") or "KRW").upper()
        if currency not in _CURRENCIES:
            currency = "KRW"
        try:
            score = int(round(float(data.get("confidence_score", 0) or 0)))
        except (TypeError, ValueError):
            score = 0
        score = max(0, min(10, score))

        return cls(
            is_deal=bool(data.get("is_deal", False)),
            drink_name=(data.get("drink_name") or None),
            drink_category=category,
            original_price=_int(data.get("original_price")),
            deal_price=_int(data.get("deal_price")),
            discount_rate=_float(data.get("discount_rate")),
            currency=currency,
            seller=(data.get("seller") or None),
            deal_condition=(data.get("deal_condition") or None),
            expiry_info=(data.get("expiry_info") or None),
            confidence_score=score,
            summary_ko=str(data.get("summary_ko", "") or ""),
            raw=data,
        )
