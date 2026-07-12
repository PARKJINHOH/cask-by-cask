from __future__ import annotations

import hashlib
import json
import re
import sys
import tempfile
import traceback
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

from alerts.slack_notifier import SlackNotifier
from logger import setup_logging
from news_config import NewsSettings
from news_community import collect_community_sources
from news_images import fetch_approved_official_image
from news_models import DraftArticle, SearchSource, canonicalize_url, local_datetime_string
from news_gemini import GeminiNewsWriter
from news_tavily import TavilyNewsSearch
from uploader.ai_news_api import AiNewsApi


def _dedupe_sources(sources: list[SearchSource]) -> list[SearchSource]:
    result: list[SearchSource] = []
    seen: set[str] = set()
    for source in sorted(sources, key=lambda s: s.score, reverse=True):
        try:
            key = canonicalize_url(source.url)
        except ValueError:
            continue
        if key in seen:
            continue
        seen.add(key)
        result.append(source)
    return result


def _apply_source_trust(sources: list[SearchSource], config: dict) -> None:
    trusted = {
        str(item.get("domain", "")).lower().removeprefix("www."): item.get("sourceType", "UNAPPROVED")
        for item in config.get("sources", []) if item.get("enabled")
    }
    for source in sources:
        source.source_type = trusted.get(source.domain, "UNAPPROVED")


def _article_payload(draft: DraftArticle, sources: list[SearchSource]) -> dict:
    selected = [sources[i] for i in draft.source_indexes if 0 <= i < len(sources)]
    canonical_hash = _canonical_hash(selected) if draft.article_type == "RELEASE_NEWS" else None
    return {
        "articleType": draft.article_type,
        "category": draft.category,
        "title": draft.title,
        "content": draft.content_html,
        "dedupeKey": draft.dedupe_key,
        "confidenceScore": draft.confidence,
        "canonicalUrlHash": canonical_hash,
        "semanticFingerprint": draft.semantic_fingerprint,
        "topicId": draft.topic_id,
        "prefixId": None,
        "pinned": False,
        "autoPublishRequested": True,
        "imageUrl": draft.image_url,
        "imageKind": draft.image_kind,
        "imageRightsEvidence": draft.image_rights_evidence,
        "modelName": draft.model_name,
        "sources": [source.evidence_payload() for source in selected],
    }


def _canonical_hash(sources: list[SearchSource]) -> str | None:
    if not sources:
        return None
    normalized = canonicalize_url(sources[0].url)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def _topic_signatures(*values: str | None) -> set[str]:
    signatures: set[str] = set()
    for value in values:
        if not value:
            continue
        for fragment in re.split(r"[,;|\n]", value):
            normalized = unicodedata.normalize("NFKC", fragment).lower()
            normalized = re.sub(r"[^a-z0-9가-힣]", "", normalized)
            if normalized:
                signatures.add(normalized)
    return signatures


def _find_exact_tip_duplicate(topic: dict, corpus: list[dict]) -> dict | None:
    current = _topic_signatures(topic.get("title"), topic.get("normalizedKey"), topic.get("aliases"))
    for previous in corpus:
        past = _topic_signatures(
            previous.get("title"), previous.get("topicKey"),
            previous.get("topicTitle"), previous.get("topicAliases"),
        )
        if current & past:
            return previous
    return None


def _duplicate_payload(topic: dict, draft: DraftArticle | None, reason: str,
                       model_name: str) -> dict:
    return {
        "category": topic["category"],
        "title": (draft.title if draft else topic["title"])[:50],
        "dedupeKey": draft.dedupe_key if draft else f"tip:{topic['normalizedKey']}",
        "semanticFingerprint": draft.semantic_fingerprint if draft else topic.get("normalizedKey"),
        "topicId": int(topic["id"]),
        "duplicateReason": reason[:1000],
        "modelName": model_name,
    }


