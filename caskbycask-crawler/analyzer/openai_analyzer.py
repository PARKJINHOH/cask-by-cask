"""OpenAI GPT-4o-mini 기반 분석기.

모델은 OPENAI_MODEL 로 교체 가능(예: gpt-4o). OpenAI 호환 게이트웨이는
OPENAI_BASE_URL 로 지정. 다른 벤더로 갈아탈 땐 analyze() 시그니처를 유지한
새 analyzer 파일을 추가하면 된다(= 유연한 교체 지점).
"""
from __future__ import annotations

import json
import time

from openai import OpenAI

from analyzer.prompts import SYSTEM_PROMPT, build_user_text
from logger import get_logger
from models import AnalysisResult, PostDetail

log = get_logger("analyzer")

_HIGH_DEMAND_RETRIES_PER_PHASE = 3
_HIGH_DEMAND_RETRY_DELAY_SEC = 30
_HIGH_DEMAND_COOLDOWN_SEC = 60


def _is_high_demand_503(error: Exception) -> bool:
    message = str(error).lower()
    status_code = getattr(error, "status_code", None)
    return (
        (status_code == 503 or "503" in message)
        and ("unavailable" in message or "high demand" in message)
    )


class OpenAIAnalyzer:
    def __init__(self, api_key: str, model: str = "gpt-4o-mini", base_url: str = "", notifier=None):
        self.model = model
        self.notifier = notifier
        self.client = OpenAI(
            api_key=api_key,
            base_url=base_url or "https://api.openai.com/v1",
            max_retries=0,
        )

    def _alert_api_error(self, post_key: str, error: Exception) -> None:
        if self.notifier is None:
            return
        status = getattr(error, "status_code", None)
        message = str(error)
        if status in (401, 403):
            self.notifier.danger_once(
                "openai_auth",
                "크롤러 OpenAI API 인증 실패",
                f"post={post_key}, status={status}. OPENAI_API_KEY 값을 확인하세요.",
            )
        elif status == 429:
            self.notifier.warning_once(
                "openai_rate_limit",
                "크롤러 OpenAI API 사용량 제한",
                f"post={post_key}, status=429. OpenAI quota/rate limit 과 실행 주기를 확인하세요.",
            )
        else:
            self.notifier.warning_once(
                f"openai_api:{status or 'unknown'}",
                "크롤러 OpenAI 분석 실패",
                f"post={post_key}, status={status or '-'}, error={message[:500]}",
            )

    def _create_completion(self, content_parts: list[dict], post_key: str):
        first_phase_retries = _HIGH_DEMAND_RETRIES_PER_PHASE
        second_phase_retries = _HIGH_DEMAND_RETRIES_PER_PHASE
        cooldown_done = False

        while True:
            try:
                return self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": content_parts},
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.1,
                    max_tokens=700,
                )
            except Exception as e:  # noqa: BLE001
                if not _is_high_demand_503(e):
                    raise

                if first_phase_retries > 0:
                    retry_no = _HIGH_DEMAND_RETRIES_PER_PHASE - first_phase_retries + 1
                    log.warning(
                        "OpenAI/Gemini 503 high demand %s: %d초 후 재시도(%d/%d)",
                        post_key,
                        _HIGH_DEMAND_RETRY_DELAY_SEC,
                        retry_no,
                        _HIGH_DEMAND_RETRIES_PER_PHASE,
                    )
                    first_phase_retries -= 1
                    time.sleep(_HIGH_DEMAND_RETRY_DELAY_SEC)
                    continue

                if not cooldown_done:
                    log.warning(
                        "OpenAI/Gemini 503 high demand %s: 1차 재시도 실패, %d초 후 2차 재시도 시작",
                        post_key,
                        _HIGH_DEMAND_COOLDOWN_SEC,
                    )
                    cooldown_done = True
                    time.sleep(_HIGH_DEMAND_COOLDOWN_SEC)

                if second_phase_retries > 0:
                    retry_no = _HIGH_DEMAND_RETRIES_PER_PHASE - second_phase_retries + 1
                    if retry_no > 1:
                        log.warning(
                            "OpenAI/Gemini 503 high demand %s: %d초 후 2차 재시도(%d/%d)",
                            post_key,
                            _HIGH_DEMAND_RETRY_DELAY_SEC,
                            retry_no,
                            _HIGH_DEMAND_RETRIES_PER_PHASE,
                        )
                        time.sleep(_HIGH_DEMAND_RETRY_DELAY_SEC)
                    else:
                        log.warning(
                            "OpenAI/Gemini 503 high demand %s: 2차 재시도 시작(%d/%d)",
                            post_key,
                            retry_no,
                            _HIGH_DEMAND_RETRIES_PER_PHASE,
                        )
                    second_phase_retries -= 1
                    continue

                raise

    def analyze(self, detail: PostDetail, image_data_urls: list[str]) -> AnalysisResult | None:
        """게시글(텍스트+이미지)을 분석해 AnalysisResult 반환. API/파싱 실패 시 None.

        is_deal/confidence_score 기준의 채택 게이팅은 호출부(main)가 담당한다.
        """
        user_text = build_user_text(title=detail.raw.title, content=detail.content_text)

        content_parts: list[dict] = [{"type": "text", "text": user_text}]
        for data_url in image_data_urls:
            content_parts.append({
                "type": "image_url",
                "image_url": {"url": data_url, "detail": "low"},
            })

        try:
            resp = self._create_completion(content_parts, detail.raw.key)
        except Exception as e:  # noqa: BLE001
            log.error("OpenAI 호출 실패 %s: %s", detail.raw.key, e)
            self._alert_api_error(detail.raw.key, e)
            return None

        raw_content = resp.choices[0].message.content or ""
        try:
            data = json.loads(raw_content)
        except json.JSONDecodeError:
            log.warning("모델 JSON 파싱 실패 %s, 원문=%s", detail.raw.key, raw_content[:200])
            if self.notifier is not None:
                self.notifier.warning_once(
                    "openai_json_parse",
                    "크롤러 OpenAI 응답 파싱 실패",
                    f"post={detail.raw.key}, model={self.model}, content={raw_content[:300]}",
                )
            return None

        return AnalysisResult.from_model_json(data)
