from __future__ import annotations

import time
from urllib.parse import urlsplit

import requests
from bs4 import BeautifulSoup

from news_models import SearchSource
from news_source_config import matching_source_config, normalized_path
from safe_http import get_public_response, new_public_session, read_limited_body


#: 직접 요청으로는 공개 콘텐츠를 읽을 수 없어 검색으로만 확인하는 플랫폼.
SEARCH_ONLY_DOMAINS = {"instagram.com"}
DIRECT_REQUEST_ATTEMPTS = 2

#: 실행마다 한 주종에 집중해서 검색한다. 위스키·와인·꼬냑을 한 쿼리에 몰아넣으면
#: Tavily 검색어 상한(399자) 안에서 세 주종이 서로 밀어내 어느 쪽도 제대로 걸리지 않는다.
CATEGORY_QUERIES = {
    "WHISKY": "whisky whiskey bourbon single malt new release launch bottling 위스키 신제품 출시 국내 수입",
    "WINE": "wine vintage release new cuvee launch 와인 신제품 출시 빈티지 국내 수입",
    "COGNAC": "cognac XO VSOP new release launch 꼬냑 신제품 출시 국내 수입",
}
ROTATION_SLOTS = 10


def rotation_category(run_index: int, ratios: dict[str, int] | None = None) -> str:
    """이번 실행에서 집중할 주종을 고른다.

    관리자 설정의 주종 비율(기본 60/20/20)을 ROTATION_SLOTS 회 주기의 슬롯 수로 바꿔 순환한다 —
    60/20/20 이면 10회 중 위스키 6·와인 2·꼬냑 2 이다. 실행 순번만 있으면 정해지므로
    따로 상태를 저장하지 않는다.
    """
    weights = {key: max(0, int((ratios or {}).get(key, default)))
               for key, default in (("WHISKY", 60), ("WINE", 20), ("COGNAC", 20))}
    total = sum(weights.values())
    if total <= 0:
        return "WHISKY"
    schedule: list[str] = []
    for category, weight in weights.items():
        schedule.extend([category] * round(ROTATION_SLOTS * weight / total))
    if not schedule:
        return max(weights, key=weights.get)
    return schedule[run_index % len(schedule)]


def _get_public_url(
    url: str,
    timeout: int,
    *,
    allowed_hosts: set[str] | None = None,
) -> tuple[str, str, str]:
    session = new_public_session()
    try:
        for attempt in range(DIRECT_REQUEST_ATTEMPTS):
            try:
                response, final_url = get_public_response(
                    session,
                    url,
                    timeout=timeout,
                    allowed_hosts=allowed_hosts,
                    headers={"User-Agent": "CaskByCaskBot/1.0 (+official-source-check)"},
                )
                break
            except requests.RequestException:
                if attempt + 1 >= DIRECT_REQUEST_ATTEMPTS:
                    raise
                time.sleep(attempt + 1)
        else:  # pragma: no cover - 재시도 반복문의 방어 코드
            raise RuntimeError("공개 URL 응답을 받지 못했습니다.")

        try:
            content_type = str(response.headers.get("Content-Type") or "").lower()
            encoding = response.encoding or "utf-8"
            body = read_limited_body(response, 2 * 1024 * 1024)
            text = body.decode(encoding, errors="replace")
            return final_url, content_type, text
        finally:
            response.close()
    finally:
        session.close()


