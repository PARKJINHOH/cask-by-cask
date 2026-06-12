"""분석 결과를 DrinkIndex 백엔드(Spring Boot) 내부 API 로 업로드.

── 백엔드가 구현해야 할 수신 계약 (이 크롤러가 보내는 요청) ─────────────
  POST  {DRINKINDEX_API_URL}/api/internal/hotdeals
  Header: X-Internal-Api-Key: {DRINKINDEX_INTERNAL_KEY}
          Content-Type: application/json
  Body  : 아래 build_payload() 가 만드는 JSON
  응답  : 2xx = 정상 접수, 409 = 이미 등록된 sourcePostId(멱등, 정상취급)
  저장  : is_visible=false, status=PENDING 으로 관리자 검토 큐에 적재
─────────────────────────────────────────────────────────────────────────
"""
from __future__ import annotations

from datetime import datetime, timezone

import requests

from logger import get_logger
from models import AnalysisResult, PostDetail

log = get_logger("uploader")

_MAX_CONTENT = 4000


def build_payload(detail: PostDetail, analysis: AnalysisResult) -> dict:
    raw = detail.raw
    content = (detail.content_text or "")[:_MAX_CONTENT]
    return {
        "source": {
            "site": raw.site,
            "boardId": raw.board_id,
            "boardName": raw.board_name,
            "postId": raw.post_id,
            "sourcePostId": raw.key,        # 백엔드 멱등키
            "url": raw.url,
            "postedAt": raw.posted_at,
            "title": raw.title,
            "contentText": content,
            "imageUrls": detail.image_urls,  # 원격 원본 URL(서버 미보관, 관리자 교차검증용)
        },
        "analysis": {
            "isHotdeal": analysis.is_hotdeal,
            "isAlcohol": analysis.is_alcohol,
            "confidence": analysis.confidence,
            "category": analysis.category,
            "productName": analysis.product_name,
            "price": analysis.price,
            "originalPrice": analysis.original_price,
            "discountRate": analysis.discount_rate,
            "vendor": analysis.vendor,
            "dealScore": analysis.deal_score,
            "summary": analysis.summary,
            "reason": analysis.reason,
        },
        "collectedAt": datetime.now(timezone.utc).isoformat(),
    }


class ApiUploader:
    def __init__(self, api_url: str, internal_key: str, timeout: int = 15):
        self.endpoint = f"{api_url}/api/internal/hotdeals"
        self.internal_key = internal_key
        self.timeout = timeout

    def upload(self, detail: PostDetail, analysis: AnalysisResult) -> bool:
        payload = build_payload(detail, analysis)
        try:
            resp = requests.post(
                self.endpoint,
                json=payload,
                headers={
                    "X-Internal-Api-Key": self.internal_key,
                    "Content-Type": "application/json",
                },
                timeout=self.timeout,
            )
        except requests.RequestException as e:
            log.error("업로드 네트워크 오류 %s: %s", detail.raw.key, e)
            return False

        if resp.status_code == 409:
            log.info("이미 등록됨(409) %s — 정상 취급", detail.raw.key)
            return True
        if 200 <= resp.status_code < 300:
            return True

        log.error("업로드 실패 %s: %s %s", detail.raw.key, resp.status_code, resp.text[:200])
        return False
