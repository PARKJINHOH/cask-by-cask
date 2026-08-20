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
