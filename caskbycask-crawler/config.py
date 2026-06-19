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
    api_url: str = os.getenv("CASKBYCASK_API_URL", "").rstrip("/")
    internal_key: str = os.getenv("CASKBYCASK_INTERNAL_KEY", "")

    # 경로
    db_path: str = os.getenv("SQLITE_DB_PATH", "./seen_posts.db")
    image_temp_dir: str = os.getenv("IMAGE_TEMP_DIR", "./temp")
    log_path: str = os.getenv("LOG_PATH", "./logs/crawler.log")
    targets_path: str = os.getenv("TARGETS_PATH", "./targets.json")

    # Slack 알림(선택)
    slack_webhook_url: str = os.getenv("SLACK_WEBHOOK_URL", "").strip()
    slack_channel: str = os.getenv("SLACK_CHANNEL", "#server-prd").strip()
    slack_alerts_enabled: bool = field(default_factory=lambda: _bool("SLACK_ALERTS_ENABLED", True))
    slack_max_alerts_per_run: int = int(os.getenv("SLACK_MAX_ALERTS_PER_RUN", "10"))

    # 네이버 인증
    naver_nid_aut: str = os.getenv("NAVER_NID_AUT", "").strip()
    naver_nid_ses: str = os.getenv("NAVER_NID_SES", "").strip()
    # 디시 인증(선택)
    dcinside_cookie: str = os.getenv("DCINSIDE_COOKIE", "").strip()

    # 필터/튜닝
    deal_keywords: list[str] = field(default_factory=lambda: _csv("DEAL_KEYWORDS"))
    exclude_keywords: list[str] = field(default_factory=lambda: _csv("EXCLUDE_KEYWORDS"))
    # AI confidence_score(1~10)가 이 값 이상일 때만 업로드 채택
    min_confidence_score: int = int(os.getenv("MIN_CONFIDENCE_SCORE", "5"))
    max_images_per_post: int = int(os.getenv("MAX_IMAGES_PER_POST", "3"))
    max_new_posts_per_run: int = int(os.getenv("MAX_NEW_POSTS_PER_RUN", "40"))
    # 중복방지 DB 보존 기간(일) — 이보다 오래된 기록은 매 실행 시 정리
    seen_retention_days: int = int(os.getenv("SEEN_RETENTION_DAYS", "7"))
    # 분석/업로드 실패 시 같은 글을 OpenAI 에 다시 보내는 최대 횟수.
    # 이 횟수를 넘기면 ERROR 로 최종 마킹해 무한 재시도로 인한 비용 누수를 막는다.
    max_analysis_retries: int = int(os.getenv("MAX_ANALYSIS_RETRIES", "2"))
    # 무료 티어 분당 15회 제한을 넘지 않도록 AI API 호출 시작 간격을 둔다.
    openai_request_interval_sec: float = float(os.getenv("OPENAI_REQUEST_INTERVAL_SEC", "5"))
    # 1회 실행에서 AI 분석까지 진행할 최대 게시글 수. 남은 글은 pending_posts 에 남겨 다음 실행으로 이월.
    max_ai_analysis_per_run: int = int(os.getenv("MAX_AI_ANALYSIS_PER_RUN", "40"))
    # 같은 딜로 볼 최근 fingerprint 조회 범위와 로컬 유사도 기준.
    duplicate_lookback_hours: int = int(os.getenv("DUPLICATE_LOOKBACK_HOURS", "72"))
    duplicate_jaccard_threshold: float = float(os.getenv("DUPLICATE_JACCARD_THRESHOLD", "0.58"))
    duplicate_ngram_threshold: float = float(os.getenv("DUPLICATE_NGRAM_THRESHOLD", "0.62"))
    request_delay_sec: float = float(os.getenv("REQUEST_DELAY_SEC", "1.2"))
    http_timeout_sec: int = int(os.getenv("HTTP_TIMEOUT_SEC", "15"))
    dry_run: bool = field(default_factory=lambda: _bool("DRY_RUN", False))

    # targets.json 내용
    dcinside_targets: list[dict] = field(default_factory=list)
    naver_cafe_targets: list[dict] = field(default_factory=list)
    runtime_warnings: list[dict[str, str]] = field(default_factory=list)

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
        raw = path.read_text(encoding="utf-8")
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as e:
            line = ""
            lines = raw.splitlines()
            if 0 < e.lineno <= len(lines):
                line = lines[e.lineno - 1].strip()
            detail = f"{path}: line {e.lineno} column {e.colno}: {e.msg}"
            if line:
                detail += f" near `{line[:120]}`"
            raise ValueError(f"targets.json JSON parse failed: {detail}") from e
        self.dcinside_targets = [t for t in data.get("dcinside", []) if not str(t.get("board_id", "")).startswith("_")]
        self.naver_cafe_targets = data.get("naver_cafe", [])

    def load_dynamic_settings(self) -> None:
        """백엔드 내부 API를 호출하여 동적으로 쿠키 정보를 내려받아 덮어씁니다."""
        if not self.api_url or not self.internal_key:
            return  # API 정보나 보안키가 세팅되지 않았다면 로컬 .env 에만 의존
        
        import requests
        import sys
        
        url = f"{self.api_url}/api/internal/crawler-settings"
        headers = {
            "X-Internal-Key": self.internal_key,
            "Accept": "application/json"
        }
        try:
            resp = requests.get(url, headers=headers, timeout=self.http_timeout_sec)
            resp.raise_for_status()
            res_json = resp.json()
            if res_json.get("success") and res_json.get("data"):
                data = res_json["data"]
                # 백엔드에 쿠키가 있을 경우에만 동적으로 덮어씀
                if data.get("nidAut"):
                    self.naver_nid_aut = data["nidAut"].strip()
                if data.get("nidSes"):
                    self.naver_nid_ses = data["nidSes"].strip()
        except requests.HTTPError as e:
            status = e.response.status_code if e.response is not None else "?"
            summary = "크롤러 설정 API 호출 실패"
            hint = "백엔드 상태와 CASKBYCASK_API_URL 을 확인하세요."
            if status in (401, 403):
                summary = "크롤러 설정 API 인증 실패"
                hint = "CASKBYCASK_INTERNAL_KEY 가 백엔드 api.env 값과 일치하는지 확인하세요."
            self.runtime_warnings.append({
                "key": "crawler_settings_api",
                "summary": summary,
                "body": f"{url} 응답 status={status}. 로컬 .env 쿠키로 fallback 합니다. {hint}",
            })
            print(f"[config warning] 백엔드 설정 로드 실패 (로컬 세션으로 작동): {e}", file=sys.stderr)
        except Exception as e:
            # 백엔드 API 장애 시 즉시 중단하지 않고, 로컬 .env의 백업 쿠키로 동작하도록 Fallback 지원
            self.runtime_warnings.append({
                "key": "crawler_settings_api",
                "summary": "크롤러 설정 API 호출 실패",
                "body": f"{url} 호출 실패: {e}. 로컬 .env 쿠키로 fallback 합니다.",
            })
            print(f"[config warning] 백엔드 설정 로드 실패 (로컬 세션으로 작동): {e}", file=sys.stderr)

    def validate(self) -> None:
        """필수 설정 누락 시 ValueError(메시지에 누락 키 전부 나열) — fail fast."""
        missing: list[str] = []

        # AI 분석은 어떤 모드에서도 필요
        if not self.openai_api_key:
            missing.append("OPENAI_API_KEY")

        # 백엔드 업로드 관련 값은 실제 업로드(=DRY_RUN 아님)일 때만 필수
        if not self.dry_run:
            if not self.api_url:
                missing.append("CASKBYCASK_API_URL")
            if not self.internal_key:
                missing.append("CASKBYCASK_INTERNAL_KEY")

        # 네이버 카페 타깃이 있는데 쿠키가 없으면 수집 불가
        if self.naver_cafe_targets and not (self.naver_nid_aut and self.naver_nid_ses):
            missing.append("NAVER_NID_AUT/NAVER_NID_SES (네이버 카페 타깃 존재)")

        if missing:
            raise ValueError("필수 환경설정 누락: " + ", ".join(missing) + " — .env 를 확인하라")


def load_settings() -> Settings:
    s = Settings()
    s.load_targets()
    s.load_dynamic_settings()
    s.validate()
    return s

