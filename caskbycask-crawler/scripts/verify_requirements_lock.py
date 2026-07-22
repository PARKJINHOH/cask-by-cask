"""requirements.txt와 배포용 hash lock의 직접 의존성 정합성을 검사한다."""
from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "requirements.txt"
LOCK = ROOT / "requirements.lock"
PIN_PATTERN = re.compile(r"^([A-Za-z0-9_.-]+)==([^\s\\]+)")


def normalize_name(value: str) -> str:
    return re.sub(r"[-_.]+", "-", value).lower()


def read_direct_pins(path: Path) -> dict[str, str]:
    pins: dict[str, str] = {}
    for number, raw_line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        match = PIN_PATTERN.fullmatch(line)
        if not match:
            raise ValueError(f"{path.name}:{number}: 직접 의존성은 name==version 형식이어야 합니다: {line}")
        pins[normalize_name(match.group(1))] = match.group(2)
    return pins


def read_hashed_lock(path: Path) -> dict[str, str]:
    pins: dict[str, str] = {}
    current_name: str | None = None
    current_has_hash = False

    def finish_block() -> None:
        if current_name and not current_has_hash:
            raise ValueError(f"{path.name}: {current_name} 항목에 --hash가 없습니다.")

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        stripped = raw_line.strip()
        match = PIN_PATTERN.match(stripped) if not raw_line[:1].isspace() else None
        if match:
            finish_block()
            current_name = normalize_name(match.group(1))
            pins[current_name] = match.group(2)
            current_has_hash = "--hash=" in stripped
        elif current_name and "--hash=" in stripped:
            current_has_hash = True
    finish_block()
    return pins


def main() -> int:
    missing = [path.name for path in (SOURCE, LOCK) if not path.is_file()]
    if missing:
        print(f"필수 의존성 파일이 없습니다: {', '.join(missing)}", file=sys.stderr)
        return 1
    try:
        direct = read_direct_pins(SOURCE)
        locked = read_hashed_lock(LOCK)
    except ValueError as error:
        print(error, file=sys.stderr)
        return 1

    mismatches = [
        f"{name}: requirements.txt={version}, requirements.lock={locked.get(name, '누락')}"
        for name, version in direct.items()
        if locked.get(name) != version
    ]
    if mismatches:
        print("직접 의존성과 lock 파일이 일치하지 않습니다:", file=sys.stderr)
        for mismatch in mismatches:
            print(f"- {mismatch}", file=sys.stderr)
        return 1
    print(f"requirements lock verified: {len(locked)} packages, {len(direct)} direct pins")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
