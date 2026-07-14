"""분석 결과를 CaskByCask 백엔드(Spring Boot) 내부 API 로 업로드.

── 백엔드가 구현해야 할 수신 계약 (이 크롤러가 보내는 요청) ─────────────
  POST  {CASKBYCASK_API_URL}/api/internal/deals
  Header: X-Internal-Key: {CASKBYCASK_INTERNAL_KEY}
          Content-Type: application/json
  Body  : 아래 build_payload() 가 만드는 flat JSON
  응답  : 2xx = 정상 접수, 409 = 이미 등록된 sourceUrl(멱등, 정상취급)
  저장  : is_visible=false, status=PENDING 으로 관리자 검토 큐에 적재
─────────────────────────────────────────────────────────────────────────
"""
from __future__ import annotations

import time
from datetime import datetime, timezone

import requests

from filters.deal_policy import normalize_analysis_result
from logger import get_logger
from models import AnalysisResult, PostDetail

log = get_logger("uploader")

_MAX_RETRY = 3
_RETRY_INTERVAL_SEC = 5


def build_payload(detail: PostDetail, analysis: AnalysisResult) -> dict:
    raw = detail.raw
    analysis = normalize_analysis_result(analysis)
    return {
        "sourceUrl": raw.url,
        "sourceSite": raw.site.upper(),          # DCINSIDE | NAVER_CAFE
        "drinkName": analysis.drink_name,
        "drinkCategory": analysis.drink_category,
        "volumeMl": analysis.volume_ml,
        "originalPrice": analysis.original_price,
        "dealPrice": analysis.deal_price,
        "discountRate": analysis.discount_rate,
        "currency": analysis.currency,
        "seller": analysis.seller,
        "dealCondition": analysis.deal_condition,
        "expiryInfo": analysis.expiry_info,
        "confidenceScore": analysis.confidence_score,
        "summaryKo": analysis.summary_ko,
        "crawledAt": datetime.now(timezone.utc).isoformat(),
    }


class ApiUploader:
    def __init__(self, api_url: str, internal_key: str, timeout: int = 15, notifier=None):
        self.endpoint = f"{api_url}/api/internal/deals"
        self.headers = {
            "X-Internal-Key": internal_key,
            "Content-Type": "application/json",
        }
        self.timeout = timeout
        self.notifier = notifier

    def _alert_once(self, key: str, summary: str, body: str, danger: bool = False) -> None:
        if self.notifier is None:
            return
        if danger:
            self.notifier.danger_once(key, summary, body)
        else:
            self.notifier.warning_once(key, summary, body)

    def send(self, payload: dict) -> bool:
        """업로드. 실패 시 최대 3회(5초 간격) 재시도. 409(중복)는 재시도 없이 성공 처리."""
        source_url = payload.get("sourceUrl", "?")

        for attempt in range(1, _MAX_RETRY + 1):
            try:
                resp = requests.post(
                    self.endpoint, json=payload, headers=self.headers, timeout=self.timeout,
                )
            except requests.RequestException as e:
                log.warning("업로드 네트워크 오류(%d/%d) %s: %s", attempt, _MAX_RETRY, source_url, e)
                if attempt < _MAX_RETRY:
                    time.sleep(_RETRY_INTERVAL_SEC)
                    continue
                log.error("업로드 최종 실패 %s", source_url)
                self._alert_once(
                    "backend_upload_network",
                    "크롤러 백엔드 업로드 실패",
                    f"{self.endpoint} 네트워크 오류: {e}. source={source_url}",
                )
                return False

            if resp.status_code == 409:
                log.info("이미 등록됨(409) %s — 정상 취급", source_url)
                return True
            if 200 <= resp.status_code < 300:
                log.info("업로드 성공 %s", source_url)
                return True
            if resp.status_code in (401, 403):
                log.error("업로드 인증 실패 %s: %s %s", source_url, resp.status_code, resp.text[:200])
                self._alert_once(
                    "backend_upload_auth",
                    "크롤러 백엔드 API 인증 실패",
                    (
                        f"{self.endpoint} 응답 status={resp.status_code}. "
                        "CASKBYCASK_INTERNAL_KEY 가 백엔드 api.env 값과 일치하는지 확인하세요."
                    ),
                    danger=True,
                )
                return False

            log.warning(
                "업로드 실패(%d/%d) %s: %s %s",
                attempt, _MAX_RETRY, source_url, resp.status_code, resp.text[:200],
            )
            if attempt < _MAX_RETRY:
                time.sleep(_RETRY_INTERVAL_SEC)

        log.error("업로드 최종 실패 %s", source_url)
        self._alert_once(
            f"backend_upload_status:{resp.status_code}",
            "크롤러 백엔드 업로드 실패",
            f"{self.endpoint} 응답 status={resp.status_code}, source={source_url}, body={resp.text[:300]}",
        )
        return False

    def upload(self, detail: PostDetail, analysis: AnalysisResult) -> bool:
        return self.send(build_payload(detail, analysis))
