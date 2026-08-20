package com.caskbycask.domain.ainews.entity.enums;

/**
 * 관리자가 직접 쓸 '쓸 거리'의 상태. AI 는 이 목록을 읽지도 쓰지도 않는다 —
 * 예전에는 자동화가 다음에 쓸 주제를 고르느라 READY/SCHEDULED/HOLD/BLOCKED/COMPLETED 다섯 가지가 필요했다.
 */
public enum AiNewsTopicStatus {
    PLANNED,
    DONE
}
