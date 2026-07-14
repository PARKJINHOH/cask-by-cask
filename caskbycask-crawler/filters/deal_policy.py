"""Deterministic post-AI policy for crawler deal ingestion."""
from __future__ import annotations

import re
from dataclasses import dataclass, replace
from typing import Iterable

from models import AnalysisResult, PostDetail
from filters.volume_normalizer import extract_volume_ml, normalize_volume_ml

DEFAULT_ALLOWED_CATEGORIES = frozenset({"WHISKY", "COGNAC", "WINE", "TEQUILA", "RUM"})

_GENERIC_DRINK_NAMES = {"술", "주류", "위스키", "와인", "꼬냑", "코냑", "럼", "데킬라", "기타"}

_RETAILER_RE = re.compile(
    r"\b(?:gs25|cu)\b|편의점|마트|이마트|홈플러스|롯데마트|코스트코|백화점|면세점",
    re.IGNORECASE,
)
_EVENT_RE = re.compile(r"행사|세일|할인|이벤트|쿠폰|프로모션|특가|핫딜|sale|event|coupon|discount", re.IGNORECASE)
_ALCOHOL_HINT_RE = re.compile(
    r"위스키|싱글몰트|블렌디드|버번|스카치|와인|꼬냑|코냑|브랜디|럼|데킬라|"
    r"맥캘란|글렌|발베니|발렌타인|조니워커|라프로익|아드벡|블라드녹|"
    r"글렌피딕|글렌리벳|글렌모렌지|카발란|헤네시|레미마틴|야마자키|히비키|하쿠슈|"
    r"macallan|glen|balvenie|ballantine|johnnie|laphroaig|ardbeg|bladnoch|"
    r"glenfiddich|glenlivet|glenmorangie|kavalan|hennessy|yamazaki|hibiki|hakushu",
    re.IGNORECASE,
)

_COMPLEX_DISCOUNT_PATTERNS = [
    # 묶음 총액은 병 1개의 가격 추세에 넣을 수 없으므로 보수적으로 제외한다.
    re.compile(r"\d+(?:[.,]\d+)?\s*(?:ml|㎖|cl|l|ℓ)\s*(?:x|×|\*)\s*[2-9]\d*", re.IGNORECASE),
    re.compile(r"[2-9]\d*\s*(?:개|병|캔|박스)\s*(?:세트|묶음|팩)", re.IGNORECASE),
    re.compile(r"\d+\s*(?:개|병|캔|박스)\s*(?:구매|이상|사면|시)[^\n]{0,40}\d{1,2}\s*%", re.IGNORECASE),
    re.compile(r"(?:2|3|두|세)\s*(?:개|병|캔|박스)\s*(?:구매|이상|사면|시)[^\n]{0,40}\d{1,2}\s*%", re.IGNORECASE),
    re.compile(r"\d+\s*만원\s*이상[^\n]{0,40}\d{1,2}\s*%", re.IGNORECASE),
    re.compile(r"최대\s*\d[\d,]*\s*(?:원|만원)?\s*할인", re.IGNORECASE),
    re.compile(r"(?:카드|쿠폰|적립|페이백|캐시백|상품권|청구할인|온누리)[^\n]{0,40}(?:중복|동시|추가|최대|할인)", re.IGNORECASE),
    re.compile(r"(?:면세|jdc|신라면세|롯데면세)[^\n]{0,120}(?:\d+\s*만원\s*이상|최대\s*\d|쿠폰|카드|적립|중복|추가\s*할인)", re.IGNORECASE),
]

_PURCHASE_REPORT_RE = re.compile(r"구매하였|구매했|구입하였|구입했|샀습니다|사왔|인증|후기")
_OPEN_DEAL_RE = re.compile(r"행사|할인|특가|핫딜|세일|판매|픽업|구매\s*가능", re.IGNORECASE)


