package com.caskbycask.domain.spirit.entity.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 와인 바디(입안 무게감) — 5단계 척도.
 * {@code level} 이 곧 바의 채워진 칸 수다.
 */
@Getter
@RequiredArgsConstructor
public enum WineBody {
    LIGHT(1),
    LIGHT_MEDIUM(2),
    MEDIUM(3),
    MEDIUM_FULL(4),
    FULL(5);

    /** 1~5 단계 */
    private final int level;

    public static final int MAX_LEVEL = 5;
}
