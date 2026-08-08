from __future__ import annotations

from urllib.parse import urlsplit


def normalized_path(value: str | None) -> str:
    path = str(value or "").strip()
    if not path or path == "/":
        return ""
    if not path.startswith("/"):
        path = f"/{path}"
    return path.rstrip("/")


def matching_source_config(url: str, domain: str, configs: list[dict]) -> dict | None:
    """가장 구체적인 계정 경로 규칙을 찾고, 없으면 도메인 전체 규칙을 반환한다."""
    try:
        path = normalized_path(urlsplit(url).path)
    except ValueError:
        return None
    normalized_domain = domain.lower().removeprefix("www.")
    matches: list[dict] = []
    for config in configs:
        config_domain = str(config.get("domain") or "").lower().removeprefix("www.")
        if config_domain != normalized_domain:
            continue
        prefix = normalized_path(config.get("pathPrefix"))
        if not prefix or path == prefix or path.startswith(f"{prefix}/"):
            matches.append(config)
    return max(matches, key=lambda item: len(normalized_path(item.get("pathPrefix"))), default=None)


def is_blocked_source(url: str, domain: str, blocked_scopes: list[dict]) -> bool:
    """관리자가 차단한 출처인지 판정한다.

    차단 범위는 등록 출처와 같은 (도메인, 경로 접두사) 규칙이다 — 접두사가 비어 있으면
    도메인 전체, 값이 있으면 그 경로와 하위 경로만 차단한다. 차단된 도메인이 원고 근거로
    인용되면 백엔드가 다시 출처 행을 만들지는 않지만 무관한 내용이 글에 남으므로,
    검색 결과 단계에서 아예 제외한다.
    """
    return matching_source_config(url, domain, blocked_scopes) is not None
