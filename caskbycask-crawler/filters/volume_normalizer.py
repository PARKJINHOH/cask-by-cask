"""병 1개의 표기 용량을 ml 정수로 정규화한다."""
from __future__ import annotations

import math
import re

MIN_VOLUME_ML = 1
MAX_VOLUME_ML = 100_000

_RANGE_RE = re.compile(
    r"\d+(?:[.,]\d+)?\s*(?:~|〜|–|—|-)\s*\d+(?:[.,]\d+)?\s*"
    r"(?:m\s*l|㎖|밀리리터|밀리|미리|c\s*l|c\s*c|㏄|l|ℓ|리터)(?![a-z가-힣])",
    re.IGNORECASE,
)
_ML_RE = re.compile(
    r"(?<![\d.])(\d{1,6}(?:,\d{3})*)\s*(?:m\s*l|㎖|밀리리터|밀리|미리|c\s*c|㏄)(?![a-z])",
    re.IGNORECASE,
)
_CL_RE = re.compile(
    r"(?<![\d.])(\d{1,5}(?:[.,]\d+)?)\s*c\s*l(?![a-z])",
    re.IGNORECASE,
)
_L_RE = re.compile(
    r"(?<![\d.])(\d{1,4}(?:[.,]\d+)?)\s*(?:l|ℓ|리터)(?![a-z])",
    re.IGNORECASE,
)
_PLAIN_NUMBER_RE = re.compile(r"^\d{1,6}(?:,\d{3})*$")
_PLAIN_DECIMAL_RE = re.compile(r"^\d{1,6}\.0+$")


def normalize_volume_ml(value: object) -> int | None:
    """AI 구조화 값이나 문자열을 ml로 변환한다. 모호하거나 범위를 벗어나면 None."""
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        if not math.isfinite(float(value)) or not float(value).is_integer():
            return None
        return _bounded(int(value))

    text = str(value).strip()
    if not text:
        return None
    if _PLAIN_NUMBER_RE.fullmatch(text):
        return _bounded(int(text.replace(",", "")))
    if _PLAIN_DECIMAL_RE.fullmatch(text):
        return _bounded(int(float(text)))
    return extract_volume_ml(text)


def extract_volume_ml(text: str | None) -> int | None:
    """본문에서 유일하게 식별되는 병 용량만 반환한다.

    서로 다른 용량이 함께 있거나 500~700ml 같은 범위 표기면 관리자 확인 대상으로 남긴다.
    `700ml x 2`는 병 1개 용량인 700ml로 해석한다.
    """
    source = (text or "").strip()
    if not source or _RANGE_RE.search(source):
        return None

    candidates: set[int] = set()
    for match in _ML_RE.finditer(source):
        _add_candidate(candidates, float(match.group(1).replace(",", "")))
    for match in _CL_RE.finditer(source):
        raw = float(match.group(1).replace(",", "."))
        _add_candidate(candidates, raw * 10)
    for match in _L_RE.finditer(source):
        raw = float(match.group(1).replace(",", "."))
        _add_candidate(candidates, raw * 1000)

    return next(iter(candidates)) if len(candidates) == 1 else None


def _add_candidate(candidates: set[int], value: float) -> None:
    rounded = round(value)
    if not math.isclose(value, rounded, abs_tol=1e-6):
        return
    normalized = _bounded(int(rounded))
    if normalized is not None:
        candidates.add(normalized)


def _bounded(value: int) -> int | None:
    return value if MIN_VOLUME_ML <= value <= MAX_VOLUME_ML else None
