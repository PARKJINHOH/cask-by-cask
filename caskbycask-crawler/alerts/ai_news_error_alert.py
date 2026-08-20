"""AI news run error details formatted for Slack."""
from __future__ import annotations

import re


def append_error_detail(details: list[dict[str, str]], stage: str,
                        error: Exception, **context: object) -> None:
    message = re.sub(r"\s+", " ", str(error)).strip() or repr(error)
    rendered_context = {
        key: re.sub(r"\s+", " ", str(value)).strip()[:300]
        for key, value in context.items()
        if value is not None and str(value).strip()
    }
    details.append({
        "stage": stage,
        "type": type(error).__name__,
        "message": message[:1000],
        "context": ", ".join(f"{key}={value}" for key, value in rendered_context.items()),
    })


def format_error_alert(run_id: int, run_key: str, stats: dict[str, int],
                       details: list[dict[str, str]]) -> str:
    lines = [
        f"*실행*: runId={run_id} · runKey={run_key}",
        (
            "*통계*: "
            f"후보 {stats['candidateCount']} · 저장 {stats['reviewCount']} · "
            f"중복 {stats['duplicateCount']} · 오류 {stats['errorCount']}"
        ),
        f"*오류 상세* ({len(details)}건)",
    ]
    for index, detail in enumerate(details, 1):
        context = f" ({detail['context']})" if detail["context"] else ""
        lines.append(
            f"{index}. `{detail['stage']}`{context}\n"
            f"   {detail['type']}: {detail['message']}"
        )
    return "\n".join(lines)[:2500]
