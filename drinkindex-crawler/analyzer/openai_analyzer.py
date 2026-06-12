"""OpenAI GPT-4o-mini 기반 분석기.

모델은 OPENAI_MODEL 로 교체 가능(예: gpt-4o). OpenAI 호환 게이트웨이는
OPENAI_BASE_URL 로 지정. 다른 벤더로 갈아탈 땐 analyze() 시그니처를 유지한
새 analyzer 파일을 추가하면 된다(= 유연한 교체 지점).
"""
from __future__ import annotations

import json

from openai import OpenAI

from analyzer.prompts import SYSTEM_PROMPT, build_user_text
from logger import get_logger
from models import AnalysisResult, PostDetail

log = get_logger("analyzer")


class OpenAIAnalyzer:
    def __init__(self, api_key: str, model: str = "gpt-4o-mini", base_url: str = ""):
        self.model = model
        self.client = OpenAI(api_key=api_key, base_url=base_url or None)

    def analyze(self, detail: PostDetail, image_data_urls: list[str]) -> AnalysisResult:
        user_text = build_user_text(
            title=detail.raw.title,
            board_name=detail.raw.board_name,
            content=detail.content_text,
        )

        content_parts: list[dict] = [{"type": "text", "text": user_text}]
        for data_url in image_data_urls:
            content_parts.append({
                "type": "image_url",
                "image_url": {"url": data_url, "detail": "low"},
            })

        resp = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": content_parts},
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=700,
        )
        raw_content = resp.choices[0].message.content or "{}"
        try:
            data = json.loads(raw_content)
        except json.JSONDecodeError:
            log.warning("모델 JSON 파싱 실패, 원문=%s", raw_content[:200])
            data = {}

        return AnalysisResult.from_model_json(data)
