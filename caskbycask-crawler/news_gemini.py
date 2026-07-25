from __future__ import annotations

import base64
import html
import json
import re
from pathlib import Path
from typing import Any

from google import genai
from google.genai import types

from news_models import DraftArticle, SearchSource, UsageAccumulator
from news_prompts import (
    AI_NEWS_MIN_TEXT_LENGTH,
    AI_NEWS_RECOMMENDED_TEXT_LENGTH,
    AI_NEWS_TITLE_MAX_LENGTH,
    AI_NEWS_WRITING_PROMPT,
)


ARTICLE_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "content_html": {"type": "string"},
        "confidence": {"type": "number"},
        "semantic_fingerprint": {"type": "string"},
        "image_prompt": {"type": "string"},
        "hashtags": {"type": "array", "items": {"type": "string"}, "maxItems": 10},
    },
    "required": ["title", "content_html", "confidence", "semantic_fingerprint", "image_prompt", "hashtags"],
}

REQUESTED_ARTICLE_SCHEMA = {
    "type": "object",
    "properties": {
        **ARTICLE_SCHEMA["properties"],
        "category": {"type": "string", "enum": ["WHISKY", "WINE", "COGNAC", "OTHER"]},
    },
    "required": [*ARTICLE_SCHEMA["required"], "category"],
}

RELEASE_CLASSIFICATION_SCHEMA = {
    "type": "object",
    "properties": {
        "candidates": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "category": {"type": "string", "enum": ["WHISKY", "WINE", "COGNAC", "OTHER"]},
                    "event_key": {"type": "string"},
                    "summary": {"type": "string"},
                    "source_indexes": {"type": "array", "items": {"type": "integer"}},
                    "confidence": {"type": "number"},
                },
                "required": ["category", "event_key", "summary", "source_indexes", "confidence"],
            },
        },
    },
    "required": ["candidates"],
}

TIP_DUPLICATE_SCHEMA = {
    "type": "object",
    "properties": {
        "duplicate": {"type": "boolean"},
        "semantic_similarity": {"type": "number"},
        "matched_article_id": {"type": "integer"},
        "reason": {"type": "string"},
    },
    "required": ["duplicate", "semantic_similarity", "reason"],
}

TOPIC_SUGGESTION_SCHEMA = {
    "type": "object",
    "properties": {
        "topics": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "normalized_key": {"type": "string"},
                    "category": {"type": "string", "enum": ["WHISKY", "WINE", "COGNAC", "OTHER"]},
                    "aliases": {"type": "string"},
                },
                "required": ["title", "normalized_key", "category", "aliases"],
            },
        },
    },
    "required": ["topics"],
}


