from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).with_name(".env"))


def _bool(key: str, default: bool = False) -> bool:
    return os.getenv(key, str(default)).strip().lower() in {"1", "true", "yes", "y", "on"}


@dataclass(frozen=True)
class NewsSettings:
    api_url: str = os.getenv("CASKBYCASK_API_URL", "").rstrip("/")
    internal_key: str = os.getenv("CASKBYCASK_INTERNAL_KEY", "")
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", os.getenv("GOOGLE_API_KEY", ""))
    classifier_model: str = os.getenv("AI_NEWS_CLASSIFIER_MODEL", "gemini-3.1-flash-lite")
    max_leads_per_run: int = int(os.getenv("AI_NEWS_MAX_LEADS_PER_RUN", "3"))
    #: 출처당 열어 볼 기사 수. 최신성 판단은 관리자 설정(recentWindowDays)이 하고, 여기서는 요청량만 막는다.
    articles_per_source: int = int(os.getenv("AI_NEWS_ARTICLES_PER_SOURCE", "5"))
    max_articles_per_run: int = int(os.getenv("AI_NEWS_MAX_ARTICLES_PER_RUN", "20"))
    gemini_free_tier: bool = _bool("AI_NEWS_GEMINI_FREE_TIER", True)
    classifier_input_usd_per_million: float = float(os.getenv("AI_NEWS_CLASSIFIER_INPUT_USD_PER_MILLION", "0.25"))
    classifier_output_usd_per_million: float = float(os.getenv("AI_NEWS_CLASSIFIER_OUTPUT_USD_PER_MILLION", "1.50"))
    hard_monthly_cost_usd: float = float(os.getenv("AI_NEWS_GEMINI_HARD_MONTHLY_USD", "0"))
    hard_monthly_tokens: int = int(os.getenv("AI_NEWS_GEMINI_HARD_MONTHLY_TOKENS", "0"))
    http_timeout_sec: int = int(os.getenv("HTTP_TIMEOUT_SEC", "30"))
    news_log_path: str = os.getenv("AI_NEWS_LOG_PATH", "./logs/ai-news.log")

    def validate(self) -> None:
        missing = []
        if not self.api_url:
            missing.append("CASKBYCASK_API_URL")
        if not self.internal_key:
            missing.append("CASKBYCASK_INTERNAL_KEY")
        if not self.gemini_api_key:
            missing.append("GEMINI_API_KEY")
        if missing:
            raise ValueError("AI 소식 필수 환경변수 누락: " + ", ".join(missing))
