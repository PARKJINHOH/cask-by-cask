from __future__ import annotations

import json
import re
from typing import Any

from google import genai
from google.genai import types

from logger import get_logger
from news_models import NewsLead, SearchSource, UsageAccumulator
from news_prompts import (
    AI_NEWS_LEAD_PROMPT,
    AI_NEWS_SUMMARY_MAX_LENGTH,
    AI_NEWS_TITLE_MAX_LENGTH,
)


log = get_logger("news_gemini")


LEAD_SCHEMA = {
    "type": "object",
    "properties": {
        "leads": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "category": {"type": "string", "enum": ["WHISKY", "WINE", "COGNAC", "OTHER"]},
                    "event_key": {"type": "string"},
                    "title": {"type": "string"},
                    "summary": {"type": "string"},
                    "source_indexes": {"type": "array", "items": {"type": "integer"}},
                    "confidence": {"type": "number"},
                },
                "required": ["category", "event_key", "title", "summary",
                             "source_indexes", "confidence"],
            },
        },
    },
    "required": ["leads"],
}


class GeminiLeadFinder:
    """검색 결과에서 쓸 만한 사건을 골라 제목과 요약만 만든다.

    **본문은 만들지 않는다.** 예전에는 여기서 1,500~2,500자 원고까지 썼는데 품질이 기준에 못 미쳐
    관리자가 매번 근거 URL 을 보고 처음부터 다시 썼다 — 가장 비싼 산출물이 곧 폐기물이었다.
    지금은 사실 한 줄(제목)과 판단용 요약만 만들고 나머지는 사람이 한다.
    """

    def __init__(self, api_key: str, classifier_model: str):
        self.client = genai.Client(api_key=api_key)
        self.classifier_model = classifier_model
        self.usage = UsageAccumulator()

    def find_leads(self, sources: list[SearchSource], max_leads: int,
                   focus_category: str = "WHISKY") -> list[NewsLead]:
        if not sources or max_leads <= 0:
            return []
        compact = [{
            "index": i,
            "title": s.title,
            "domain": s.domain,
            "published_at": s.published_at,
            "text": s.content[:2500],
        } for i, s in enumerate(sources)]
        result = self._request_json(self.classifier_model, AI_NEWS_LEAD_PROMPT, {
            "max_leads": max(0, max_leads),
            "focus_category": focus_category,
            "sources": compact,
        }, LEAD_SCHEMA)

        raw_leads = result.get("leads", []) if isinstance(result, dict) else []
        leads: list[NewsLead] = []
        for item in raw_leads[:max_leads]:
            lead = self._lead_from_result(item, len(sources))
            if lead:
                leads.append(lead)
        return leads

    def _lead_from_result(self, item: dict[str, Any], source_count: int) -> NewsLead | None:
        category = str(item.get("category", "")).upper()
        if category not in {"WHISKY", "WINE", "COGNAC", "OTHER"}:
            return None
        event_key = self._safe_key(str(item.get("event_key", "")))
        title = re.sub(r"\s+", " ", str(item.get("title") or "")).strip()[:AI_NEWS_TITLE_MAX_LENGTH]
        summary = re.sub(r"\s+", " ", str(item.get("summary") or "")).strip()[:AI_NEWS_SUMMARY_MAX_LENGTH]
        indexes = sorted({int(i) for i in item.get("source_indexes", [])
                          if str(i).lstrip("-").isdigit() and 0 <= int(i) < source_count})
        if not event_key or not title or not indexes:
            log.warning("소재 후보를 건너뜁니다 - 필수 값 누락 eventKey=%s title=%s indexes=%s",
                        event_key, title, indexes)
            return None
        try:
            confidence = min(1.0, max(0.0, float(item.get("confidence") or 0)))
        except (TypeError, ValueError):
            confidence = 0.0
        return NewsLead(
            category=category,
            title=title,
            summary=summary,
            event_key=event_key,
            source_indexes=indexes,
            confidence=confidence,
            model_name=self.classifier_model,
        )

    def _request_json(self, model: str, system: str, payload: dict[str, Any],
                      response_schema: dict[str, Any]) -> dict[str, Any]:
        user_text = json.dumps(payload, ensure_ascii=False)
        last_error: json.JSONDecodeError | None = None
        last_text = ""
        for attempt in range(2):
            config_kwargs: dict[str, Any] = {
                "system_instruction": (
                    system + ("\n반드시 스키마에 맞는 완전한 JSON 객체를 반환한다." if attempt else "")
                ),
                "response_mime_type": "application/json",
                "response_json_schema": response_schema,
                "temperature": 0.1,
            }
            response = self.client.models.generate_content(
                model=model,
                contents=user_text,
                config=types.GenerateContentConfig(**config_kwargs),
            )
            last_text = response.text or "{}"
            usage = getattr(response, "usage_metadata", None)
            input_tokens = int(getattr(usage, "prompt_token_count", 0) or 0)
            output_tokens = (
                int(getattr(usage, "candidates_token_count", 0) or 0)
                + int(getattr(usage, "thoughts_token_count", 0) or 0)
            )
            self.usage.add_text(model, input_tokens, output_tokens)
            try:
                return self._parse_json(last_text)
            except json.JSONDecodeError as error:
                last_error = error
        raise RuntimeError(
            f"Gemini JSON 응답 파싱에 2회 실패했습니다: {last_error}; 응답={last_text[:500]}"
        ) from last_error

    @staticmethod
    def _parse_json(text: str) -> dict[str, Any]:
        value = text.strip()
        if value.startswith("```"):
            value = re.sub(r"^```(?:json)?\s*|\s*```$", "", value, flags=re.IGNORECASE)
        parsed = json.loads(value)
        if not isinstance(parsed, dict):
            raise RuntimeError("Gemini JSON 응답이 객체가 아닙니다.")
        return parsed

    @staticmethod
    def _safe_key(value: str) -> str:
        return re.sub(r"[^a-z0-9가-힣]+", "-", value.lower()).strip("-")