def _record_usage(api: AiNewsApi, run_id: int, settings: NewsSettings,
                  writer: GeminiNewsWriter, tavily_credits: int) -> None:
    api.record_usage({
        "runId": run_id,
        "provider": "TAVILY",
        "modelName": "search-basic",
        "inputTokens": 0,
        "outputTokens": 0,
        "imageCount": 0,
        "tavilyCredits": tavily_credits,
        "estimatedCostUsd": 0,
        "usageAt": local_datetime_string(),
    })
    for model, values in writer.usage.by_model.items():
        if model == settings.classifier_model:
            estimated = (
                values["input"] * settings.classifier_input_usd_per_million
                + values["output"] * settings.classifier_output_usd_per_million
            ) / 1_000_000
        else:
            estimated = (
                values["input"] * settings.writer_input_usd_per_million
                + values["output"] * settings.writer_output_usd_per_million
            ) / 1_000_000
        if settings.gemini_free_tier:
            estimated = 0
        api.record_usage({
            "runId": run_id,
            "provider": "GEMINI",
            "modelName": model,
            "inputTokens": values["input"],
            "outputTokens": values["output"],
            "imageCount": 0,
            "tavilyCredits": 0,
            "estimatedCostUsd": estimated,
            "usageAt": local_datetime_string(),
        })
    if writer.usage.image_count:
        api.record_usage({
            "runId": run_id,
            "provider": "GEMINI",
            "modelName": settings.image_model,
            "inputTokens": 0,
            "outputTokens": 0,
            "imageCount": writer.usage.image_count,
            "tavilyCredits": 0,
            "estimatedCostUsd": writer.usage.estimated_cost_usd,
            "usageAt": local_datetime_string(),
        })


def _process_draft(api: AiNewsApi, writer: GeminiNewsWriter, draft: DraftArticle,
                   sources: list[SearchSource], temp_dir: Path, config: dict, log) -> dict | None:
    selected = [sources[i] for i in draft.source_indexes if 0 <= i < len(sources)]
    canonical_hash = _canonical_hash(selected) if draft.article_type == "RELEASE_NEWS" else None
    duplicate = api.check_duplicate(draft.dedupe_key, canonical_hash,
                                    draft.semantic_fingerprint, draft.article_type)
    if duplicate.get("duplicate"):
        retry_missing_tip_image = (
            draft.article_type == "TIP_INFO"
            and duplicate.get("status") == "PENDING_REVIEW"
            and duplicate.get("dedupeKey") == draft.dedupe_key
            and duplicate.get("imageMissing")
        )
        if not retry_missing_tip_image:
            log.info("중복 제외 key=%s articleId=%s", draft.dedupe_key, duplicate.get("articleId"))
            return None

    if draft.article_type == "RELEASE_NEWS":
        approved = fetch_approved_official_image(selected, config, temp_dir, api.timeout, log)
        if approved:
            image_path, rights_evidence = approved
            try:
                draft.image_url = api.upload_image(image_path)
                draft.image_kind = "OFFICIAL_APPROVED"
                draft.image_rights_evidence = rights_evidence
            except Exception as error:  # noqa: BLE001
                log.warning("승인 공식 이미지 업로드 실패 - AI 이미지로 대체: %s", error)
            finally:
                image_path.unlink(missing_ok=True)

    try:
        if not draft.image_url and writer.image_generation_enabled:
            image_path = writer.generate_image(draft.image_prompt, temp_dir, draft.dedupe_key)
        else:
            image_path = None
            if not draft.image_url:
                log.info("%s AI 이미지 생성 비활성화 - 이미지 없이 검토 대기로 저장",
                         draft.article_type)
        try:
            if image_path:
                draft.image_url = api.upload_image(image_path)
                draft.image_kind = "AI_GENERATED"
                draft.image_rights_evidence = "Google Gemini 생성 이미지; 비브랜드·무문자 프롬프트 및 SynthID 적용"
        finally:
            if image_path:
                image_path.unlink(missing_ok=True)
    except Exception as error:
        # 이미지가 없으면 공개하지 않되 생성한 원고와 근거는 버리지 않는다.
        # 백엔드가 PENDING_REVIEW로 보존하며, 팁은 다음 실행에서 이미지만 재시도한다.
        log.warning("%s 이미지 생성/업로드 실패 - 검토 대기로 저장: %s",
                    draft.article_type, error)
    response = api.submit_article(_article_payload(draft, sources))
    log.info("원고 저장 id=%s status=%s title=%s", response.get("id"), response.get("status"), draft.title)
    return response