class GeminiNewsWriter:
    def __init__(self, api_key: str, classifier_model: str, writer_model: str,
                 image_model: str, image_estimated_cost_usd: float = 0.0,
                 image_generation_enabled: bool = False):
        self.client = genai.Client(api_key=api_key)
        self.classifier_model = classifier_model
        self.writer_model = writer_model
        self.image_model = image_model
        self.image_estimated_cost_usd = image_estimated_cost_usd
        self.image_generation_enabled = image_generation_enabled
        self.usage = UsageAccumulator()
        self._image_unavailable_reason: str | None = None

    def classify_releases(self, sources: list[SearchSource], max_candidates: int,
                          category_ratios: dict[str, int] | None = None) -> list[dict[str, Any]]:
        if not sources or max_candidates <= 0:
            return []
        compact = [{
            "index": i,
            "title": s.title,
            "domain": s.domain,
            "published_at": s.published_at,
            "text": s.content[:2500],
        } for i, s in enumerate(sources)]
        system = """
주류 뉴스 후보를 선별한다. JSON {"candidates": [...]}만 반환하라.
위스키·와인·꼬냑의 실제 신제품 출시, 출시 예정, 한국 출시·수입 소식만 후보로 삼는다.
단순 할인, 개인 리뷰, 질문, 루머, 과거 재탕, 근거가 없는 커뮤니티 추측은 제외한다.
같은 제품/사건을 다룬 여러 결과는 하나로 묶는다.
후보가 충분하면 입력된 target_category_ratio를 장기 목표 비중으로 반영한다.
각 후보 필드: category(WHISKY/WINE/COGNAC/OTHER), event_key(영문 소문자 안정 키),
summary, source_indexes(서로 다른 근거 인덱스), confidence(0~1).
""".strip()
        result = self._request_json(self.classifier_model, system, {
            "max_candidates": max(0, max_candidates),
            "target_category_ratio": category_ratios or {"WHISKY": 60, "WINE": 20, "COGNAC": 20},
            "sources": compact,
        }, RELEASE_CLASSIFICATION_SCHEMA)
        candidates = result.get("candidates", []) if isinstance(result, dict) else []
        cleaned: list[dict[str, Any]] = []
        for item in candidates[:max_candidates]:
            category = str(item.get("category", "")).upper()
            indexes = [int(i) for i in item.get("source_indexes", []) if str(i).isdigit() and int(i) < len(sources)]
            event_key = self._safe_key(str(item.get("event_key", "")))
            if category not in {"WHISKY", "WINE", "COGNAC", "OTHER"} or not indexes or not event_key:
                continue
            cleaned.append({**item, "category": category, "source_indexes": sorted(set(indexes)), "event_key": event_key})
        return cleaned

    def write_release(self, candidate: dict[str, Any], sources: list[SearchSource]) -> DraftArticle:
        selected = [sources[i] for i in candidate["source_indexes"]]
        evidence = [{"index": i, "title": s.title, "domain": s.domain, "text": s.content[:6000]}
                    for i, s in zip(candidate["source_indexes"], selected)]
        prompt = {
            "task": "출시 소식 원고 작성과 최종 사실 검증",
            "candidate": candidate,
            "evidence": evidence,
            "output_fields": ["title", "content_html", "confidence", "semantic_fingerprint", "image_prompt", "hashtags"],
            "image_prompt_rule": "브랜드 로고나 실제 라벨을 만들지 않는 가로형 비브랜드 에디토리얼 이미지용 영문 프롬프트",
        }
        result = self._request_article(prompt)
        return self._draft_from_result("RELEASE_NEWS", candidate["category"],
                                       f"release:{candidate['event_key']}", None,
                                       candidate["source_indexes"], result)

    def write_requested_release(self, request: dict[str, Any], sources: list[SearchSource]) -> DraftArticle:
        evidence = [{"index": i, "title": source.title, "url": source.url,
                     "domain": source.domain, "text": source.content[:6000]}
                    for i, source in enumerate(sources)]
        prompt = {
            "task": "관리자가 우선 요청한 출시·국내 소식 원고 작성과 사실 검증",
            "admin_prompt": request["prompt"],
            "evidence": evidence,
            "rules": [
                "관리자 요청 의도를 따르되 제공된 근거에 없는 사실은 만들지 않는다.",
                "주종을 WHISKY, WINE, COGNAC, OTHER 중 하나로 판단한다.",
                "결과는 자동 발행하지 않고 관리자 임시저장 원고로 만든다.",
            ],
        }
        result = self._request_json(self.writer_model, AI_NEWS_WRITING_PROMPT,
                                    prompt, REQUESTED_ARTICLE_SCHEMA)
        category = str(result.get("category") or "").upper()
        if self._plain_text_length(str(result.get("content_html") or "")) < AI_NEWS_MIN_TEXT_LENGTH:
            result = self._request_article({**prompt, "category": category,
                                            "revision_request": "본문 최소 분량과 SEO 규칙을 충족하도록 보강한다."})
        return self._draft_from_result(
            "RELEASE_NEWS", category, f"admin-request:{request['id']}", None,
            list(range(len(sources))), result,
        )

    def write_tip(self, topic: dict[str, Any], sources: list[SearchSource]) -> DraftArticle:
        evidence = [{"index": i, "title": s.title, "domain": s.domain, "text": s.content[:6000]}
                    for i, s in enumerate(sources)]
        prompt = {
            "task": "오래 읽히는 팁 및 정보 글 작성과 최종 사실 검증",
            "topic": {"title": topic["title"], "aliases": topic.get("aliases"), "category": topic["category"]},
            "evidence": evidence,
            "output_fields": ["title", "content_html", "confidence", "semantic_fingerprint", "image_prompt", "hashtags"],
            "image_prompt_rule": (
                "교육적이고 세련된 가로형 에디토리얼 일러스트. 글자, 로고, 상표, 실제 제품 라벨, "
                "존재하지 않는 병은 표현하지 않는 영문 프롬프트"
            ),
        }
        result = self._request_article(prompt)
        return self._draft_from_result("TIP_INFO", topic["category"],
                                       f"tip:{topic['normalizedKey']}", int(topic["id"]),
                                       list(range(len(sources))), result)

    def rewrite_article(self, article: dict[str, Any]) -> DraftArticle:
        prompt = {
            "task": "기존 AI 소식 원고 재작성",
            "article_type": article["articleType"],
            "category": article["category"],
            "original_article": {
                "title": article["title"],
                "content_html": str(article["content"])[:30000],
                "semantic_fingerprint": article.get("semanticFingerprint"),
                "hashtags": article.get("hashtags") or [],
            },
            "additional_instruction_for_this_article_only": article["additionalPrompt"],
            "rules": [
                "추가 지시는 이 원고 재작성에만 적용하고 다른 원고의 작성 기준으로 일반화하지 않는다.",
                "기존 원고의 사실관계를 유지하면서 추가 지시를 충실히 반영한다.",
                "확인되지 않은 새로운 사실, 출처, 수치 또는 인용을 만들어내지 않는다.",
                "완성된 전체 제목과 전체 HTML 본문을 반환한다.",
            ],
            "output_fields": ["title", "content_html", "confidence", "semantic_fingerprint", "image_prompt", "hashtags"],
            "image_prompt_rule": "기존 대표 이미지는 유지하므로 일반적인 비브랜드 영문 프롬프트만 반환",
        }
        result = self._request_article(prompt)
        return self._draft_from_result(
            article["articleType"], article["category"], f"rewrite:{article['articleId']}",
            None, [], result,
        )

    def judge_tip_duplicate(self, topic: dict[str, Any], draft: DraftArticle,
                            corpus: list[dict[str, Any]]) -> dict[str, Any]:
        if not corpus or topic.get("allowRepublish"):
            return {"duplicate": False, "semanticSimilarity": 0.0,
                    "matchedArticleId": None, "reason": "비교 대상 없음 또는 재발행 허용"}
        system = """
주류 팁·정보 글의 영구 중복 여부를 최종 판정한다. JSON 객체 하나만 반환한다.
먼저 새 글의 제목·소제목·핵심 질문 지문을 과거 전체 글과 의미상 비교하고,
표현이나 제목만 다르지만 독자가 얻게 될 핵심 답이 같은 글도 중복으로 본다.
큰 주제 안에서 다루는 핵심 질문과 교육 목표가 명확히 다를 때만 비중복이다.
결과 형식은 {"duplicate":true|false,"semantic_similarity":0~1,
"matched_article_id":숫자 또는 null,"reason":"한국어 판정 근거"}이다.
""".strip()
        compact_corpus = [{
            "article_id": item.get("articleId"),
            "title": item.get("title"),
            "semantic_fingerprint": item.get("semanticFingerprint"),
            "topic_key": item.get("topicKey"),
            "topic_title": item.get("topicTitle"),
            "topic_aliases": item.get("topicAliases"),
            "outline_and_core_questions": str(item.get("contentOutline") or "")[:1000],
        } for item in corpus]
        result = self._request_json(self.classifier_model, system, {
            "new_topic": {
                "title": topic.get("title"), "normalized_key": topic.get("normalizedKey"),
                "aliases": topic.get("aliases"),
            },
            "new_article": {
                "title": draft.title,
                "semantic_fingerprint": draft.semantic_fingerprint,
                "content_html": draft.content_html[:6000],
            },
            "published_or_deleted_tip_history": compact_corpus,
        }, TIP_DUPLICATE_SCHEMA)
        try:
            similarity = min(1.0, max(0.0, float(result.get("semantic_similarity") or 0)))
        except (TypeError, ValueError):
            similarity = 0.0
        matched = result.get("matched_article_id")
        try:
            matched = int(matched) if matched is not None else None
        except (TypeError, ValueError):
            matched = None
        return {
            "duplicate": bool(result.get("duplicate")),
            "semanticSimilarity": similarity,
            "matchedArticleId": matched,
            "reason": str(result.get("reason") or "AI 최종 중복 판정")[:800],
        }

    def suggest_topics(self, existing_keys: list[str], count: int = 3) -> list[dict[str, str]]:
        system = """
위스키·와인·꼬냑 커뮤니티에 유용한 장기 정보 글 주제를 제안한다.
기존 키와 의미가 같은 주제, 제품 홍보, 건강 효능, 단순 구매 추천은 제외한다.
JSON {"topics":[{"title":"한국어 50자 이하","normalized_key":"영문-소문자-키","category":"WHISKY|WINE|COGNAC|OTHER","aliases":"쉼표 구분"}]}만 반환한다.
""".strip()
        result = self._request_json(self.classifier_model, system, {
            "existing_keys": existing_keys, "count": max(1, min(5, count)),
        }, TOPIC_SUGGESTION_SCHEMA)
        topics = []
        for item in result.get("topics", [])[:count]:
            category = str(item.get("category", "")).upper()
            key = self._safe_key(str(item.get("normalized_key", "")))
            title = str(item.get("title", "")).strip()[:50]
            if category in {"WHISKY", "WINE", "COGNAC", "OTHER"} and key and title and key not in existing_keys:
                topics.append({"title": title, "normalizedKey": key, "category": category,
                               "aliases": str(item.get("aliases") or "")})
        return topics

    def generate_image(self, prompt: str, output_dir: Path, stem: str) -> Path:
        if not self.image_generation_enabled:
            raise RuntimeError("AI 이미지 생성이 운영 설정에서 비활성화되어 있습니다.")
        image_unavailable_reason = getattr(self, "_image_unavailable_reason", None)
        if image_unavailable_reason:
            raise RuntimeError(image_unavailable_reason)
        output_dir.mkdir(parents=True, exist_ok=True)
        safe_prompt = (
            prompt.strip() + "\nLandscape 3:2 editorial illustration, no text, no logo, no trademark, "
            "no branded bottle, no recognizable product label."
        )
        try:
            result = self.client.interactions.create(
                model=self.image_model,
                input=safe_prompt,
                response_format={
                    "type": "image",
                    "mime_type": "image/jpeg",
                    "aspect_ratio": "3:2",
                    "image_size": "1K",
                },
            )
        except Exception as error:
            message = str(error)
            if "limit: 0" in message or "free_tier_requests" in message:
                self._image_unavailable_reason = (
                    f"{self.image_model}은 현재 프로젝트의 무료 티어 이미지 할당량이 0입니다. "
                    "Google AI Studio 결제를 활성화해야 합니다."
                )
            raise
        output_image = getattr(result, "output_image", None)
        encoded = getattr(output_image, "data", None)
        if not encoded:
            raise RuntimeError("Gemini 이미지 응답에 base64 데이터가 없습니다.")
        image_bytes = base64.b64decode(encoded)
        path = output_dir / f"{self._safe_key(stem)[:60] or 'ai-news'}.jpg"
        path.write_bytes(image_bytes)
        self.usage.add_image(self.image_estimated_cost_usd)
        return path

    def _draft_from_result(self, article_type: str, category: str, dedupe_key: str,
                           topic_id: int | None, source_indexes: list[int], result: dict[str, Any]) -> DraftArticle:
        title = re.sub(r"\s+", " ", str(result.get("title") or "")).strip()[:AI_NEWS_TITLE_MAX_LENGTH]
        content = str(result.get("content_html") or "").strip()
        confidence = min(1.0, max(0.0, float(result.get("confidence") or 0)))
        fingerprint = re.sub(r"\s+", " ", str(result.get("semantic_fingerprint") or title).lower()).strip()[:1000]
        image_prompt = str(result.get("image_prompt") or "Elegant educational illustration about spirits").strip()
        hashtags: list[str] = []
        seen_hashtags: set[str] = set()
        raw_hashtags = result.get("hashtags") if isinstance(result.get("hashtags"), list) else []
        for raw_hashtag in raw_hashtags:
            hashtag = re.sub(r"[^\w-]", "", str(raw_hashtag).strip().lstrip("#"), flags=re.UNICODE)[:30]
            hashtag_key = hashtag.casefold()
            if hashtag and hashtag_key not in seen_hashtags:
                seen_hashtags.add(hashtag_key)
                hashtags.append(hashtag)
            if len(hashtags) >= 10:
                break
        if not title or not content:
            raise RuntimeError("AI 원고 응답에 제목 또는 본문이 없습니다.")
        if self._plain_text_length(content) < AI_NEWS_MIN_TEXT_LENGTH:
            raise RuntimeError(f"AI 원고 본문이 최소 {AI_NEWS_MIN_TEXT_LENGTH:,}자보다 짧습니다.")
        return DraftArticle(article_type, category, title, content, dedupe_key, fingerprint,
                            confidence, source_indexes, image_prompt, hashtags=hashtags, topic_id=topic_id,
                            model_name=self.writer_model)

    def _request_article(self, prompt: dict[str, Any]) -> dict[str, Any]:
        result = self._request_json(self.writer_model, AI_NEWS_WRITING_PROMPT, prompt, ARTICLE_SCHEMA)
        if self._plain_text_length(str(result.get("content_html") or "")) >= AI_NEWS_MIN_TEXT_LENGTH:
            return result

        revision_prompt = {
            **prompt,
            "revision_request": (
                f"이전 원고의 순수 본문이 {AI_NEWS_MIN_TEXT_LENGTH:,}자 미만이다. "
                "근거 안에서 설명과 독자에게 유용한 세부 내용을 "
                f"보강하여 순수 텍스트 {AI_NEWS_RECOMMENDED_TEXT_LENGTH}자로 다시 작성하라. "
                "제목과 본문은 SEO 작성 규칙을 지킨다."
            ),
            "previous_draft": {
                "title": result.get("title"),
                "content_html": result.get("content_html"),
            },
        }
        return self._request_json(self.writer_model, AI_NEWS_WRITING_PROMPT, revision_prompt, ARTICLE_SCHEMA)

    @staticmethod
    def _plain_text_length(content_html: str) -> int:
        without_tags = re.sub(r"<[^>]*>", " ", content_html)
        return len(re.sub(r"\s+", "", html.unescape(without_tags)))

    def _request_json(self, model: str, system: str, payload: dict[str, Any],
                      response_schema: dict[str, Any]) -> dict[str, Any]:
        user_text = json.dumps(payload, ensure_ascii=False)
        last_error: json.JSONDecodeError | None = None
        last_text = ""
        for attempt in range(2):
            response = self.client.models.generate_content(
                model=model,
                contents=user_text,
                config=types.GenerateContentConfig(
                    system_instruction=system + ("\n반드시 스키마에 맞는 완전한 JSON 객체를 반환한다." if attempt else ""),
                    response_mime_type="application/json",
                    response_json_schema=response_schema,
                    temperature=0.1,
                ),
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
