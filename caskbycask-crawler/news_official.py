from __future__ import annotations

import ipaddress
import socket
import time
from urllib.parse import urljoin, urlsplit

import requests
from bs4 import BeautifulSoup

from news_models import SearchSource
from news_source_config import matching_source_config, normalized_path


ELIGIBLE_TYPES = {"OFFICIAL", "TRUSTED_MEDIA"}
SEARCH_ONLY_DOMAINS = {"instagram.com"}
DIRECT_REQUEST_ATTEMPTS = 2


def _assert_public_url(url: str) -> None:
    parsed = urlsplit(url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("HTTP(S) 공개 URL만 수집할 수 있습니다.")
    if parsed.hostname.lower() == "localhost":
        raise ValueError("내부 주소는 수집할 수 없습니다.")
    for info in socket.getaddrinfo(parsed.hostname, parsed.port or 443, type=socket.SOCK_STREAM):
        address = ipaddress.ip_address(info[4][0])
        if not address.is_global:
            raise ValueError("내부 또는 비공개 네트워크 주소는 수집할 수 없습니다.")


def _get_public_url(url: str, timeout: int) -> tuple[str, str, str]:
    current = url
    for _ in range(4):
        _assert_public_url(current)
        response = None
        for attempt in range(DIRECT_REQUEST_ATTEMPTS):
            try:
                response = requests.get(
                    current,
                    timeout=(min(timeout, 10), timeout),
                    allow_redirects=False,
                    stream=True,
                    headers={"User-Agent": "CaskByCaskBot/1.0 (+official-source-check)"},
                )
                break
            except requests.RequestException:
                if attempt + 1 >= DIRECT_REQUEST_ATTEMPTS:
                    raise
                time.sleep(attempt + 1)
        if response is None:  # pragma: no cover - 위 반복문의 방어 코드
            raise RuntimeError("공개 URL 응답을 받지 못했습니다.")
        if response.status_code not in {301, 302, 303, 307, 308}:
            response.raise_for_status()
            content_type = str(response.headers.get("Content-Type") or "").lower()
            chunks: list[bytes] = []
            size = 0
            for chunk in response.iter_content(64 * 1024):
                if not chunk:
                    continue
                size += len(chunk)
                if size > 2 * 1024 * 1024:
                    response.close()
                    raise ValueError("응답 본문이 2MB 제한을 초과했습니다.")
                chunks.append(chunk)
            encoding = response.encoding or "utf-8"
            text = b"".join(chunks).decode(encoding, errors="replace")
            final_url = response.url or current
            response.close()
            return final_url, content_type, text
        location = response.headers.get("Location")
        response.close()
        if not location:
            raise ValueError("리디렉션 응답에 이동할 URL이 없습니다.")
        current = urljoin(current, location)
    raise ValueError("리디렉션 횟수가 제한을 초과했습니다.")


def _direct_source(config: dict, timeout: int) -> SearchSource:
    url = str(config.get("sourceUrl") or "").strip()
    final_url, content_type, body = _get_public_url(url, timeout)
    final_domain = (urlsplit(final_url).hostname or "").lower().removeprefix("www.")
    configured_domain = str(config.get("domain") or "").lower().removeprefix("www.")
    if final_domain != configured_domain:
        raise ValueError(f"등록 도메인 밖으로 이동했습니다: {final_domain}")
    if "html" not in content_type and "xml" not in content_type and "text" not in content_type:
        raise ValueError(f"지원하지 않는 콘텐츠 형식입니다: {content_type or 'unknown'}")
    soup = BeautifulSoup(body, "html.parser")
    for node in soup(["script", "style", "noscript"]):
        node.decompose()
    title = soup.title.get_text(" ", strip=True) if soup.title else str(config.get("sourceName") or "공식 출처")
    content = soup.get_text("\n", strip=True)[:12000]
    if len(content) < 30:
        raise ValueError("수집 가능한 공개 텍스트가 없습니다.")
    return SearchSource(
        title=title[:500],
        url=final_url,
        domain=configured_domain,
        content=content,
        score=0.5,
        source_type=str(config.get("sourceType") or "UNAPPROVED"),
    )


def _targeted_match(source: SearchSource, configs: list[dict]) -> dict | None:
    matched = matching_source_config(source.url, source.domain, configs)
    if matched:
        return matched
    haystack = f"{source.url} {source.title} {source.content[:2000]}".lower()
    same_domain = [item for item in configs if str(item.get("domain") or "").lower() == source.domain]
    candidates = []
    for item in same_domain:
        path = normalized_path(item.get("pathPrefix"))
        handle = path.strip("/").split("/", 1)[0].lower() if path else ""
        if handle and handle in haystack:
            candidates.append(item)
    return max(candidates, key=lambda item: len(normalized_path(item.get("pathPrefix"))), default=None)


def collect_registered_sources(config: dict, search, api, log, timeout: int,
                               allow_tavily: bool = True) -> list[SearchSource]:
    configs = [item for item in config.get("sources", [])
               if item.get("enabled") and item.get("sourceType") in ELIGIBLE_TYPES
               and item.get("sourceUrl")]
    if not configs:
        return []

    collected: list[SearchSource] = []
    errors: dict[int, str] = {}
    successful: set[int] = set()
    for item in configs:
        source_id = int(item["id"])
        domain = str(item.get("domain") or "").lower().removeprefix("www.")
        if domain in SEARCH_ONLY_DOMAINS:
            log.info("직접 수집 제한 플랫폼은 Tavily 검색으로 확인 source=%s domain=%s",
                     item.get("sourceName"), domain)
            continue
        try:
            collected.append(_direct_source(item, timeout))
            successful.add(source_id)
        except Exception as error:  # noqa: BLE001
            errors[source_id] = str(error)[:1000]
            log.warning("공식 출처 직접 확인 실패 source=%s: %s", item.get("sourceName"), error)

    if allow_tavily:
        domains = list(dict.fromkeys(str(item.get("domain") or "") for item in configs if item.get("domain")))
        try:
            source_hints = " ".join(
                f'{str(item.get("sourceName") or "").strip()} '
                f'{normalized_path(item.get("pathPrefix")).strip("/")}'
                for item in configs
            )[:800]
            targeted = search.search(
                "latest official whisky wine cognac product release launch import 한국 출시 수입 신제품 "
                f"{source_hints}",
                topic="news",
                time_range="week",
                include_domains=domains,
            )
            for source in targeted:
                matched = _targeted_match(source, configs)
                if not matched:
                    continue
                source.source_type = str(matched.get("sourceType") or "UNAPPROVED")
                collected.append(source)
                successful.add(int(matched["id"]))
            # 제한 검색이 정상 완료되면 신규 결과가 없어도 출처 확인 작업 자체는 성공이다.
            successful.update(int(item["id"]) for item in configs)
        except Exception as error:  # noqa: BLE001
            log.warning("등록 공식 출처 Tavily 제한 검색 실패: %s", error)
            for item in configs:
                errors.setdefault(int(item["id"]), f"Tavily 제한 검색 실패: {error}"[:1000])

    for item in configs:
        source_id = int(item["id"])
        try:
            if source_id in successful:
                api.record_source_crawl_result(source_id, "SUCCESS")
            else:
                api.record_source_crawl_result(
                    source_id, "ERROR", errors.get(source_id) or "공개 콘텐츠를 수집하지 못했습니다."
                )
        except Exception as error:  # noqa: BLE001
            log.warning("공식 출처 수집 상태 보고 실패 source=%s: %s", item.get("sourceName"), error)
    return collected


def collect_reference_sources(urls: list[str], timeout: int) -> list[SearchSource]:
    collected: list[SearchSource] = []
    for url in urls[:3]:
        domain = (urlsplit(url).hostname or "").lower().removeprefix("www.")
        if not domain:
            raise ValueError(f"참고 URL의 도메인을 확인할 수 없습니다: {url}")
        collected.append(_direct_source({
            "sourceUrl": url,
            "sourceName": domain,
            "domain": domain,
            "sourceType": "UNAPPROVED",
        }, timeout))
    return collected
