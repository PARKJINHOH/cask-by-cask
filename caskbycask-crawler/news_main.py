from __future__ import annotations

import hashlib
import json
import sys
import traceback
from datetime import datetime, timezone

from alerts.ai_news_error_alert import append_error_detail, format_error_alert
from alerts.slack_notifier import SlackNotifier
from logger import setup_logging
from news_config import NewsSettings
from news_models import NewsLead, SearchSource, canonicalize_url, local_datetime_string
from news_source_config import matching_source_config
from news_official import collect_registered_sources, rotation_category
from news_gemini import GeminiLeadFinder
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
    for source in sources:
        matched = matching_source_config(source.url, source.domain, config.get("sources", []))
        source.source_type = (matched.get("sourceType", "UNAPPROVED")
                              if matched and matched.get("enabled") else "UNAPPROVED")


def _lead_payload(lead: NewsLead, sources: list[SearchSource]) -> dict:
    """소재 저장 페이로드. 본문(content)이 없다 — 관리자가 근거를 보고 직접 쓴다."""
    selected = [sources[i] for i in lead.source_indexes if 0 <= i < len(sources)]
    return {
        "category": lead.category,
        "title": lead.title,
        "leadSummary": lead.summary,
        "dedupeKey": lead.dedupe_key,
        "canonicalUrlHash": _canonical_hash(selected),
        "confidenceScore": lead.confidence,
        "modelName": lead.model_name,
        "sources": [source.evidence_payload() for source in selected],
    }


def _canonical_hash(sources: list[SearchSource]) -> str | None:
    if not sources:
        return None
    normalized = canonicalize_url(sources[0].url)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def _record_usage(api: AiNewsApi, run_id: int, settings: NewsSettings,
                  finder: GeminiLeadFinder, tavily_credits: int) -> None:
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
    for model, values in finder.usage.by_model.items():
        estimated = (
            values["input"] * settings.classifier_input_usd_per_million
            + values["output"] * settings.classifier_output_usd_per_million
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


def _process_lead(api: AiNewsApi, lead: NewsLead, sources: list[SearchSource], log) -> dict | None:
    """소재를 저장한다. 발행은 하지 않는다 — 관리자가 본문을 쓴 뒤 직접 발행한다."""
    payload = _lead_payload(lead, sources)
    duplicate = api.check_duplicate(lead.dedupe_key, payload["canonicalUrlHash"])
    if duplicate.get("duplicate"):
        log.info("중복 소재 제외 key=%s articleId=%s", lead.dedupe_key, duplicate.get("articleId"))
        return None
    response = api.submit_lead(payload)
    log.info("소재 저장 id=%s title=%s", response.get("id"), lead.title)
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
    tavily_limit = int(remote_settings.get("tavilyMonthlyCreditLimit", 900))
    tavily_used = int(usage.get("tavilyCredits", 0))
    if tavily_used >= tavily_limit:
        notifier.warning_once("ai_news_tavily_budget", "AI 소식 Tavily 한도 도달",
                              json.dumps(usage, ensure_ascii=False))
        return 0
    if tavily_limit > 0 and tavily_used / tavily_limit >= 0.8:
        notifier.warning_once("ai_news_tavily_budget_80", "AI 소식 Tavily 한도 80% 도달",
                              json.dumps(usage, ensure_ascii=False))
    remaining_tavily_credits = tavily_limit - tavily_used

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
    if settings.hard_monthly_cost_usd > 0 and estimated_cost >= settings.hard_monthly_cost_usd:
        notifier.warning_once("ai_news_gemini_hard_budget", "AI 소식 Gemini 절대 한도 도달",
                              json.dumps(usage, ensure_ascii=False))
        return 0
    if settings.hard_monthly_tokens > 0 and used_tokens >= settings.hard_monthly_tokens:
        notifier.warning_once("ai_news_gemini_hard_tokens", "AI 소식 Gemini 절대 토큰 한도 도달",
                              json.dumps(usage, ensure_ascii=False))
        return 0

    run_key = datetime.now(timezone.utc).strftime("ai-news-%Y%m%dT%H%M%SZ")
    run_info = api.start_run(run_key, "SCHEDULED")
    run_id = int(run_info["id"])
    # publishedCount 는 항상 0 이다 — 발행은 관리자가 한다. 저장된 소재는 reviewCount 로 센다.
    stats = {"candidateCount": 0, "publishedCount": 0, "reviewCount": 0,
             "duplicateCount": 0, "errorCount": 0}
    error_details: list[dict[str, str]] = []
    search = TavilyNewsSearch(settings.tavily_api_key, settings.http_timeout_sec,
                              settings.search_results_per_query)
    finder = GeminiLeadFinder(settings.gemini_api_key, settings.classifier_model)
    fatal_error = None
    try:
        # 근거는 관리자가 등록한 허용목록에서만 모은다. 실행마다 주종 하나에 집중한다.
        focus_category = rotation_category(run_id, {
            "WHISKY": int(remote_settings.get("whiskyRatio", 60)),
            "WINE": int(remote_settings.get("wineRatio", 20)),
            "COGNAC": int(remote_settings.get("cognacRatio", 20)),
        })
        if remaining_tavily_credits - search.credits_used >= 1:
            log.info("이번 실행 집중 주종=%s", focus_category)
            found_sources = _dedupe_sources(collect_registered_sources(
                config, search, api, log, settings.http_timeout_sec,
                allow_tavily=True, category=focus_category,
            ))
        else:
            found_sources = []
        _apply_source_trust(found_sources, config)

        # 일일 한도는 발행이 아니라 소재 생성 기준이다 — 발행은 관리자가 나중에 한다.
        remaining_daily = max(0, int(remote_settings.get("dailyReleaseLimit", 3))
                              - int(config.get("releaseCreatedToday", 0)))
        max_leads = min(settings.max_leads_per_run, remaining_daily)
        leads = finder.find_leads(found_sources, max_leads, focus_category)
        stats["candidateCount"] += len(leads)

        for lead in leads:
            try:
                if _process_lead(api, lead, found_sources, log) is None:
                    stats["duplicateCount"] += 1
                else:
                    stats["reviewCount"] += 1
            except Exception as error:  # noqa: BLE001
                stats["errorCount"] += 1
                append_error_detail(error_details, "소재 저장", error,
                                    eventKey=lead.event_key, category=lead.category,
                                    title=lead.title)
                log.exception("소재 저장 실패: %s", error)

    except Exception as error:  # noqa: BLE001
        fatal_error = str(error)
        stats["errorCount"] += 1
        append_error_detail(error_details, "AI 소식 실행", error)
        log.exception("AI 소식 실행 실패: %s", error)
        notifier.danger_once("ai_news_fatal", "AI 소식 자동화 실행 실패", fatal_error)
    finally:
        try:
            _record_usage(api, run_id, settings, finder, search.credits_used)
        except Exception as usage_error:  # noqa: BLE001
            stats["errorCount"] += 1
            append_error_detail(error_details, "사용량 기록", usage_error, runId=run_id)
            log.exception("AI 소식 사용량 기록 실패: %s", usage_error)
            notifier.warning_once("ai_news_usage_record", "AI 소식 사용량 기록 실패", str(usage_error))
        finish_status = "FAILED" if fatal_error else ("PARTIAL" if stats["errorCount"] else "SUCCEEDED")
        api.finish_run(run_id, {"status": finish_status, **stats, "errorMessage": fatal_error})

    if stats["errorCount"]:
        notifier.warning_once("ai_news_errors", "AI 소식 일부 처리 실패",
                              format_error_alert(run_id, run_key, stats, error_details))
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
