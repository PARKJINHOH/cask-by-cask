"""핫딜 단위 중복 판정 유틸리티.

게시글 key/URL 중복은 SeenPostStore 가 막고, 이 모듈은 서로 다른 게시글이 같은
주류 할인 소식인지 추정한다. AI 호출을 아끼기 위해 제목 기반 로컬 판정을 먼저
수행하고, AI 분석 후에는 모델이 뽑은 정규화 정보를 함께 사용한다.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Iterable

from models import AnalysisResult


_NOISE_TOKENS = {
    "구매", "구입", "구매글", "구매했습니다", "구입했습니다", "샀습니다", "샀어요",
    "할인", "특가", "특파원", "영입", "영입완료", "완료", "입고", "행사", "세일",
    "핫딜", "후기", "정보", "공유", "발견", "득템", "병", "잔여", "수량",
}

_BRANCH_TOKENS = {
    "명지", "비산", "구월", "위례", "월계", "송림", "연산", "킨텍스", "하남",
    "수원", "안산", "천안", "양산", "군포", "부천", "동탄", "서면",
}

_PRODUCT_TOKENS = {"신테이스"}

_SELLER_ALIASES = {
    "트더": "트레이더스",
    "이마트트레이더스": "트레이더스",
    "트레이더스": "트레이더스",
    "코스트코": "코스트코",
    "코코": "코스트코",
    "롯데마트": "롯데마트",
    "홈플러스": "홈플러스",
    "이마트": "이마트",
}

_TEXT_ALIASES = [
    (re.compile(r"글렌\s*알라키", re.IGNORECASE), "글렌알라키"),
    (re.compile(r"glen\s*allachie", re.IGNORECASE), "글렌알라키"),
    (re.compile(r"\bthe\s*gle?n?allachie\b", re.IGNORECASE), "글렌알라키"),
    (re.compile(r"이마트\s*트레이더스", re.IGNORECASE), "트레이더스"),
]


@dataclass(frozen=True)
class DealSignature:
    """중복 비교에 필요한 정규화 결과."""

    normalized_text: str
    token_key: str
    seller_chain: str = ""
    ai_fingerprint: str = ""

    @property
    def tokens(self) -> set[str]:
        return set(self.token_key.split()) if self.token_key else set()


@dataclass(frozen=True)
class DuplicateMatch:
    post_key: str
    title: str
    status: str
    score: float
    reason: str


class DealDeduplicator:
    def __init__(self, jaccard_threshold: float = 0.58, ngram_threshold: float = 0.62):
        self.jaccard_threshold = jaccard_threshold
        self.ngram_threshold = ngram_threshold

    def build_title_signature(self, title: str) -> DealSignature:
        tokens = _tokenize(title)
        return DealSignature(
            normalized_text=" ".join(tokens),
            token_key=" ".join(sorted(tokens)),
            seller_chain=_extract_seller_chain(title),
        )

    def build_analysis_signature(self, title: str, analysis: AnalysisResult) -> DealSignature:
        raw = analysis.raw or {}
        parts = [
            title,
            analysis.drink_name or "",
            analysis.seller or "",
            str(raw.get("canonical_brand") or ""),
            str(raw.get("canonical_product") or ""),
            str(raw.get("product_variant") or ""),
            f"용량{analysis.volume_ml}ml" if analysis.volume_ml else "",
            str(raw.get("seller_chain") or ""),
        ]
        tokens = _tokenize(" ".join(parts))
        seller_chain = _extract_seller_chain(" ".join([
            analysis.seller or "",
            str(raw.get("seller_chain") or ""),
            title,
        ]))
        core_tokens = _core_tokens(tokens)
        ai_fingerprint = "|".join(sorted(core_tokens))
        if seller_chain:
            ai_fingerprint = f"{ai_fingerprint}|seller:{seller_chain}" if ai_fingerprint else f"seller:{seller_chain}"
        return DealSignature(
            normalized_text=" ".join(tokens),
            token_key=" ".join(sorted(tokens)),
            seller_chain=seller_chain,
            ai_fingerprint=ai_fingerprint,
        )

    def find_duplicate(
        self,
        signature: DealSignature,
        candidates: Iterable[dict],
        source_post_key: str,
    ) -> DuplicateMatch | None:
        best: DuplicateMatch | None = None
        for row in candidates:
            row_key = str(row["post_key"])
            if row_key == source_post_key:
                continue

            row_ai = str(row["ai_fingerprint"] or "")
            if signature.ai_fingerprint and row_ai == signature.ai_fingerprint:
                return DuplicateMatch(row_key, str(row["title"] or ""), str(row["status"]), 1.0, "ai_fingerprint")

            row_sig = DealSignature(
                normalized_text=str(row["normalized_title"] or ""),
                token_key=str(row["token_key"] or ""),
                seller_chain=str(row["seller_chain"] or ""),
                ai_fingerprint=row_ai,
            )
            if _has_variant_conflict(signature.tokens, row_sig.tokens):
                continue
            if _has_seller_conflict(signature.seller_chain, row_sig.seller_chain):
                continue

            token_score = _jaccard(signature.tokens, row_sig.tokens)
            ngram_score = _ngram_jaccard(signature.normalized_text, row_sig.normalized_text)
            score = max(token_score, ngram_score)
            reason = "jaccard" if token_score >= ngram_score else "ngram"

            if _is_core_subset_match(signature.tokens, row_sig.tokens):
                score = max(score, 0.9)
                reason = "core_subset"

            if score < self.jaccard_threshold and ngram_score < self.ngram_threshold:
                continue

            match = DuplicateMatch(row_key, str(row["title"] or ""), str(row["status"]), score, reason)
            if best is None or match.score > best.score:
                best = match

        return best


def _normalize_text(text: str) -> str:
    normalized = (text or "").lower()
    for pattern, replacement in _TEXT_ALIASES:
        normalized = pattern.sub(replacement, normalized)
    normalized = re.sub(r"[^0-9a-z가-힣]+", " ", normalized)
    return re.sub(r"\s+", " ", normalized).strip()


def _tokenize(text: str) -> set[str]:
    normalized = _normalize_text(text)
    raw_tokens = re.findall(r"[0-9a-z가-힣]+", normalized)
    tokens: set[str] = set()
    joined = " ".join(raw_tokens)
    has_allachie_context = "알라키" in joined or "글렌알라키" in joined or "신테이스" in joined

    for raw in raw_tokens:
        token = _SELLER_ALIASES.get(raw, raw)
        token = _strip_branch_suffix(token)
        if not token or token in _NOISE_TOKENS or token in _BRANCH_TOKENS:
            continue
        if re.fullmatch(r"\d+병", token):
            continue

        if "알라키" in token:
            tokens.add("글렌알라키")
        if "신테이스" in token:
            tokens.add("신테이스")
            for batch in re.findall(r"신테이스\s*(\d+)", token):
                tokens.add(f"배치{int(batch)}")
        for batch in re.findall(r"배치\s*(\d+)", token):
            tokens.add(f"배치{int(batch)}")
        for age in re.findall(r"(\d+)\s*년", token):
            tokens.add(f"{int(age)}년")
        if re.fullmatch(r"\d", token) and has_allachie_context:
            tokens.add(f"배치{int(token)}")

        if token in _SELLER_ALIASES.values():
            tokens.add(token)
            continue
        if len(token) >= 2 and not token.isdigit():
            tokens.add(token)

    return tokens


def _strip_branch_suffix(token: str) -> str:
    if token.endswith("점") and len(token) > 2:
        return token[:-1]
    return token


def _extract_seller_chain(text: str) -> str:
    normalized = _normalize_text(text)
    compact = normalized.replace(" ", "")
    for alias, canonical in _SELLER_ALIASES.items():
        if alias in compact:
            return canonical
    return ""


def _core_tokens(tokens: set[str]) -> set[str]:
    return {
        t for t in tokens
        if t not in _SELLER_ALIASES.values() and t not in _BRANCH_TOKENS and t not in _NOISE_TOKENS
    }


def _variant_tokens(tokens: set[str]) -> set[str]:
    return {
        t for t in tokens
        if re.fullmatch(r"배치\d+", t)
        or re.fullmatch(r"\d+년", t)
        or re.fullmatch(r"용량\d+ml", t)
    }


def _has_variant_conflict(left: set[str], right: set[str]) -> bool:
    left_variants = _variant_tokens(left)
    right_variants = _variant_tokens(right)
    return bool(left_variants and right_variants and left_variants.isdisjoint(right_variants))


def _has_seller_conflict(left: str, right: str) -> bool:
    return bool(left and right and left != right)


def _is_core_subset_match(left: set[str], right: set[str]) -> bool:
    left_core = _core_tokens(left)
    right_core = _core_tokens(right)
    if not left_core or not right_core:
        return False
    smaller, larger = (left_core, right_core) if len(left_core) <= len(right_core) else (right_core, left_core)
    if len(smaller) == 1 and not (smaller & _PRODUCT_TOKENS) and not (_variant_tokens(left_core) & _variant_tokens(right_core)):
        return False
    return smaller.issubset(larger)


def _jaccard(left: set[str], right: set[str]) -> float:
    if not left or not right:
        return 0.0
    return len(left & right) / len(left | right)


def _ngrams(text: str, n: int = 2) -> set[str]:
    compact = text.replace(" ", "")
    if len(compact) < n:
        return {compact} if compact else set()
    return {compact[i:i + n] for i in range(len(compact) - n + 1)}


def _ngram_jaccard(left: str, right: str) -> float:
    return _jaccard(_ngrams(left), _ngrams(right))
