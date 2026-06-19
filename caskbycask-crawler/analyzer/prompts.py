"""OpenAI 분석 프롬프트 템플릿. (로직과 분리해 튜닝 용이)"""
from __future__ import annotations

SYSTEM_PROMPT = (
    "당신은 주류 핫딜 분석 전문가입니다.\n"
    "게시글 텍스트와 이미지를 분석하여 주류 할인/핫딜 정보를 추출합니다.\n"
    "반드시 JSON만 응답하고 마크다운 코드블록 없이 순수 JSON만 반환하세요."
)

# 모델에 요구하는 JSON 스키마 (유저 프롬프트에 포함)
_SCHEMA = """{
  "is_deal": bool,
  "drink_name": "주류명 (모르면 null)",
  "drink_category": "WHISKY|COGNAC|WINE|TEQUILA|RUM|BEER|SOJU|OTHER",
  "original_price": 정수 또는 null,
  "deal_price": 정수 또는 null,
  "discount_rate": 0.0~1.0 또는 null,
  "currency": "KRW|USD|EUR",
  "seller": "판매처명",
  "canonical_brand": "정규화 브랜드/증류소명 (예: 글렌알라키, 모르면 null)",
  "canonical_product": "정규화 상품/라인명 (예: 신테이스, 30년, 모르면 null)",
  "product_variant": "배치/에디션/연수 등 구분값 (예: 배치3, 배치4, 30년, 모르면 null)",
  "seller_chain": "지점명을 제외한 판매처 체인명 (예: 트레이더스, 코스트코, 모르면 null)",
  "deal_condition": "조건 설명 또는 null",
  "expiry_info": "기간 정보 또는 null",
  "confidence_score": 1~10,
  "summary_ko": "한국어 요약 1~2줄"
}"""


def build_user_text(title: str, content: str) -> str:
    body = (content or "").strip()
    if len(body) > 4000:
        body = body[:4000] + " …(이하 생략)"
    return (
        f"제목: {title}\n"
        f"본문: {body if body else '(본문 텍스트 없음 — 이미지 참고)'}\n\n"
        f"위 게시글을 분석하여 다음 JSON 형식으로 응답하세요:\n{_SCHEMA}"
    )