def run() -> int:
    settings = NewsSettings()
    settings.validate()
    log = setup_logging(settings.news_log_path)
    notifier = SlackNotifier.from_env()
    api = AiNewsApi(settings.api_url, settings.internal_key, settings.http_timeout_sec)
    config = api.config()
    remote_settings = config["settings"]
    if not remote_settings.get("automationEnabled"):
        log.info("AI 소식 자동화가 관리자 설정에서 비활성화되어 있습니다.")
        return 0

    usage = config["usage"]
    has_rewrite_requests = bool(config.get("rewriteRequests"))
    tavily_limit = int(remote_settings.get("tavilyMonthlyCreditLimit", 900))
    tavily_used = int(usage.get("tavilyCredits", 0))
    if tavily_used >= tavily_limit:
        notifier.warning_once("ai_news_tavily_budget", "AI 소식 Tavily 한도 도달", json.dumps(usage, ensure_ascii=False))
        if not has_rewrite_requests:
            return 0
    if tavily_limit > 0 and tavily_used / tavily_limit >= 0.8:
        notifier.warning_once("ai_news_tavily_budget_80", "AI 소식 Tavily 한도 80% 도달",
                              json.dumps(usage, ensure_ascii=False))
    remaining_tavily_credits = tavily_limit - tavily_used
    if remaining_tavily_credits < 2:
        notifier.warning_once("ai_news_tavily_reserve", "AI 소식 Tavily 잔여 한도 부족",
                              f"remaining={remaining_tavily_credits}")
        if not has_rewrite_requests:
            return 0
    estimated_cost = float(usage.get("estimatedCostUsd", 0) or 0)
    admin_ai_budget = float(usage.get("openaiBudgetUsd", 0) or 0)
    if admin_ai_budget > 0 and estimated_cost >= admin_ai_budget:
        notifier.warning_once("ai_news_gemini_admin_budget", "AI 소식 Gemini 관리자 한도 도달",
                              json.dumps(usage, ensure_ascii=False))
        return 0
    if admin_ai_budget > 0 and estimated_cost / admin_ai_budget >= 0.8:
        notifier.warning_once("ai_news_gemini_admin_budget_80", "AI 소식 Gemini 관리자 한도 80% 도달",
                              json.dumps(usage, ensure_ascii=False))
    used_tokens = int(usage.get("inputTokens", 0)) + int(usage.get("outputTokens", 0))
    admin_token_limit = int(usage.get("openaiTokenLimit", 0) or 0)
    if admin_token_limit > 0 and used_tokens >= admin_token_limit:
        notifier.warning_once("ai_news_gemini_token_limit", "AI 소식 Gemini 토큰 한도 도달",
                              json.dumps(usage, ensure_ascii=False))
        return 0
    if admin_token_limit > 0 and used_tokens / admin_token_limit >= 0.8:
        notifier.warning_once("ai_news_gemini_token_limit_80", "AI 소식 Gemini 토큰 한도 80% 도달",
                              json.dumps(usage, ensure_ascii=False))
    used_images = int(usage.get("imageCount", 0))
    admin_image_limit = int(usage.get("openaiImageLimit", 0) or 0)
    if admin_image_limit > 0 and used_images >= admin_image_limit:
        notifier.warning_once("ai_news_gemini_image_limit", "AI 소식 Gemini 이미지 한도 도달",
                              json.dumps(usage, ensure_ascii=False))
        return 0
    if admin_image_limit > 0 and used_images / admin_image_limit >= 0.8:
        notifier.warning_once("ai_news_gemini_image_limit_80", "AI 소식 Gemini 이미지 한도 80% 도달",
                              json.dumps(usage, ensure_ascii=False))
    if settings.hard_monthly_cost_usd > 0 and estimated_cost >= settings.hard_monthly_cost_usd:
        notifier.warning_once("ai_news_gemini_hard_budget", "AI 소식 Gemini 절대 한도 도달", json.dumps(usage, ensure_ascii=False))
        return 0
    if settings.hard_monthly_tokens > 0 and used_tokens >= settings.hard_monthly_tokens:
        notifier.warning_once("ai_news_gemini_hard_tokens", "AI 소식 Gemini 절대 토큰 한도 도달",
                              json.dumps(usage, ensure_ascii=False))
        return 0
    if settings.hard_monthly_images > 0 and used_images >= settings.hard_monthly_images:
        notifier.warning_once("ai_news_gemini_hard_images", "AI 소식 Gemini 절대 이미지 한도 도달",
                              json.dumps(usage, ensure_ascii=False))
        return 0

    dry_run = bool(remote_settings.get("dryRun")) or settings.dry_run_override
    run_key = datetime.now(timezone.utc).strftime("ai-news-%Y%m%dT%H%M%SZ")
    run_info = api.start_run(run_key, "DRY_RUN" if dry_run else "SCHEDULED")
    run_id = int(run_info["id"])
    stats = {"candidateCount": 0, "publishedCount": 0, "reviewCount": 0,
             "duplicateCount": 0, "errorCount": 0}
    search = TavilyNewsSearch(settings.tavily_api_key, settings.http_timeout_sec,
                              settings.search_results_per_query)
    writer = GeminiNewsWriter(settings.gemini_api_key, settings.classifier_model,
                              settings.writer_model, settings.image_model,
                              settings.image_estimated_cost_usd,
                              settings.image_generation_enabled)
    fatal_error = None
    try:
        for rewrite_request in list(config.get("rewriteRequests") or []):
            stats["candidateCount"] += 1
            try:
                rewritten = writer.rewrite_article(rewrite_request)
                api.complete_rewrite(int(rewrite_request["articleId"]), {
                    "title": rewritten.title,
                    "content": rewritten.content_html,
                    "confidenceScore": rewritten.confidence,
                    "semanticFingerprint": rewritten.semantic_fingerprint,
                    "modelName": rewritten.model_name,
                })
                stats["reviewCount"] += 1
                log.info("AI 원고 재작성 완료 articleId=%s", rewrite_request.get("articleId"))
            except Exception as error:  # noqa: BLE001
                stats["errorCount"] += 1
                log.exception("AI 원고 재작성 실패 articleId=%s: %s",
                              rewrite_request.get("articleId"), error)

        now_year = datetime.now(timezone.utc).year
        release_sources = _dedupe_sources(
            search.search(f"위스키 와인 꼬냑 신제품 출시 예정 국내 출시 수입 {now_year}")
            + search.search(f"new whisky wine cognac release announced launch {now_year}")
            + collect_community_sources(config, notifier, log, settings.http_timeout_sec)
        ) if remaining_tavily_credits >= 2 else []
        _apply_source_trust(release_sources, config)
        remaining_daily = max(0, int(remote_settings.get("dailyReleaseLimit", 3))
                              - int(config.get("releasePublishedToday", 0)))
        max_candidates = min(settings.max_candidates_per_run, remaining_daily)
        candidates = writer.classify_releases(release_sources, max_candidates, {
            "WHISKY": int(remote_settings.get("whiskyRatio", 60)),
            "WINE": int(remote_settings.get("wineRatio", 20)),
            "COGNAC": int(remote_settings.get("cognacRatio", 20)),
        })
        stats["candidateCount"] += len(candidates)

        with tempfile.TemporaryDirectory(prefix="caskbycask-ai-news-") as tmp:
            temp_dir = Path(tmp)
            for candidate in candidates:
                try:
                    draft = writer.write_release(candidate, release_sources)
                    response = _process_draft(api, writer, draft, release_sources, temp_dir, config, log)
                    if response is None:
                        stats["duplicateCount"] += 1
                    elif response.get("status") == "PUBLISHED":
                        stats["publishedCount"] += 1
                    else:
                        stats["reviewCount"] += 1
                except Exception as error:  # noqa: BLE001
                    stats["errorCount"] += 1
                    log.exception("출시 소식 후보 처리 실패: %s", error)

            if config.get("tipDue") and remaining_tavily_credits - search.credits_used >= 1:
                ready_topics = list(config.get("readyTopics") or [])
                if not ready_topics:
                    for suggestion in writer.suggest_topics(config.get("allTopicKeys") or [], 3):
                        try:
                            ready_topics.append(api.create_topic_suggestion({
                                **suggestion, "status": "READY", "allowRepublish": False, "aiSuggested": True,
                            }))
                        except Exception as error:  # noqa: BLE001
                            log.warning("AI 제안 주제 저장 실패 key=%s: %s", suggestion.get("normalizedKey"), error)
                topic = ready_topics[0] if ready_topics else None
            else:
                topic = None
            if topic:
                stats["candidateCount"] += 1
                try:
                    duplicate_corpus = list(config.get("tipDuplicateCorpus") or [])
                    exact_match = None if topic.get("allowRepublish") else _find_exact_tip_duplicate(
                        topic, duplicate_corpus)
                    if exact_match:
                        reason = (
                            "정규화 주제 키/동의어가 과거 글과 일치합니다. "
                            f"matchedArticleId={exact_match.get('articleId')}"
                        )
                        api.record_duplicate(_duplicate_payload(
                            topic, None, reason, settings.classifier_model))
                        stats["duplicateCount"] += 1
                        log.info("팁 주제 사전 중복 차단 topic=%s reason=%s", topic.get("id"), reason)
                    else:
                        tip_sources = _dedupe_sources(search.search(
                            f"{topic['title']} {topic.get('aliases') or ''} whisky wine cognac authoritative guide",
                            topic="general", time_range=None,
                        ))
                        _apply_source_trust(tip_sources, config)
                        draft = writer.write_tip(topic, tip_sources)
                        duplicate_judgement = writer.judge_tip_duplicate(topic, draft, duplicate_corpus)
                        if duplicate_judgement.get("duplicate") and not topic.get("allowRepublish"):
                            reason = (
                                f"의미 유사도 {duplicate_judgement.get('semanticSimilarity', 0):.3f}; "
                                f"matchedArticleId={duplicate_judgement.get('matchedArticleId')}; "
                                f"{duplicate_judgement.get('reason')}"
                            )
                            api.record_duplicate(_duplicate_payload(
                                topic, draft, reason, settings.classifier_model))
                            stats["duplicateCount"] += 1
                            log.info("팁 의미 중복 차단 topic=%s reason=%s", topic.get("id"), reason)
                        else:
                            response = _process_draft(api, writer, draft, tip_sources, temp_dir, config, log)
                            if response is None:
                                stats["duplicateCount"] += 1
                            elif response.get("status") == "PUBLISHED":
                                stats["publishedCount"] += 1
                            else:
                                stats["reviewCount"] += 1
                except Exception as error:  # noqa: BLE001
                    stats["errorCount"] += 1
                    log.exception("팁 및 정보 글 처리 실패: %s", error)

    except Exception as error:  # noqa: BLE001
        fatal_error = str(error)
        stats["errorCount"] += 1
        log.exception("AI 소식 실행 실패: %s", error)
        notifier.danger_once("ai_news_fatal", "AI 소식 자동화 실행 실패", fatal_error)
    finally:
        try:
            _record_usage(api, run_id, settings, writer, search.credits_used)
        except Exception as usage_error:  # noqa: BLE001
            stats["errorCount"] += 1
            log.exception("AI 소식 사용량 기록 실패: %s", usage_error)
            notifier.warning_once("ai_news_usage_record", "AI 소식 사용량 기록 실패", str(usage_error))
        finish_status = "FAILED" if fatal_error else ("PARTIAL" if stats["errorCount"] else "SUCCEEDED")
        api.finish_run(run_id, {"status": finish_status, **stats, "errorMessage": fatal_error})

    if stats["errorCount"]:
        notifier.warning_once("ai_news_errors", "AI 소식 일부 처리 실패",
                              json.dumps(stats, ensure_ascii=False))
    log.info("AI 소식 실행 완료: %s", stats)
    return 1 if fatal_error else 0


if __name__ == "__main__":
    try:
        sys.exit(run())
    except Exception as exc:  # noqa: BLE001
        print(f"[ai-news fatal] {exc}", file=sys.stderr)
        traceback.print_exc()
        SlackNotifier.from_env().danger_once("ai_news_startup", "AI 소식 시작 실패", str(exc))
        sys.exit(1)
