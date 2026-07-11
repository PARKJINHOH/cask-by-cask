from __future__ import annotations

import json


def target_from_config(source: dict) -> dict:
    raw = str(source.get("crawlerTargetValue") or "").strip()
    key = str(source.get("crawlerTargetKey") or "").strip()
    name = str(source.get("sourceName") or source.get("domain") or "community")
    if raw.startswith("{"):
        target = json.loads(raw)
    elif str(source.get("crawlerType") or "").upper() == "DCINSIDE":
        target = {"board_id": raw if key == "board_id" else key or raw, "minor": True, "list_pages": 1}
    else:
        # 간단 입력은 club_id:menu_id 형식을 지원하고, 복잡한 설정은 JSON을 사용한다.
        club_id, _, menu_id = raw.partition(":")
        target = {"club_id": club_id or key, "menu_id": int(menu_id or 0), "list_pages": 1}
    target.setdefault("name", name)
    target.setdefault("list_pages", 1)
    return target