def _direct_source(config: dict, timeout: int) -> SearchSource:
    url = str(config.get("sourceUrl") or "").strip()
    configured_domain = str(config.get("domain") or "").lower().removeprefix("www.")
    final_url, content_type, body = _get_public_url(
        url,
        timeout,
        allowed_hosts={configured_domain},
    )
    final_domain = (urlsplit(final_url).hostname or "").lower().removeprefix("www.")
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
                               allow_tavily: bool = True, category: str = "WHISKY") -> list[SearchSource]:
    """등록 출처(허용목록)에서만 출시 소식 근거를 모은다.

    예전에는 이 함수 밖에서 도메인 무제한 일반 검색을 함께 돌렸는데, 거기서 물어온 도메인이
    출처 목록에 자동 등록되면서 주류와 무관한 URL 이 끝없이 쌓였다. 지금은 이 함수가 유일한
    발견 경로다 — 관리자가 등록하지 않은 도메인은 애초에 검색 대상이 아니다.

    수집 대상 판단은 ``enabled`` 하나뿐이다. 예전에는 출처 등급까지 봤는데, 스위치가 둘이라
    '수집 활성'을 켜 둔 출처가 등급 때문에 조용히 빠지는 일이 생겼다.
    """
    configs = [item for item in config.get("sources", [])
               if item.get("enabled") and item.get("sourceUrl")]
    if not configs:
        return []

    collected: list[SearchSource] = []
    #: 이번 실행에서 근거를 실제로 가져온 출처. 여기 없으면 성공이 아니다.
    fetched: set[int] = set()
    #: 출처별 직접 확인 실패 사유.
    errors: dict[int, str] = {}
    #: 제한 검색 자체가 실패한 사유(전체 공통).
    search_error: str | None = None

    for item in configs:
        source_id = int(item["id"])
        domain = str(item.get("domain") or "").lower().removeprefix("www.")
        if domain in SEARCH_ONLY_DOMAINS:
            log.info("직접 수집 제한 플랫폼은 Tavily 검색으로 확인 source=%s domain=%s",
                     item.get("sourceName"), domain)
            continue
        try:
            collected.append(_direct_source(item, timeout))
            fetched.add(source_id)
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
                f"{CATEGORY_QUERIES.get(category, CATEGORY_QUERIES['WHISKY'])} {source_hints}",
                topic="news",
                time_range="week",
                include_domains=domains,
            )
            for source in targeted:
                matched = _targeted_match(source, configs)
                if not matched:
                    continue
                collected.append(source)
                fetched.add(int(matched["id"]))
        except Exception as error:  # noqa: BLE001
            search_error = f"Tavily 제한 검색 실패: {error}"[:1000]
            log.warning("등록 공식 출처 Tavily 제한 검색 실패: %s", error)

    _report_crawl_results(configs, fetched, errors, search_error, api, log)
    return collected


def _report_crawl_results(configs: list[dict], fetched: set[int], errors: dict[int, str],
                          search_error: str | None, api, log) -> None:
    """출처별 수집 결과를 관리자 화면이 읽을 수 있게 서버에 남긴다.

    예전에는 제한 검색이 정상 완료되기만 하면 모든 출처를 SUCCESS 로 덮어썼다. 그래서 직접 확인이
    깨진 출처도 화면에는 늘 '수집 성공'이었고, 검색으로만 확인하는 인스타그램 출처는 결과가 없어도
    성공으로 찍혔다 — 관리자가 고칠 수 있는 문제를 아무도 볼 수 없었다.

    지금은 셋으로 나눈다.
      SUCCESS   : 이번 실행에서 이 출처에서 근거를 실제로 가져왔다.
      NO_RESULT : 확인은 정상이었지만 이번 실행에 새 소식이 없었다. 실패가 아니다.
      ERROR     : 확인 자체가 실패했다. 사유를 함께 남긴다.
    """
    for item in configs:
        source_id = int(item["id"])
        if source_id in fetched:
            status, reason = "SUCCESS", None
        elif errors.get(source_id):
            status, reason = "ERROR", errors[source_id]
        elif search_error:
            status, reason = "ERROR", search_error
        else:
            status, reason = "NO_RESULT", None
        try:
            api.record_source_crawl_result(source_id, status, reason)
        except Exception as error:  # noqa: BLE001
            log.warning("공식 출처 수집 상태 보고 실패 source=%s: %s", item.get("sourceName"), error)
