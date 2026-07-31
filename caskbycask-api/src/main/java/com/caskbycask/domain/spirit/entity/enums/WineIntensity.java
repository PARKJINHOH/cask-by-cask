package com.caskbycask.domain.spirit.entity.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 와인 산도·타닌 강도 (공통 척도) — 5단계.
 * {@code level} 이 곧 바의 채워진 칸 수다.
 */
@Getter
@RequiredArgsConstructor
public enum WineIntensity {
    LOW(1),
    LOW_MEDIUM(2),
    MEDIUM(3),
    MEDIUM_HIGH(4),
    HIGH(5);

    /** 1~5 단계 */
    private final int level;

    public static final int MAX_LEVEL = 5;
}