@dataclass(frozen=True)
class DealPolicyDecision:
    accepted: bool
    result: AnalysisResult
    reason: str | None = None


def normalize_analysis_result(analysis: AnalysisResult) -> AnalysisResult:
    original_price = _normalize_price(analysis.original_price)
    deal_price = _normalize_price(analysis.deal_price)
    return replace(
        analysis,
        volume_ml=normalize_volume_ml(analysis.volume_ml),
        original_price=original_price,
        deal_price=deal_price,
        discount_rate=_calculate_discount_rate(original_price, deal_price),
        currency=(analysis.currency or "KRW").upper(),
        expiry_info=None,
    )


def review_analysis(
    detail: PostDetail,
    analysis: AnalysisResult,
    allowed_categories: Iterable[str] | None = None,
) -> DealPolicyDecision:
    result = normalize_analysis_result(analysis)
    if result.volume_ml is None:
        # AI가 만든 요약/조건 문구가 아니라 실제 제목·본문에 명시된 값만 정규식 보완에 사용한다.
        source_text = " ".join(part for part in [detail.raw.title, detail.content_text] if part)
        result = replace(result, volume_ml=extract_volume_ml(source_text))
    text = _combined_text(detail, result)
    allowed = {c.upper() for c in (allowed_categories or DEFAULT_ALLOWED_CATEGORIES)}

    if not result.is_deal:
        return DealPolicyDecision(False, result, "model_not_deal")
    if result.drink_category not in allowed:
        return DealPolicyDecision(False, result, "unsupported_category")
    if not _has_specific_drink_name(result.drink_name):
        return DealPolicyDecision(False, result, "missing_drink_name")
    if _looks_like_complex_discount(text):
        return DealPolicyDecision(False, result, "complex_discount")
    if _looks_like_generic_retail_sale(text, result):
        return DealPolicyDecision(False, result, "generic_retail_sale")
    if _looks_like_purchase_report_only(text):
        return DealPolicyDecision(False, result, "purchase_report")
    if result.original_price <= 0 or result.deal_price <= 0:
        return DealPolicyDecision(False, result, "missing_price_pair")
    if result.original_price <= result.deal_price:
        return DealPolicyDecision(False, result, "not_discounted")

    return DealPolicyDecision(True, result)


def _normalize_price(value: int | None) -> int:
    try:
        parsed = int(value or 0)
    except (TypeError, ValueError):
        return 0
    return max(parsed, 0)


def _calculate_discount_rate(original_price: int, deal_price: int) -> float:
    if original_price <= 0 or deal_price <= 0 or original_price <= deal_price:
        return 0.0
    return round(max(0.0, min(1.0, (original_price - deal_price) / original_price)), 4)


def _combined_text(detail: PostDetail, result: AnalysisResult) -> str:
    return " ".join(
        part
        for part in [
            detail.raw.title,
            detail.content_text,
            result.drink_name or "",
            result.seller or "",
            result.deal_condition or "",
            result.summary_ko or "",
        ]
        if part
    )


def _has_specific_drink_name(name: str | None) -> bool:
    normalized = (name or "").strip().lower()
    return len(normalized) >= 2 and normalized not in _GENERIC_DRINK_NAMES


def _looks_like_complex_discount(text: str) -> bool:
    normalized = _collapse_space(text)
    return any(pattern.search(normalized) for pattern in _COMPLEX_DISCOUNT_PATTERNS)


def _looks_like_generic_retail_sale(text: str, result: AnalysisResult) -> bool:
    normalized = _collapse_space(text)
    if not (_RETAILER_RE.search(normalized) and _EVENT_RE.search(normalized)):
        return False
    return not _ALCOHOL_HINT_RE.search(normalized)


def _looks_like_purchase_report_only(text: str) -> bool:
    normalized = _collapse_space(text)
    return bool(_PURCHASE_REPORT_RE.search(normalized) and not _OPEN_DEAL_RE.search(normalized))


def _collapse_space(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()
