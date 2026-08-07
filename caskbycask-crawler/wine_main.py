"""Wine ingestion worker.

Default FIXTURE mode never connects to Vivino. LIVE crawls public Vivino HTML only after the
backend's written-authorization gate is open. It does not use an API token or login session.
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

try:
    from dotenv import load_dotenv
except ModuleNotFoundError:  # environment-only unit tests can inject variables without reading .env
    def load_dotenv(*_args, **_kwargs):
        return False

from alerts.slack_notifier import SlackNotifier
from wine_ingest.client import WineIngestApi
from wine_ingest.providers import FixtureWineProvider, VivinoWebCrawlerProvider

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")


def required(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"missing environment variable: {name}")
    return value


def env_number(name: str, default: float) -> float:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        return float(raw)
    except ValueError as exc:
        raise RuntimeError(f"invalid numeric environment variable: {name}") from exc


def env_urls(name: str, default: str) -> list[str]:
    raw = os.getenv(name, default)
    return [value.strip() for value in raw.replace("\n", ",").split(",") if value.strip()]


def alert_failure(notifier: SlackNotifier, payload: dict, reason: str) -> None:
    name = payload.get("nameEn") or "와인명 미확인"
    link = payload.get("sourceUrl") or "링크 미확인"
    notifier.warning_once(
        f"wine:{name}:{reason}", "와인 수집 실패",
        f"와인명: {name}\n링크: {link}\n사유: {reason}",
    )


def capped(value, limit: int) -> str | None:
    """API DTO의 @Size 상한에 맞춘다. 빈 값은 None으로 보내 @NotBlank 위반을 피한다."""
    text = str(value).strip() if value not in (None, "") else ""
    return text[:limit] or None


def failure_payload(payload: dict, reason_code: str, reason: str, status: str = "FAILED") -> dict:
    label = "NV" if payload.get("vintageStatus") == "NON_VINTAGE" else payload.get("vintageYear")
    return {
        "provider": capped(payload.get("provider") or "VIVINO", 30),
        "externalWineId": capped(payload.get("externalWineId"), 100),
        "externalVintageId": capped(payload.get("externalVintageId"), 100),
        "sourceUrl": capped(payload.get("sourceUrl"), 1000),
        "wineNameEn": capped(payload.get("nameEn"), 200),
        "wineNameKo": capped(payload.get("nameKo"), 200),
        "vintageLabel": capped(label, 20),
        "status": status,
        # reasonCode/reasonMessage는 @NotBlank라 빈 문자열을 보내면 400으로 회차가 끊긴다.
        "reasonCode": capped(reason_code, 60) or "UNKNOWN_ERROR",
        "reasonMessage": capped(reason, 2000) or "원인 메시지가 비어 있습니다",
    }


def heartbeat(api: WineIngestApi, run_key: str) -> None:
    """수집이 길어져도 백엔드가 30분 무응답으로 회차를 실패 처리하지 않게 한다."""
    try:
        api.heartbeat(run_key)
    except Exception as exc:
        print(f"[wine] heartbeat 실패(수집은 계속): {exc}", file=sys.stderr)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--enqueue-scheduled", action="store_true", help="enqueue one authorized scheduled run first")
    args = parser.parse_args()

    api = WineIngestApi(required("CASKBYCASK_API_URL"), required("CASKBYCASK_INTERNAL_KEY"))
    notifier = SlackNotifier.from_env()
    try:
        config = api.config()
    except Exception as exc:
        config = {}
        print(f"[wine] 설정 조회 실패(대기 작업 확인은 계속 진행): {exc}", file=sys.stderr)
    notifier.enabled = notifier.enabled and bool(config.get("slackAlertEnabled", True))
    if (args.enqueue_scheduled
            and config.get("automationEnabled")
            and config.get("liveNetworkEnabled")
            and config.get("providerMode") == "LIVE"):
        try:
            api.enqueue_scheduled()
        except Exception as exc:
            print(f"[wine] 예약 작업 생성 건너뜀: {exc}", file=sys.stderr)
    run = api.claim()
    if run is None:
        print("[wine] queued run 없음")
        return 0

    run_key = run["runKey"]
    limit = min(int(run["requestedLimit"]), 10)
    provider = None
    try:
        if run["runType"] == "FIXTURE":
            provider = FixtureWineProvider(os.getenv(
                "WINE_FIXTURE_PATH", str(ROOT / "fixtures" / "wine_license_review.json"),
            ))
        else:
            if not config.get("liveNetworkEnabled") or config.get("providerMode") != "LIVE":
                raise RuntimeError("backend LIVE license gate is closed")
            base_url = os.getenv("VIVINO_BASE_URL", "https://www.vivino.com").strip()
            provider = VivinoWebCrawlerProvider(
                usage_grant_ref=str(config.get("usageGrantRef") or ""),
                base_url=base_url,
                start_urls=env_urls("VIVINO_START_URLS", f"{base_url.rstrip('/')}/explore"),
                request_delay_seconds=env_number("VIVINO_REQUEST_DELAY_SECONDS", 5.0),
                timeout_seconds=int(env_number("VIVINO_REQUEST_TIMEOUT_SECONDS", 20)),
                discovery_page_limit=int(env_number("VIVINO_DISCOVERY_PAGE_LIMIT", 3)),
                max_html_bytes=int(env_number("VIVINO_MAX_HTML_BYTES", 4 * 1024 * 1024)),
                user_agent=os.getenv("VIVINO_CRAWLER_USER_AGENT", "").strip() or None,
                on_progress=lambda: heartbeat(api, run_key),
            )

        items = provider.collect(limit)
        heartbeat(api, run_key)
        for payload in items:
            try:
                # 국문명은 관리자 검수 단계에서 입력한다. DB 필수 컬럼은 API가 영문명으로 안전하게 대체한다.
                payload = dict(payload)
                payload.pop("nameKo", None)
                payload.pop("koreanNameEvidenceUrls", None)
                provider_error = payload.pop("_providerError", None) or payload.pop("_contractError", None)
                provider_error_code = payload.pop("_providerErrorCode", "VIVINO_PAGE_PARSE_FAILED")
                if provider_error:
                    try:
                        api.failure(run_key, failure_payload(payload, provider_error_code, provider_error))
                    finally:
                        alert_failure(notifier, payload, provider_error)
                    continue
                result = api.import_wine(run_key, payload)
                print(f"[wine] {result['status']}: {payload.get('nameEn')} {payload.get('vintageYear') or 'NV'}")
                if result["status"] in ("FAILED", "NOT_FOUND_SKIPPED"):
                    alert_failure(notifier, payload, result.get("reasonMessage") or "등록하지 못함")
            except Exception as exc:  # one wine must not abort the remaining run
                reason = str(exc)
                try:
                    api.failure(run_key, failure_payload(payload, "IMPORT_FAILED", reason))
                finally:
                    alert_failure(notifier, payload, reason)
        for _ in range(max(0, limit - len(items))):
            missing = {"provider": "VIVINO", "nameEn": "candidate not returned"}
            reason = "제공자에서 수집 가능한 와인을 반환하지 않음"
            try:
                api.failure(run_key, failure_payload(missing, "CANDIDATE_NOT_FOUND", reason, "NOT_FOUND_SKIPPED"))
            except Exception as exc:  # 미수집 슬롯 기록 실패가 회차 마감을 막지 않는다
                print(f"[wine] 미수집 슬롯 기록 실패: {exc}", file=sys.stderr)
                break
            finally:
                alert_failure(notifier, missing, reason)
        api.finish(run_key)
        return 0
    except Exception as exc:
        try:
            api.finish(run_key, str(exc) or exc.__class__.__name__)
        except Exception:
            pass
        notifier.danger_once("wine-run-failed", "와인 크롤링 실행 실패", str(exc))
        print(f"[wine] failed: {exc}", file=sys.stderr)
        return 1
    finally:
        if provider is not None:
            try:
                provider.close()
            except Exception:
                pass


if __name__ == "__main__":
    raise SystemExit(main())
