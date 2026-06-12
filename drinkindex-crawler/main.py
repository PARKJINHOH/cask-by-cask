"""주류 핫딜 자동 수집 — 오케스트레이터(엔트리포인트).

흐름: 스크래퍼 목록 → 1차 제목 필터 → 중복 제외 → 본문/이미지 수집
      → 이미지 임시저장→base64→삭제 → OpenAI 분석 → confidence 통과 시 백엔드 업로드.
게시글 단위로 예외를 격리해, 한 건 실패가 전체 실행을 멈추지 않게 한다.
시놀로지 작업 스케줄러가 20분마다 이 스크립트를 호출한다.
"""
from __future__ import annotations

import sys

from analyzer.openai_analyzer import OpenAIAnalyzer
from config import load_settings
from db.seen_posts import SeenPostStore
from filters.keyword_filter import KeywordFilter
from logger import get_logger, setup_logging
from models import RawPost
from scrapers.dcinside_scraper import DcinsideScraper
from scrapers.naver_cafe_scraper import NaverCafeScraper
from storage.image_handler import ImageHandler
from uploader.api_uploader import ApiUploader


def collect_candidates(settings, log) -> list[RawPost]:
    """모든 타깃의 목록을 모아 RawPost 후보 리스트로 반환."""
    candidates: list[RawPost] = []

    if settings.dcinside_targets:
        dc = DcinsideScraper(
            timeout=settings.http_timeout_sec,
            delay=settings.request_delay_sec,
            cookie=settings.dcinside_cookie,
        )
        for target in settings.dcinside_targets:
            try:
                candidates += dc.fetch_list(target)
            except Exception as e:  # noqa: BLE001
                log.warning("dcinside 목록 실패 %s: %s", target.get("board_id"), e)

    if settings.naver_cafe_targets:
        nc = NaverCafeScraper(
            timeout=settings.http_timeout_sec,
            delay=settings.request_delay_sec,
            cookie=settings.naver_cookie,
        )
        for target in settings.naver_cafe_targets:
            try:
                candidates += nc.fetch_list(target)
            except Exception as e:  # noqa: BLE001
                log.warning("naver_cafe 목록 실패 %s: %s", target.get("club_id"), e)

    return candidates


def make_detail_scraper(settings):
    """site → 본문 스크래퍼 인스턴스 매핑(재사용)."""
    return {
        "dcinside": DcinsideScraper(
            timeout=settings.http_timeout_sec, delay=settings.request_delay_sec,
            cookie=settings.dcinside_cookie,
        ),
        "naver_cafe": NaverCafeScraper(
            timeout=settings.http_timeout_sec, delay=settings.request_delay_sec,
            cookie=settings.naver_cookie,
        ),
    }


def run() -> int:
    settings = load_settings()
    log = setup_logging(settings.log_path)
    log.info("=== 핫딜 수집 시작 (dry_run=%s) ===", settings.dry_run)

    if not settings.dcinside_targets and not settings.naver_cafe_targets:
        log.error("수집 대상(targets.json)이 비어 있음 — 종료")
        return 1

    store = SeenPostStore(settings.db_path)
    purged = store.cleanup_old(days=settings.seen_retention_days)
    if purged:
        log.info("오래된 중복기록 %d건 정리(보존 %d일)", purged, settings.seen_retention_days)
    kw = KeywordFilter(settings.deal_keywords, settings.exclude_keywords)
    images = ImageHandler(
        settings.image_temp_dir, timeout=settings.http_timeout_sec,
        max_images=settings.max_images_per_post,
    )
    analyzer = OpenAIAnalyzer(
        settings.openai_api_key, settings.openai_model, settings.openai_base_url,
    )
    uploader = ApiUploader(settings.api_url, settings.internal_key, settings.http_timeout_sec)
    detail_scrapers = make_detail_scraper(settings)

    candidates = collect_candidates(settings, log)
    log.info("후보 총 %d건 수집", len(candidates))

    stats = {"filtered": 0, "seen": 0, "analyzed": 0, "uploaded": 0, "skipped": 0, "error": 0}
    new_count = 0

    for post in candidates:
        if new_count >= settings.max_new_posts_per_run:
            log.info("이번 실행 분석 상한(%d) 도달 — 나머지는 다음 실행", settings.max_new_posts_per_run)
            break

        # 1) 제목 1차 필터
        ok, reason = kw.passes(post.title)
        if not ok:
            stats["filtered"] += 1
            continue

        # 2) 중복 제외
        if store.exists(post.key):
            stats["seen"] += 1
            continue

        new_count += 1
        try:
            # 3) 본문 + 이미지 URL 수집
            scraper = detail_scrapers[post.site]
            detail = scraper.fetch_detail(post)

            # 4) 이미지 임시 디렉토리 다운로드 → base64 인코딩 → 분석 직후 디렉토리 삭제
            post_hash = ImageHandler.make_post_hash(post.url)
            image_dir = images.download(detail.image_urls, post_hash, referer=post.url)
            try:
                data_urls = images.encode_dir(image_dir)
                # 5) AI 분석
                result = analyzer.analyze(detail, data_urls)
            finally:
                images.cleanup(image_dir)
            stats["analyzed"] += 1
            log.info(
                "분석 %s | hotdeal=%s conf=%.2f cat=%s price=%s | %s",
                post.key, result.is_hotdeal, result.confidence,
                result.category, result.price, result.summary[:60],
            )

            # 6) 업로드 판정
            is_deal = result.is_hotdeal and result.is_alcohol
            if not is_deal or result.confidence < settings.min_confidence:
                store.mark(post.key, post.site, post.url, "SKIPPED")
                stats["skipped"] += 1
                continue

            if settings.dry_run:
                log.info("[DRY_RUN] 업로드 생략 %s", post.key)
                store.mark(post.key, post.site, post.url, "ANALYZED")
                continue

            if uploader.upload(detail, result):
                store.mark(post.key, post.site, post.url, "UPLOADED")
                stats["uploaded"] += 1
            else:
                store.mark(post.key, post.site, post.url, "ERROR")
                stats["error"] += 1

        except Exception as e:  # noqa: BLE001
            log.exception("게시글 처리 실패 %s: %s", post.key, e)
            store.mark(post.key, post.site, post.url, "ERROR")
            stats["error"] += 1

    store.close()
    log.info(
        "=== 종료 | 후보=%d 신규=%d 필터제외=%d 중복=%d 분석=%d 업로드=%d 스킵=%d 오류=%d ===",
        len(candidates), new_count, stats["filtered"], stats["seen"],
        stats["analyzed"], stats["uploaded"], stats["skipped"], stats["error"],
    )
    return 0


if __name__ == "__main__":
    try:
        sys.exit(run())
    except ValueError as e:
        # 필수 환경설정 누락 등 — 로깅 설정 이전에 날 수 있어 stderr 로 직접 출력
        print(f"[config error] {e}", file=sys.stderr)
        sys.exit(2)
