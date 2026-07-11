"""주류 핫딜 자동 수집 — 오케스트레이터(엔트리포인트).

흐름: 스크래퍼 목록 → 1차 제목 필터 → 중복 제외 → 본문/이미지 수집
      → 이미지 임시저장→base64→삭제 → Gemini 분석 → confidence 통과 시 백엔드 업로드.
게시글 단위로 예외를 격리해, 한 건 실패가 전체 실행을 멈추지 않게 한다.
Oracle Cloud cron이 KST 기준 2시간마다 이 스크립트를 호출한다.
"""
from __future__ import annotations

import sys
import traceback

from alerts.slack_notifier import SlackNotifier
from analyzer.gemini_analyzer import GeminiAnalyzer
from config import load_settings
from db.seen_posts import SeenPostStore
from filters.deal_deduplicator import DealDeduplicator
from filters.deal_policy import review_analysis
from filters.keyword_filter import KeywordFilter
from logger import get_logger, setup_logging
from models import RawPost
from scrapers.dcinside_scraper import DcinsideScraper
from scrapers.naver_cafe_scraper import NaverCafeScraper
from storage.image_handler import ImageHandler
from uploader.api_uploader import ApiUploader


def collect_candidates(settings, log, notifier: SlackNotifier) -> list[RawPost]:
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
                notifier.warning_once(
                    "dcinside_list_error",
                    "크롤러 디시 목록 수집 실패",
                    f"board_id={target.get('board_id')}, error={e}",
                )

    if settings.naver_cafe_targets:
        nc = NaverCafeScraper(
            timeout=settings.http_timeout_sec,
            delay=settings.request_delay_sec,
            cookie=settings.naver_cookie,
            notifier=notifier,
        )
        for target in settings.naver_cafe_targets:
            try:
                candidates += nc.fetch_list(target)
            except Exception as e:  # noqa: BLE001
                log.warning("naver_cafe 목록 실패 %s: %s", target.get("club_id"), e)
                notifier.warning_once(
                    "naver_cafe_list_error",
                    "크롤러 네이버 카페 목록 수집 실패",
                    f"club_id={target.get('club_id')}, error={e}",
                )

    return candidates


def make_detail_scraper(settings, notifier: SlackNotifier):
    """site → 본문 스크래퍼 인스턴스 매핑(재사용)."""
    return {
        "dcinside": DcinsideScraper(
            timeout=settings.http_timeout_sec, delay=settings.request_delay_sec,
            cookie=settings.dcinside_cookie,
        ),
        "naver_cafe": NaverCafeScraper(
            timeout=settings.http_timeout_sec, delay=settings.request_delay_sec,
            cookie=settings.naver_cookie, notifier=notifier,
        ),
    }


def record_deal_fingerprint(store: SeenPostStore, deduplicator: DealDeduplicator, post: RawPost, result, status: str) -> None:
    signature = deduplicator.build_analysis_signature(post.title, result)
    store.record_deal_fingerprint(
        post=post,
        normalized_title=signature.normalized_text,
        token_key=signature.token_key,
        seller_chain=signature.seller_chain,
        ai_fingerprint=signature.ai_fingerprint,
        drink_name=result.drink_name,
        deal_price=result.deal_price,
        status=status,
    )


