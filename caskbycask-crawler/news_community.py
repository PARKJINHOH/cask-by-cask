from __future__ import annotations

from config import Settings
from news_models import SearchSource
from news_targets import target_from_config
from scrapers.dcinside_scraper import DcinsideScraper
from scrapers.naver_cafe_scraper import NaverCafeScraper


def collect_community_sources(config: dict, notifier, log, timeout: int) -> list[SearchSource]:
    source_configs = [s for s in config.get("sources", [])
                      if s.get("enabled") and s.get("sourceType") == "COMMUNITY" and s.get("crawlerType")]
    if not source_configs:
        return []

    dynamic = Settings()
    dynamic.load_dynamic_settings()
    dc = DcinsideScraper(timeout=timeout, delay=dynamic.request_delay_sec, cookie=dynamic.dcinside_cookie)
    naver = NaverCafeScraper(timeout=timeout, delay=dynamic.request_delay_sec,
                             cookie=dynamic.naver_cookie, notifier=notifier)
    collected: list[SearchSource] = []

    for source in source_configs:
        crawler_type = str(source.get("crawlerType") or "").upper()
        try:
            target = target_from_config(source)
            scraper = dc if crawler_type == "DCINSIDE" else naver if crawler_type == "NAVER_CAFE" else None
            if scraper is None:
                log.warning("지원하지 않는 커뮤니티 수집기: %s", crawler_type)
                continue
            posts = scraper.fetch_list(target)[:5]
            for post in posts:
                detail = scraper.fetch_detail(post)
                if not detail.content_text or detail.content_text == "[AUTH_REQUIRED]":
                    continue
                collected.append(SearchSource(
                    title=post.title,
                    url=post.url,
                    domain=str(source.get("domain") or post.site),
                    content=detail.content_text[:12000],
                    score=0.35,
                    published_at=post.posted_at,
                    source_type="COMMUNITY",
                ))
        except Exception as error:  # noqa: BLE001
            log.warning("커뮤니티 수집 실패 source=%s: %s", source.get("sourceName"), error)
            notifier.warning_once(f"ai_news_community_{source.get('id')}",
                                  "AI 소식 커뮤니티 수집 실패",
                                  f"source={source.get('sourceName')}, error={error}")
    return collected
