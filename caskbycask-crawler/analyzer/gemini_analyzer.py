"""Google Gemini 기반 주류 핫딜 멀티모달 분석기."""
from __future__ import annotations

import json
import base64
import binascii
import re
import time

from google import genai
from google.genai import types

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


class GeminiAnalyzer:
    def __init__(
        self,
        api_key: str,
        model: str = "gemini-3.1-flash-lite",
        notifier=None,
        request_interval_sec: float = 5.0,
    ):
        self.model = model
        self.notifier = notifier
        self.request_interval_sec = max(0.0, request_interval_sec)
        self._last_request_started_at = 0.0
        self.client = genai.Client(api_key=api_key)

    def _alert_api_error(self, post_key: str, error: Exception) -> None:
        if self.notifier is None:
            return
        status = getattr(error, "status_code", None) or getattr(error, "code", None)
        message = str(error)
        if status in (401, 403):
            self.notifier.danger_once(
                "gemini_auth",
                "크롤러 Gemini API 인증 실패",
                f"post={post_key}, status={status}. GEMINI_API_KEY 값을 확인하세요.",
            )
        elif status == 429:
            self.notifier.warning_once(
                "gemini_rate_limit",
                "크롤러 Gemini API 사용량 제한",
                f"post={post_key}, status=429. Google AI Studio quota/rate limit과 실행 주기를 확인하세요.",
            )
        else:
            self.notifier.warning_once(
                f"gemini_api:{status or 'unknown'}",
                "크롤러 Gemini 분석 실패",
                f"post={post_key}, status={status or '-'}, error={message[:500]}",
            )

    def _wait_for_rate_limit(self, post_key: str) -> None:
        if self.request_interval_sec <= 0:
            return

        elapsed = time.monotonic() - self._last_request_started_at
        wait_sec = self.request_interval_sec - elapsed
        if wait_sec > 0:
            log.info("Gemini rate limit %s: %.1f초 대기", post_key, wait_sec)
            time.sleep(wait_sec)

        self._last_request_started_at = time.monotonic()

    def _generate_content(self, content_parts: list, post_key: str):
        first_phase_retries = _HIGH_DEMAND_RETRIES_PER_PHASE
        second_phase_retries = _HIGH_DEMAND_RETRIES_PER_PHASE
        cooldown_done = False

        while True:
            try:
                self._wait_for_rate_limit(post_key)
                return self.client.models.generate_content(
                    model=self.model,
                    contents=content_parts,
                    config=types.GenerateContentConfig(
                        system_instruction=SYSTEM_PROMPT,
                        response_mime_type="application/json",
                        temperature=0.1,
                        max_output_tokens=700,
                    ),
                )
            except Exception as e:  # noqa: BLE001
                if not _is_high_demand_503(e):
                    raise

                if first_phase_retries > 0:
                    retry_no = _HIGH_DEMAND_RETRIES_PER_PHASE - first_phase_retries + 1
                    log.warning(
                        "Gemini 503 high demand %s: %d초 후 재시도(%d/%d)",
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
                        "Gemini 503 high demand %s: 1차 재시도 실패, %d초 후 2차 재시도 시작",
                        post_key,
                        _HIGH_DEMAND_COOLDOWN_SEC,
                    )
                    cooldown_done = True
                    time.sleep(_HIGH_DEMAND_COOLDOWN_SEC)

                if second_phase_retries > 0:
                    retry_no = _HIGH_DEMAND_RETRIES_PER_PHASE - second_phase_retries + 1
                    if retry_no > 1:
                        log.warning(
                            "Gemini 503 high demand %s: %d초 후 2차 재시도(%d/%d)",
                            post_key,
                            _HIGH_DEMAND_RETRY_DELAY_SEC,
                            retry_no,
                            _HIGH_DEMAND_RETRIES_PER_PHASE,
                        )
                        time.sleep(_HIGH_DEMAND_RETRY_DELAY_SEC)
                    else:
                        log.warning(
                            "Gemini 503 high demand %s: 2차 재시도 시작(%d/%d)",
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

        content_parts: list = [user_text]
        for data_url in image_data_urls:
            match = re.fullmatch(r"data:([^;,]+);base64,(.+)", data_url, flags=re.DOTALL)
            if not match:
                log.warning("지원하지 않는 이미지 데이터 URL 제외 post=%s", detail.raw.key)
                continue
            try:
                content_parts.append(types.Part.from_bytes(
                    data=base64.b64decode(match.group(2), validate=True),
                    mime_type=match.group(1),
                ))
            except (ValueError, TypeError, binascii.Error):
                log.warning("이미지 base64 디코딩 실패 post=%s", detail.raw.key)

        try:
            resp = self._generate_content(content_parts, detail.raw.key)
        except Exception as e:  # noqa: BLE001
            log.error("Gemini 호출 실패 %s: %s", detail.raw.key, e)
            self._alert_api_error(detail.raw.key, e)
            return None

        raw_content = resp.text or ""
        try:
            data = json.loads(raw_content)
        except json.JSONDecodeError:
            # 게시글/이미지 품질 문제로 모델이 JSON 외 응답을 줄 수 있음(콘텐츠성 실패).
            # 시스템 장애가 아니므로 Slack 알람은 보내지 않고 로그만 남긴다 → 다음 실행에 재시도.
            log.warning("모델 JSON 파싱 실패 %s, 원문=%s", detail.raw.key, raw_content[:200])
            return None

        # 모델이 객체 대신 배열(예: [{...}])을 줄 때가 있음 → 첫 항목으로 보정.
        if isinstance(data, list):
            data = data[0] if data and isinstance(data[0], dict) else {}
        if not isinstance(data, dict):
            log.warning("모델 응답이 객체가 아님 %s, 원문=%s", detail.raw.key, raw_content[:200])
            return None

        return AnalysisResult.from_model_json(data)
