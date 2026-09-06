from __future__ import annotations

from news_articles import collect_source_articles
from news_models import SearchSource


#: 직접 요청으로는 공개 콘텐츠를 읽을 수 없는 플랫폼. 검색으로 우회하던 경로가 사라져
#: 지금은 확인할 방법이 없다 — 조용히 넘기지 않고 사유와 함께 실패로 남긴다.
DIRECT_FETCH_BLOCKED_DOMAINS = {"instagram.com"}
DIRECT_FETCH_BLOCKED_REASON = "직접 수집이 제한된 플랫폼이라 확인할 수 없습니다."

ROTATION_SLOTS = 10


def rotation_category(run_index: int, ratios: dict[str, int] | None = None) -> str:
    """이번 실행에서 우선할 주종을 고른다.

    관리자 설정의 주종 비율(기본 60/20/20)을 ROTATION_SLOTS 회 주기의 슬롯 수로 바꿔 순환한다 —
    60/20/20 이면 10회 중 위스키 6·와인 2·꼬냑 2 이다. 실행 순번만 있으면 정해지므로
    따로 상태를 저장하지 않는다. 하루 2회 수집이면 한 바퀴가 5일이다.

    수집 자체는 등록 출처를 전부 훑으므로 이 값이 무엇을 가져올지는 정하지 않는다.
    Gemini 가 소재를 고를 때 어느 주종을 먼저 볼지를 정할 뿐이다.
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


def collect_registered_sources(config: dict, api, log, timeout: int, *,
                               recent_days: int = 3, articles_per_source: int = 5,
                               max_articles: int = 20) -> list[SearchSource]:
    """등록 출처(허용목록)에서 **최근 기사**를 모은다.

    예전에는 이 함수 밖에서 도메인 무제한 일반 검색을 함께 돌렸는데, 거기서 물어온 도메인이
    출처 목록에 자동 등록되면서 주류와 무관한 URL 이 끝없이 쌓였다. 그다음에는 등록 도메인으로
    가둔 Tavily 제한 검색을 함께 돌렸지만, 쓸 만한 소재를 물어오지 않아 그마저 걷어냈다.
    지금은 등록 출처를 직접 읽는 것이 유일한 발견 경로다 — **도메인 무제한 검색을 다시 넣지 말 것.**

    한 번 더 중요한 변화가 있다. 예전에는 등록된 **목록 페이지 하나를 통째로** 근거로 삼았다.
    그래서 발행일을 알 수 없어 최신성 판단이 불가능했고, 근거 URL 이 매번 같아 서버 중복 판정에
    걸렸으며, 관리자가 원문을 열 수도 없었다. 지금은 목록에서 **기사 단위**로 내려간다
    (`news_articles.collect_source_articles`).

    수집 대상 판단은 ``enabled`` 하나뿐이다. 예전에는 출처 등급까지 봤는데, 스위치가 둘이라
    '수집 활성'을 켜 둔 출처가 등급 때문에 조용히 빠지는 일이 생겼다.
    """
    configs = [item for item in config.get("sources", [])
               if item.get("enabled") and item.get("sourceUrl")]
    if not configs:
        return []

    collected: list[SearchSource] = []
    #: 이번 실행에서 실제로 확인한 출처. 상한에 걸려 건너뛴 출처는 여기 없다 —
    #: 확인하지도 않고 '결과 없음'으로 덮으면 관리자가 보는 상태가 거짓이 된다.
    attempted: list[dict] = []
    #: 근거를 실제로 가져온 출처.
    fetched: set[int] = set()
    #: 출처별 실패 사유.
    errors: dict[int, str] = {}
    remaining = max(0, max_articles)

    for item in configs:
        source_id = int(item["id"])
        domain = str(item.get("domain") or "").lower().removeprefix("www.")
        if domain in DIRECT_FETCH_BLOCKED_DOMAINS:
            # 조용히 넘기면 화면에 '결과 없음'으로 찍혀, 확인할 방법이 없는 출처인 줄 아무도 모른다.
            attempted.append(item)
            errors[source_id] = DIRECT_FETCH_BLOCKED_REASON
            log.warning("직접 수집이 제한된 플랫폼이라 건너뜁니다 source=%s domain=%s",
                        item.get("sourceName"), domain)
            continue
        if remaining <= 0:
            log.info("실행당 기사 상한(%d)에 도달해 남은 출처는 다음 실행으로 미룹니다 source=%s",
                     max_articles, item.get("sourceName"))
            break

        attempted.append(item)
        try:
            articles = collect_source_articles(
                item, timeout, recent_days=recent_days,
                limit=min(articles_per_source, remaining), log=log,
            )
        except Exception as error:  # noqa: BLE001
            errors[source_id] = str(error)[:1000]
            log.warning("공식 출처 확인 실패 source=%s: %s", item.get("sourceName"), error)
            continue
        if articles:
            collected.extend(articles)
            fetched.add(source_id)
            remaining -= len(articles)

    _report_crawl_results(attempted, fetched, errors, api, log)
    return collected


def _report_crawl_results(configs: list[dict], fetched: set[int], errors: dict[int, str],
                          api, log) -> None:
    """출처별 수집 결과를 관리자 화면이 읽을 수 있게 서버에 남긴다.

    예전에는 제한 검색이 정상 완료되기만 하면 모든 출처를 SUCCESS 로 덮어썼다. 그래서 직접 확인이
    깨진 출처도 화면에는 늘 '수집 성공'이었다 — 관리자가 고칠 수 있는 문제를 아무도 볼 수 없었다.

    셋으로 나눈다.
      SUCCESS   : 이번 실행에서 이 출처에서 최근 기사를 실제로 가져왔다.
      NO_RESULT : 목록·피드는 정상이었지만 기간 안에 새 기사가 없었다. 실패가 아니다.
      ERROR     : 확인 자체가 실패했거나 확인할 방법이 없다. 사유를 함께 남긴다.
    """
    for item in configs:
        source_id = int(item["id"])
        if source_id in fetched:
            status, reason = "SUCCESS", None
        elif errors.get(source_id):
            status, reason = "ERROR", errors[source_id]
        else:
            status, reason = "NO_RESULT", None
        try:
            api.record_source_crawl_result(source_id, status, reason)
        except Exception as error:  # noqa: BLE001
            log.warning("공식 출처 수집 상태 보고 실패 source=%s: %s", item.get("sourceName"), error)
