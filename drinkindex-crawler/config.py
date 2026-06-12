"""환경설정 로딩. .env + targets.json 을 읽어 단일 settings 객체로 노출한다."""
from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

# 모듈 임포트 시점에 .env 로드 (스크립트와 같은 디렉토리 우선)
load_dotenv(Path(__file__).with_name(".env"))


def _bool(key: str, default: bool = False) -> bool:
    return os.getenv(key, str(default)).strip().lower() in ("1", "true", "yes", "y", "on")


def _csv(key: str, default: str = "") -> list[str]:
    raw = os.getenv(key, default)
    return [x.strip() for x in raw.split(",") if x.strip()]


@dataclass
class Settings:
    # OpenAI
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    openai_base_url: str = os.getenv("OPENAI_BASE_URL", "").strip()

    # 백엔드
    api_url: str = os.getenv("DRINKINDEX_API_URL", "").rstrip("/")
    internal_key: str = os.getenv("DRINKINDEX_INTERNAL_KEY", "")

    # 경로
    db_path: str = os.getenv("SQLITE_DB_PATH", "./seen_posts.db")
    image_temp_dir: str = os.getenv("IMAGE_TEMP_DIR", "./temp")
    log_path: str = os.getenv("LOG_PATH", "./logs/crawler.log")
    targets_path: str = os.getenv("TARGETS_PATH", "./targets.json")

    # 네이버 인증
    naver_nid_aut: str = os.getenv("NAVER_NID_AUT", "").strip()
    naver_nid_ses: str = os.getenv("NAVER_NID_SES", "").strip()
    # 디시 인증(선택)
    dcinside_cookie: str = os.getenv("DCINSIDE_COOKIE", "").strip()

    # 필터/튜닝
    deal_keywords: list[str] = field(default_factory=lambda: _csv("DEAL_KEYWORDS"))
    exclude_keywords: list[str] = field(default_factory=lambda: _csv("EXCLUDE_KEYWORDS"))
    min_confidence: float = float(os.getenv("MIN_CONFIDENCE", "0.55"))
    max_images_per_post: int = int(os.getenv("MAX_IMAGES_PER_POST", "3"))
    max_new_posts_per_run: int = int(os.getenv("MAX_NEW_POSTS_PER_RUN", "40"))
    request_delay_sec: float = float(os.getenv("REQUEST_DELAY_SEC", "1.2"))
    http_timeout_sec: int = int(os.getenv("HTTP_TIMEOUT_SEC", "15"))
    dry_run: bool = field(default_factory=lambda: _bool("DRY_RUN", False))

    # targets.json 내용
    dcinside_targets: list[dict] = field(default_factory=list)
    naver_cafe_targets: list[dict] = field(default_factory=list)

    @property
    def naver_cookie(self) -> str:
        parts = []
        if self.naver_nid_aut:
            parts.append(f"NID_AUT={self.naver_nid_aut}")
        if self.naver_nid_ses:
            parts.append(f"NID_SES={self.naver_nid_ses}")
        return "; ".join(parts)

    def load_targets(self) -> None:
        path = Path(self.targets_path)
        if not path.exists():
            return
        data = json.loads(path.read_text(encoding="utf-8"))
        self.dcinside_targets = [t for t in data.get("dcinside", []) if not str(t.get("board_id", "")).startswith("_")]
        self.naver_cafe_targets = data.get("naver_cafe", [])

    def validate(self) -> None:
        """필수 설정 누락 시 ValueError(메시지에 누락 키 전부 나열) — fail fast."""
        missing: list[str] = []

        # AI 분석은 어떤 모드에서도 필요
        if not self.openai_api_key:
            missing.append("OPENAI_API_KEY")

        # 백엔드 업로드 관련 값은 실제 업로드(=DRY_RUN 아님)일 때만 필수
        if not self.dry_run:
            if not self.api_url:
                missing.append("DRINKINDEX_API_URL")
            if not self.internal_key:
                missing.append("DRINKINDEX_INTERNAL_KEY")

        # 네이버 카페 타깃이 있는데 쿠키가 없으면 수집 불가
        if self.naver_cafe_targets and not self.naver_cookie:
            missing.append("NAVER_NID_AUT/NAVER_NID_SES (네이버 카페 타깃 존재)")

        if missing:
            raise ValueError("필수 환경설정 누락: " + ", ".join(missing) + " — .env 를 확인하라")


def load_settings() -> Settings:
    s = Settings()
    s.load_targets()
    s.validate()
    return s
