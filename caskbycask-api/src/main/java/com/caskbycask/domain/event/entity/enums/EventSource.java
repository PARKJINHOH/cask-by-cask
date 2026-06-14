package com.caskbycask.domain.event.entity.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 이벤트 등록 출처.
 * ADMIN = 관리자가 직접 등록, USER = 사용자 제보(검토 대기 → 관리자 공개 전환 시 노출).
 */
@Getter
@RequiredArgsConstructor
public enum EventSource {

    ADMIN("관리자"),
    USER("사용자 제보");

    private final String displayName;
}
