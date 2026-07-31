package com.caskbycask.domain.spirit.entity.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 와인 당도 — 5단계 척도.
 *
 * <p>국내 와인 유통(wine21 등)이 맛 지표를 1~5 단계 바로 표기하는 관행에 맞춘 척도다.
 * {@code level} 이 곧 바의 채워진 칸 수이므로 UI 는 별도 매핑 없이 그릴 수 있다.
 */
@Getter
@RequiredArgsConstructor
public enum WineSweetness {
    DRY(1),
    OFF_DRY(2),
    MEDIUM(3),
    MEDIUM_SWEET(4),
    SWEET(5);

    /** 1~5 단계 */
    private final int level;

    public static final int MAX_LEVEL = 5;
}
