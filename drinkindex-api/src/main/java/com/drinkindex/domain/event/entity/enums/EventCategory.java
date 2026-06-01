package com.drinkindex.domain.event.entity.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 이벤트 달력 카테고리.
 * 색상(legend)은 프론트엔드에서 카테고리별 고정 매핑한다.
 */
@Getter
@RequiredArgsConstructor
public enum EventCategory {

    RELEASE("출시"),
    FESTIVAL("페스티벌"),
    EVENT("이벤트"),
    ETC("기타");

    private final String displayName;
}