def run() -> int:
    settings = load_settings()
    notifier = SlackNotifier(
        webhook_url=settings.slack_webhook_url,
        channel=settings.slack_channel,
        enabled=settings.slack_alerts_enabled,
        max_per_run=settings.slack_max_alerts_per_run,
        timeout_sec=min(settings.http_timeout_sec, 5),
    )
    log = setup_logging(settings.log_path)
    log.info("=== 핫딜 수집 시작 (dry_run=%s) ===", settings.dry_run)

    for warning in settings.runtime_warnings:
        notifier.warning_once(
            warning["key"],
            warning["summary"],
            warning["body"],
        )

    if not settings.dcinside_targets and not settings.naver_cafe_targets:
        log.error("수집 대상(targets.json)이 비어 있음 — 종료")
        notifier.danger_once(
            "crawler_no_targets",
            "크롤러 수집 대상 없음",
            f"targets.json 경로={settings.targets_path}. dcinside/naver_cafe 대상이 모두 비어 있습니다.",
        )
        return 1

    store = SeenPostStore(settings.db_path)
    purged = store.cleanup_old(days=settings.seen_retention_days)
    if purged:
        log.info("오래된 중복기록 %d건 정리(보존 %d일)", purged, settings.seen_retention_days)
    kw = KeywordFilter(settings.deal_keywords, settings.exclude_keywords)
    deduplicator = DealDeduplicator(
        jaccard_threshold=settings.duplicate_jaccard_threshold,
        ngram_threshold=settings.duplicate_ngram_threshold,
    )
    images = ImageHandler(
        settings.image_temp_dir, timeout=settings.http_timeout_sec,
        max_images=settings.max_images_per_post,
    )
    analyzer = GeminiAnalyzer(
        settings.gemini_api_key,
        settings.gemini_model,
        notifier=notifier,
        request_interval_sec=settings.gemini_request_interval_sec,
    )
    uploader = ApiUploader(settings.api_url, settings.internal_key, settings.http_timeout_sec, notifier=notifier)
    detail_scrapers = make_detail_scraper(settings, notifier)

    candidates = collect_candidates(settings, log, notifier)
    log.info("후보 총 %d건 수집", len(candidates))

    stats = {
        "filtered": 0, "seen": 0, "analyzed": 0, "uploaded": 0,
        "skipped": 0, "duplicate": 0, "deferred": 0, "error": 0,
    }

    for post in candidates:
        if not kw.passes({"title": post.title, "content": ""}):
            stats["filtered"] += 1
            continue
        if store.exists(post.key):
            store.delete_pending(post.key)
            stats["seen"] += 1
            continue
        store.upsert_pending(post)

    pending_posts = store.list_pending(settings.max_new_posts_per_run)
    log.info(
        "분석 대기열 %d건 로드 (처리상한=%d, AI상한=%d)",
        len(pending_posts), settings.max_new_posts_per_run, settings.max_ai_analysis_per_run,
    )

    processed_count = 0
    ai_calls = 0
    ai_budget = max(0, settings.max_ai_analysis_per_run)

    for idx, post in enumerate(pending_posts):
        # 대기열에 있는 동안 다른 경로에서 처리된 글이면 제거.
        if store.exists(post.key):
            store.delete_pending(post.key)
            stats["seen"] += 1
            continue

        local_signature = deduplicator.build_title_signature(post.title)
        duplicate = deduplicator.find_duplicate(
            local_signature,
            store.recent_deal_fingerprints(settings.duplicate_lookback_hours),
            source_post_key=post.key,
        )
        if duplicate is not None:
            log.info(
                "딜 중복 스킵 %s -> %s (score=%.2f, reason=%s, title=%s)",
                post.key, duplicate.post_key, duplicate.score, duplicate.reason, duplicate.title[:60],
            )
            store.mark(post.key, post.site, post.url, "SKIPPED_DUPLICATE")
            store.delete_pending(post.key)
            stats["duplicate"] += 1
            continue

        if ai_calls >= ai_budget:
            deferred = len(pending_posts) - idx
            stats["deferred"] += deferred
            log.info("AI 분석 상한(%d) 도달 — 대기열 %d건은 다음 실행으로 이월", ai_budget, deferred)
            break

        processed_count += 1
        ai_calls += 1
        try:
            # 1) 본문 + 이미지 URL 수집
            scraper = detail_scrapers[post.site]
            detail = scraper.fetch_detail(post)

            # 권한/로그인 요구 대상글인 경우 예외 발생시키지 않고 부드럽게 PASS 후 DB 마킹
            if detail.content_text == "[AUTH_REQUIRED]":
                store.mark(post.key, post.site, post.url, "SKIPPED")
                store.delete_pending(post.key)
                stats["skipped"] += 1
                continue

            # 2) 이미지 임시 디렉토리 다운로드 → base64 인코딩 → 분석 직후 디렉토리 삭제
            post_hash = ImageHandler.make_post_hash(post.url)
            image_dir = images.download(detail.image_urls, post_hash, referer=post.url)

            try:
                data_urls = images.encode_dir(image_dir)
                # 3) AI 분석
                result = analyzer.analyze(detail, data_urls)
            finally:
                images.cleanup(image_dir)

            if result is None:   # API/파싱 실패
                attempts = store.record_failure(post.key)
                if attempts >= settings.max_analysis_retries:
                    store.mark(post.key, post.site, post.url, "ERROR")
                    store.delete_pending(post.key)
                    log.warning("분석 반복 실패(%d회) — 포기하고 마킹 %s", attempts, post.key)
                stats["error"] += 1
                continue

            stats["analyzed"] += 1
            decision = review_analysis(detail, result, settings.allowed_deal_categories)
            result = decision.result
            log.info(
                "분석 %s | deal=%s score=%d cat=%s original=%s dealPrice=%s rate=%s | %s",
                post.key, result.is_deal, result.confidence_score,
                result.drink_category, result.original_price, result.deal_price,
                result.discount_rate, result.summary_ko[:60],
            )

            # 4) 업로드 판정: 정책 통과 + confidence_score 기준 충족분만 채택
            if not decision.accepted:
                log.info("정책 제외 %s | reason=%s", post.key, decision.reason)
                store.mark(post.key, post.site, post.url, "SKIPPED")
                store.delete_pending(post.key)
                stats["skipped"] += 1
                continue

            if result.confidence_score < settings.min_confidence_score:
                store.mark(post.key, post.site, post.url, "SKIPPED")
                store.delete_pending(post.key)
                stats["skipped"] += 1
                continue

            analysis_signature = deduplicator.build_analysis_signature(detail.raw.title, result)
            duplicate = deduplicator.find_duplicate(
                analysis_signature,
                store.recent_deal_fingerprints(settings.duplicate_lookback_hours),
                source_post_key=post.key,
            )
            if duplicate is not None:
                log.info(
                    "AI 분석 후 딜 중복 스킵 %s -> %s (score=%.2f, reason=%s, title=%s)",
                    post.key, duplicate.post_key, duplicate.score, duplicate.reason, duplicate.title[:60],
                )
                store.mark(post.key, post.site, post.url, "SKIPPED_DUPLICATE")
                store.delete_pending(post.key)
                stats["duplicate"] += 1
                continue

            if settings.dry_run:
                log.info("[DRY_RUN] 업로드 생략 %s", post.key)
                store.mark(post.key, post.site, post.url, "ANALYZED")
                record_deal_fingerprint(store, deduplicator, post, result, "ANALYZED")
                store.delete_pending(post.key)
                continue

            if uploader.upload(detail, result):
                store.mark(post.key, post.site, post.url, "UPLOADED")
                record_deal_fingerprint(store, deduplicator, post, result, "UPLOADED")
                store.delete_pending(post.key)
                stats["uploaded"] += 1
            else:
                attempts = store.record_failure(post.key)
                if attempts >= settings.max_analysis_retries:
                    store.mark(post.key, post.site, post.url, "ERROR")
                    store.delete_pending(post.key)
                    log.warning("업로드 반복 실패(%d회) — 포기하고 마킹 %s", attempts, post.key)
                stats["error"] += 1

        except Exception as e:  # noqa: BLE001
            # 처리 중 예외 → 마킹 안 함, 다음 실행에 재시도
            log.exception("게시글 처리 실패 %s: %s", post.key, e)
            notifier.warning_once(
                "post_processing_error",
                "크롤러 게시글 처리 실패",
                f"post={post.key}, url={post.url}, error={e}",
            )
            stats["error"] += 1

    store.close()
    log.info(
        "=== 종료 | 후보=%d 필터제외=%d 처리=%d AI호출=%d 게시글중복=%d 딜중복=%d 분석=%d 업로드=%d 스킵=%d 이월=%d 오류=%d ===",
        len(candidates), stats["filtered"], processed_count, ai_calls, stats["seen"], stats["duplicate"],
        stats["analyzed"], stats["uploaded"], stats["skipped"], stats["deferred"], stats["error"],
    )
    # 콘텐츠성/일시 실패(파싱 실패·업로드 일시 다운 등)까지 합산하는 요약 알람은 노이즈가 커서 제거.
    # 카운트는 위 종료 로그에 남으며, 사람 개입이 필요한 시스템 에러는 각 지점에서 개별 알람으로 보낸다.
    return 0


if __name__ == "__main__":
    try:
        sys.exit(run())
    except ValueError as e:
        # 필수 환경설정 누락 등 — 로깅 설정 이전에 날 수 있어 stderr 로 직접 출력
        print(f"[config error] {e}", file=sys.stderr)
        SlackNotifier.from_env().danger_once(
            "crawler_config_error",
            "크롤러 설정 오류",
            str(e),
        )
        sys.exit(2)
    except Exception as e:  # noqa: BLE001
        print(f"[crawler fatal] {e}", file=sys.stderr)
        traceback.print_exc()
        SlackNotifier.from_env().danger_once(
            "crawler_fatal_error",
            "크롤러 치명 오류",
            str(e),
        )
        sys.exit(1)
