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
    tavily_api_key: str = os.getenv("TAVILY_API_KEY", "")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_base_url: str = os.getenv("OPENAI_BASE_URL", "").strip()
    classifier_model: str = os.getenv("AI_NEWS_CLASSIFIER_MODEL", "gpt-5.4-mini")
    writer_model: str = os.getenv("AI_NEWS_WRITER_MODEL", "gpt-5.5")
    image_model: str = os.getenv("AI_NEWS_IMAGE_MODEL", "gpt-image-2")
    max_candidates_per_run: int = int(os.getenv("AI_NEWS_MAX_CANDIDATES_PER_RUN", "3"))
    search_results_per_query: int = int(os.getenv("AI_NEWS_SEARCH_RESULTS_PER_QUERY", "10"))
    image_estimated_cost_usd: float = float(os.getenv("AI_NEWS_IMAGE_ESTIMATED_COST_USD", "0"))
    classifier_input_usd_per_million: float = float(os.getenv("AI_NEWS_CLASSIFIER_INPUT_USD_PER_MILLION", "0.75"))
    classifier_output_usd_per_million: float = float(os.getenv("AI_NEWS_CLASSIFIER_OUTPUT_USD_PER_MILLION", "4.50"))
    writer_input_usd_per_million: float = float(os.getenv("AI_NEWS_WRITER_INPUT_USD_PER_MILLION", "5.00"))
    writer_output_usd_per_million: float = float(os.getenv("AI_NEWS_WRITER_OUTPUT_USD_PER_MILLION", "30.00"))
    hard_monthly_cost_usd: float = float(os.getenv("AI_NEWS_OPENAI_HARD_MONTHLY_USD", "0"))
    hard_monthly_tokens: int = int(os.getenv("AI_NEWS_OPENAI_HARD_MONTHLY_TOKENS", "0"))
    hard_monthly_images: int = int(os.getenv("AI_NEWS_OPENAI_HARD_MONTHLY_IMAGES", "0"))
    http_timeout_sec: int = int(os.getenv("HTTP_TIMEOUT_SEC", "30"))
    news_log_path: str = os.getenv("AI_NEWS_LOG_PATH", "./logs/ai-news.log")
    dry_run_override: bool = _bool("AI_NEWS_FORCE_DRY_RUN", False)

    def validate(self) -> None:
        missing = []
        if not self.api_url:
            missing.append("CASKBYCASK_API_URL")
        if not self.internal_key:
            missing.append("CASKBYCASK_INTERNAL_KEY")
        if not self.tavily_api_key:
            missing.append("TAVILY_API_KEY")
        if not self.openai_api_key:
            missing.append("OPENAI_API_KEY")
        if missing:
            raise ValueError("AI 소식 필수 환경변수 누락: " + ", ".join(missing))
