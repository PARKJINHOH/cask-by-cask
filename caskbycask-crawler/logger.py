"""중앙 로깅 설정. 회전 파일 핸들러 + 콘솔."""
from __future__ import annotations

import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path

_FMT = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"


def setup_logging(log_path: str, level: int = logging.INFO) -> logging.Logger:
    Path(log_path).parent.mkdir(parents=True, exist_ok=True)

    root = logging.getLogger("crawler")
    root.setLevel(level)
    root.handlers.clear()  # 재실행/재임포트 시 중복 핸들러 방지

    file_handler = RotatingFileHandler(
        log_path, maxBytes=5 * 1024 * 1024, backupCount=5, encoding="utf-8"
    )
    file_handler.setFormatter(logging.Formatter(_FMT))
    root.addHandler(file_handler)

    console = logging.StreamHandler(sys.stdout)
    console.setFormatter(logging.Formatter(_FMT))
    root.addHandler(console)

    # 외부 라이브러리 잡음 억제
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("google_genai").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)

    return root


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(f"crawler.{name}")
