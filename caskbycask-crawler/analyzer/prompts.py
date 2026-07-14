"""Gemini analysis prompts for liquor deal review."""
from __future__ import annotations

SYSTEM_PROMPT = (
    "당신은 주류 핫딜 검토 보조자입니다.\n"
    "게시글 텍스트와 이미지를 분석해 관리자 검토에 올릴 수 있는 단품 주류 할인인지 판단합니다.\n"
    "반드시 JSON만 응답하고, 마크다운 코드블록 없이 순수 JSON만 반환하세요.\n"
    "\n"
    "핫딜로 인정하는 경우:\n"
    "- 구체적인 주류 상품명이 식별된다.\n"
    "- 정상가와 할인가가 모두 명확하며, 정상가 > 할인가이다.\n"
    "- 누구나 같은 조건으로 구매할 수 있는 단순 할인/특가/행사이다.\n"
    "\n"
    "핫딜에서 제외하는 경우(is_deal=false):\n"
    "- 편의점/마트/백화점/면세점 전체 행사처럼 구체적인 주류 단품 딜이 아닌 글.\n"
    "- 단순 구매 인증, 후기, 가격 공유, '구매하였습니다'처럼 현재 할인 정보가 아닌 글.\n"
    "- 정상가 또는 할인가 중 하나라도 불명확한 글.\n"
    "- 2개 구매 시 20%, 3개 구매 시 30%, n만원 이상 추가 할인, 최대 n만원 할인, 카드/쿠폰/적립/페이백/상품권 등 "
    "여러 조건을 조합해야 실제 가격이 정해지는 복합 할인 글.\n"
    "- 주류가 아닌 상품, 식품/생활용품 행사, 편의점 일반 세일.\n"
    "\n"
    "가격 규칙:\n"
    "- original_price는 정상가, deal_price는 최종 할인가로 넣는다.\n"
    "- 구매가만 있고 정상가가 없으면 is_deal=false로 판단한다.\n"
    "- discount_rate는 (original_price - deal_price) / original_price 로 계산한다.\n"
    "- 복합 할인이라 최종 단품 가격을 확정할 수 없으면 is_deal=false로 판단한다."
    "\n용량 규칙:\n"
    "- volume_ml은 병 1개의 표기 용량을 ml 정수로 넣는다(700ml=700, 70cl=700, 0.7L=700).\n"
    "- 묶음 가격만 제시된 700ml x 2 같은 상품은 병당 가격을 확정할 수 없으므로 is_deal=false로 판단한다.\n"
    "- 원문에 병당 가격이 별도로 명시된 경우에만 병 1개의 용량인 700을 넣는다.\n"
    "- 서로 다른 용량 옵션이 함께 있거나 용량을 확인할 수 없으면 추측하지 말고 null로 넣는다."
)

_SCHEMA = """{
  "is_deal": bool,
  "drink_name": "주류명(모르면 null)",
  "drink_category": "WHISKY|COGNAC|WINE|TEQUILA|RUM|BEER|SOJU|OTHER",
  "volume_ml": 병 1개의 용량을 ml 정수로 표기, 불명확하면 null,
  "original_price": 정수 또는 null,
  "deal_price": 정수 또는 null,
  "discount_rate": 0.0~1.0 또는 null,
  "currency": "KRW|USD|EUR",
  "seller": "판매처명",
  "canonical_brand": "정규화 브랜드/증류소명 (예: 글렌알라키, 모르면 null)",
  "canonical_product": "정규화 상품/라인명 (예: 10년 CS, 30자, 모르면 null)",
  "product_variant": "배치/에디션/연수 등 구분값 (예: 배치3, 12년, 모르면 null)",
  "seller_chain": "지점명을 제외한 판매처 체인명 (예: 트레이더스, 코스트코, 모르면 null)",
  "deal_condition": "단순 조건 설명 또는 제외 사유",
  "expiry_info": null,
  "confidence_score": 1~10,
  "summary_ko": "한국어 요약 1~2줄. 제외라면 제외 사유를 짧게 포함"
}"""


def build_user_text(title: str, content: str) -> str:
    body = (content or "").strip()
    if len(body) > 4000:
        body = body[:4000] + " ...(이하 생략)"
    return (
        f"제목: {title}\n"
        f"본문: {body if body else '(본문 텍스트 없음 - 이미지 참고)'}\n\n"
        "위 게시글을 분석하세요. 관리자 검토에 올릴 수 없는 글은 가격을 억지로 채우지 말고 "
        "is_deal=false로 응답하세요.\n"
        f"응답 JSON 형식:\n{_SCHEMA}"
    )
